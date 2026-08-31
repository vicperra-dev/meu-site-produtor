"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface NotificationData {
  type: "chat" | "faq";
  count: number;
  message: string;
  link: string;
  icon: string;
}

interface ChatNotificationProps {
  userId: string | null;
}

export default function ChatNotification({ userId }: ChatNotificationProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [currentNotification, setCurrentNotification] = useState<NotificationData | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!userId) return;

    let previousChatCount = 0;
    let previousFaqCount = 0;
    let isFirstCheck = true;

    // Verificar notificações ao montar o componente (após login) e periodicamente
    async function checkNotifications() {
      try {
        // Verificar chat
        const chatRes = await fetch("/api/chat/sessions", {
          credentials: "include",
        });

        let chatCount = 0;
        if (chatRes.ok) {
          const chatData = await chatRes.json();
          const sessions = chatData.sessions || [];
          const unread = sessions.filter((s: any) => s.unreadCount && s.unreadCount > 0);
          chatCount = unread.reduce((sum: number, s: any) => sum + (s.unreadCount || 0), 0);
        }

        // Verificar FAQ
        const faqRes = await fetch("/api/meus-dados", {
          credentials: "include",
        });

        let faqCount = 0;
        if (faqRes.ok) {
          const faqData = await faqRes.json();
          const perguntas = faqData.faqQuestions || [];
          faqCount = perguntas.filter((p: any) => p.status === "respondida" && !p.readAt).length;
        }

        // Só mostrar notificação se houver novas mensagens (aumento no count) e não for a primeira verificação
        const newChatCount = chatCount - previousChatCount;
        const newFaqCount = faqCount - previousFaqCount;

        if (!isFirstCheck && (newChatCount > 0 || newFaqCount > 0)) {
          const newNotifications: NotificationData[] = [];

          if (newChatCount > 0) {
            newNotifications.push({
              type: "chat",
              count: chatCount,
              message: `Você tem ${newChatCount} nova${newChatCount > 1 ? "s" : ""} mensagem${newChatCount > 1 ? "s" : ""} não lida${newChatCount > 1 ? "s" : ""} no chat`,
              link: "/chat",
              icon: "💬",
            });
          }

          if (newFaqCount > 0) {
            newNotifications.push({
              type: "faq",
              count: faqCount,
              message: `Você tem ${newFaqCount} pergunta${newFaqCount > 1 ? "s" : ""} respondida${newFaqCount > 1 ? "s" : ""} no FAQ`,
              link: "/minha-conta",
              icon: "❓",
            });
          }

          if (newNotifications.length > 0) {
            setNotifications((prev) => [...prev, ...newNotifications]);
            setCurrentNotification((current) => current || newNotifications[0]);
          }
        }

        // Atualizar contadores anteriores
        previousChatCount = chatCount;
        previousFaqCount = faqCount;
        isFirstCheck = false;
      } catch (error) {
        console.error("Erro ao verificar notificações:", error);
      }
    }

    // Verificar imediatamente ao montar (sem mostrar notificação)
    checkNotifications();

    // Verificar periodicamente a cada 1 minuto (mesma frequência do chat)
    const interval = setInterval(() => {
      checkNotifications();
    }, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, [userId]);

  // Gerenciar fila de notificações
  useEffect(() => {
    if (notifications.length === 0) return;

    const timer = setTimeout(() => {
      if (notifications.length > 1) {
        // Mostrar próxima notificação
        setNotifications((prev) => prev.slice(1));
        setCurrentNotification(notifications[1]);
      } else {
        // Fechar última notificação
        setCurrentNotification(null);
        setNotifications([]);
      }
    }, 10000); // 10 segundos por notificação

    return () => clearTimeout(timer);
  }, [notifications]);

  // Atualizar notificação atual quando a fila mudar
  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      setCurrentNotification(notifications[0]);
    }
  }, [notifications, currentNotification]);

  if (!currentNotification) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-red-600/90 backdrop-blur-sm border-2 border-red-700 rounded-lg shadow-xl p-4 max-w-sm" style={{ backgroundColor: "rgba(220, 38, 38, 0.9)" }}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-red-700 flex items-center justify-center border-2 border-red-800">
              <span className="text-black text-lg font-bold">{currentNotification.icon}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-black mb-1">
              {currentNotification.type === "chat" ? "Nova resposta no chat!" : "Pergunta respondida!"}
            </h3>
            <p className="text-xs text-black/90 mb-3 font-semibold">
              {currentNotification.message}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  router.push(currentNotification.link);
                  setCurrentNotification(null);
                  setNotifications([]);
                }}
                className="flex-1 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-900 transition-colors"
              >
                {currentNotification.type === "chat" ? "Ver Chat" : "Ver Minha Conta"}
              </button>
              <button
                onClick={() => {
                  if (notifications.length > 1) {
                    setNotifications((prev) => prev.slice(1));
                    setCurrentNotification(notifications[1]);
                  } else {
                    setCurrentNotification(null);
                    setNotifications([]);
                  }
                }}
                className="px-3 py-1.5 text-xs text-black/80 hover:text-black font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
