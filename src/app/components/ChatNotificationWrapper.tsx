"use client";

import { useAuth } from "../context/AuthContext";
import ChatNotification from "./ChatNotification";

export default function ChatNotificationWrapper() {
  const { user } = useAuth();
  return <ChatNotification userId={user?.id || null} />;
}
