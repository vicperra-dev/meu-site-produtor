"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export function useUnreadChatCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    async function fetchUnreadCount() {
      try {
        const res = await fetch("/api/chat/sessions", {
          credentials: "include",
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          const sessions = data.sessions || [];
          console.log(`[useUnreadChatCount] 📥 Recebidas ${sessions.length} sessão(ões)`);
          
          // Filtrar sessões com unreadCount > 0
          const unread = sessions.filter((s: any) => 
            typeof s.unreadCount === 'number' && s.unreadCount > 0
          );
          
          if (unread.length > 0) {
            console.log(`[useUnreadChatCount] 🔔 ${unread.length} sessão(ões) com mensagens não lidas:`, 
              unread.map((s: any) => ({ id: s.id.substring(0, 8), unreadCount: s.unreadCount }))
            );
          }
          
          // Somar todos os unreadCount
          const total = unread.reduce((sum: number, s: any) => sum + (s.unreadCount || 0), 0);
          console.log(`[useUnreadChatCount] 📊 Total calculado: ${total} mensagens não lidas`);
          
          if (total !== unreadCount) {
            console.log(`[useUnreadChatCount] 🔄 Atualizando de ${unreadCount} para ${total}`);
          }
          
          setUnreadCount(total);
        } else {
          const errorText = await res.text();
          console.error(`[useUnreadChatCount] ❌ Erro ${res.status}:`, errorText);
          setUnreadCount(0);
        }
      } catch (error) {
        console.error("Erro ao buscar contagem de mensagens não lidas:", error);
        setUnreadCount(0);
      }
    }

    // Buscar imediatamente
    fetchUnreadCount();

    // Atualizar a cada 1 minuto
    const interval = setInterval(fetchUnreadCount, 60000);

    // Ouvir evento de atualização do chat
    const handleChatUpdate = () => {
      setTimeout(fetchUnreadCount, 500);
    };
    window.addEventListener('chat-updated', handleChatUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('chat-updated', handleChatUpdate);
    };
  }, [user]);

  return unreadCount;
}
