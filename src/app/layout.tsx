import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "./context/AuthContext"; // <--- IMPORTANTE

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* ENVOLVE TODO O APP COM AUTENTICAÇÃO GLOBAL */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
