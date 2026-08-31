"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";

export function useUnreadPlanCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const timestamp = new Date().getTime();
      const res = await fetch(`/api/meus-dados?t=${timestamp}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        const planos = data.planos || [];
        const unread = planos.filter((p: any) => {
          const isActive = p.status === "active" && p.ativo === true;
          return isActive && !p.readAt;
        });
        setUnreadCount(unread.length);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Erro ao buscar contagem de planos não lidos:", error);
      setUnreadCount(0);
    }
  }, [user]);

  useDomainRefresh(["minha-conta", "planos"], () => fetchUnreadCount());

  useEffect(() => {
    void fetchUnreadCount();
    const handlePlanUpdated = () => {
      void fetchUnreadCount();
    };
    window.addEventListener("plan-updated", handlePlanUpdated);
    return () => {
      window.removeEventListener("plan-updated", handlePlanUpdated);
    };
  }, [fetchUnreadCount]);

  return unreadCount;
}
