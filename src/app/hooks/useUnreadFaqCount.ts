"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function useUnreadFaqCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    async function fetchUnreadCount() {
      try {
        // Adicionar timestamp para evitar cache
        const timestamp = new Date().getTime();
        const res = await fetch(`/api/meus-dados?t=${timestamp}`, {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          const perguntas = data.faqQuestions || [];
          // Contar perguntas respondidas que não foram lidas (readAt é null)
          const unread = perguntas.filter((p: any) => 
            p.status === "respondida" && !p.readAt
          );
          const total = unread.length;
          console.log(`[useUnreadFaqCount] 📊 Total de perguntas FAQ não lidas: ${total}`);
          setUnreadCount(total);
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Erro ao buscar contagem de perguntas FAQ não lidas:", error);
        setUnreadCount(0);
      }
    }

    // Buscar imediatamente
    fetchUnreadCount();

    // Escutar evento de atualização (disparado quando perguntas são marcadas como lidas)
    const handleFaqUpdated = () => {
      console.log("[useUnreadFaqCount] 🔔 Evento faq-updated recebido, atualizando contagem...");
      fetchUnreadCount();
    };
    
    window.addEventListener("faq-updated", handleFaqUpdated);

    // Atualizar a cada 1 minuto
    const interval = setInterval(fetchUnreadCount, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("faq-updated", handleFaqUpdated);
    };
  }, [user]);

  return unreadCount;
}
