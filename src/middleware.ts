import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isGoLiveBlockedPage, isGoLiveMaintenanceMode } from "./app/lib/go-live-maintenance";
import { isDevToolPagePath } from "./app/lib/dev-tool-paths";

/**
 * GO-H11A — Middleware ativo em `src/middleware.ts` (Next.js não carrega `src/app/middleware.ts`).
 * Edge-safe: sem Prisma; usa /api/me e /api/site-status.
 */
async function sessionIsAdmin(request: NextRequest): Promise<boolean> {
  try {
    const cookie = request.headers.get("cookie") || "";
    if (!cookie.includes("session_id=")) return false;
    const res = await fetch(new URL("/api/me", request.url), {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { user?: { role?: string } | null };
    return data.user?.role === "ADMIN";
  } catch {
    return false;
  }
}

async function readMaintenanceMode(request: NextRequest): Promise<boolean> {
  try {
    const res = await fetch(new URL("/api/site-status", request.url), {
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { maintenanceMode?: boolean };
    return Boolean(data.maintenanceMode);
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icon") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  try {
    const sessionCookie = request.cookies.get("session_id");
    const isAdmin = sessionCookie ? await sessionIsAdmin(request) : false;
    const maintenanceMode = await readMaintenanceMode(request);

    if (isDevToolPagePath(pathname) && !isAdmin) {
      return new NextResponse(null, { status: 404 });
    }

    if (isGoLiveMaintenanceMode()) {
      if (!isAdmin && isGoLiveBlockedPage(pathname)) {
        const url = new URL("/manutencao", request.url);
        url.searchParams.set("mode", "golive");
        return NextResponse.redirect(url);
      }
    }

    if (maintenanceMode) {
      if (isAdmin) {
        return NextResponse.next();
      }
      if (pathname !== "/manutencao") {
        return NextResponse.redirect(new URL("/manutencao", request.url));
      }
    } else if (!isGoLiveMaintenanceMode() || isAdmin) {
      if (pathname === "/manutencao" && !request.nextUrl.searchParams.get("mode")) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  } catch (err) {
    console.error("Erro no middleware de manutenção:", err);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
