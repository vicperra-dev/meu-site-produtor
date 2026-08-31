import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import {
  VISITOR_COOKIE,
  VISIT_SESSION_COOKIE,
  VISITOR_MAX_AGE_SEC,
  VISIT_SESSION_MAX_AGE_SEC,
  isValidVisitorUuid,
  normalizeAnalyticsSource,
  shouldRecordPageView,
} from "@/app/lib/analytics-pageview";

function cookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const payload = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const sessionUser = await getSessionUser();
  const decision = shouldRecordPageView({
    path: payload.path,
    userRole: sessionUser?.role,
  });
  if (!decision.record) {
    return new NextResponse(null, { status: 204 });
  }

  const path = decision.path;
  const source = normalizeAnalyticsSource(payload.source);
  const userId = sessionUser?.id ?? null;

  const jar = await cookies();
  let visitorId = jar.get(VISITOR_COOKIE)?.value || "";
  if (!isValidVisitorUuid(visitorId)) {
    visitorId = crypto.randomUUID();
  }
  let visitSessionId = jar.get(VISIT_SESSION_COOKIE)?.value || "";
  if (!isValidVisitorUuid(visitSessionId)) {
    visitSessionId = crypto.randomUUID();
  }

  const since = new Date(Date.now() - 2000);
  const dup = await prisma.pageView.findFirst({
    where: {
      visitorId,
      path,
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (!dup) {
    await prisma.pageView.create({
      data: {
        visitorId,
        visitSessionId,
        userId,
        path,
        source,
      },
    });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(VISITOR_COOKIE, visitorId, cookieOpts(VISITOR_MAX_AGE_SEC));
  res.cookies.set(VISIT_SESSION_COOKIE, visitSessionId, cookieOpts(VISIT_SESSION_MAX_AGE_SEC));
  return res;
}
