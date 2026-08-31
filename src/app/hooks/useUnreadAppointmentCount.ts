"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useDomainRefresh } from "@/app/hooks/useDomainRefresh";

export function useUnreadAppointmentCount() {
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
        const agendamentos = data.agendamentos || [];
        const unread = agendamentos.filter((a: any) => {
          const isConfirmed =
            (a.status === "aceito" || a.status === "confirmado") &&
            a.pagamento?.status === "approved";
          return isConfirmed && !a.readAt;
        });
        setUnreadCount(unread.length);
      } else {
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Erro ao buscar contagem de agendamentos não lidos:", error);
      setUnreadCount(0);
    }
  }, [user]);

  useDomainRefresh("minha-conta", () => fetchUnreadCount());

  useEffect(() => {
    void fetchUnreadCount();
    const handleAppointmentUpdated = () => {
      void fetchUnreadCount();
    };
    window.addEventListener("appointment-updated", handleAppointmentUpdated);
    return () => {
      window.removeEventListener("appointment-updated", handleAppointmentUpdated);
    };
  }, [fetchUnreadCount]);

  return unreadCount;
}
