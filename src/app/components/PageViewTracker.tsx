"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { shouldSkipTrackerPath } from "@/app/lib/analytics-pageview";
import { useAuth } from "@/app/context/AuthContext";

/**
 * Pageviews do App Router. /admin e ADMIN autenticado não disparam POST;
 * o servidor recusa ADMIN mesmo se o cliente enviar.
 */
export default function PageViewTracker() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const lastKeyRef = useRef<string>("");
  const lastAtRef = useRef<number>(0);

  useEffect(() => {
    if (loading) return;
    if (user?.role === "ADMIN") return;
    if (shouldSkipTrackerPath(pathname)) return;

    const now = Date.now();
    const key = pathname;
    if (key === lastKeyRef.current && now - lastAtRef.current < 1600) {
      return;
    }
    lastKeyRef.current = key || "";
    lastAtRef.current = now;

    void fetch("/api/analytics/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({ path: pathname, source: "WEB" }),
    }).catch(() => {});
  }, [pathname, user?.role, loading]);

  return null;
}
