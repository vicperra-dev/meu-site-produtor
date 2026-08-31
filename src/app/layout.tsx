import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "./context/AuthContext";
import ConditionalHeader from "./components/ConditionalHeader";
import ChatNotificationWrapper from "./components/ChatNotificationWrapper";
import CartButton from "./components/CartButton";
import PageViewTracker from "./components/PageViewTracker";
import { DomainSyncProvider } from "./lib/synchronization/DomainSyncProvider";
import { ToastProvider, ConfirmProvider } from "@/components/design-system";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "THouse Rec",
  description: "Produção musical • Estúdio • Mix • Master • Beats",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml", sizes: "32x32" },
    ],
    apple: "/apple-icon.svg",
    shortcut: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-zinc-100`}
        style={{ backgroundColor: "#0a0a0a" }}
      >
        <AuthProvider>
          <DomainSyncProvider>
            <ToastProvider>
              <ConfirmProvider>
                <ConditionalHeader />
                <PageViewTracker />
                <CartButton />
                <ChatNotificationWrapper />
                {children}
              </ConfirmProvider>
            </ToastProvider>
          </DomainSyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
