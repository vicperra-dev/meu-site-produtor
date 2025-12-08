"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  nome: string;
  email: string;
  foto?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  registro: (nome: string, email: string, senha: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Carregar usuário salvo
  useEffect(() => {
    const saved = localStorage.getItem("thouse_user");
    if (saved) setUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  // LOGIN
  async function login(email: string, senha: string) {
    const r = await fetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });

    if (!r.ok) return false;

    const { user } = await r.json();
    setUser(user);
    localStorage.setItem("thouse_user", JSON.stringify(user));
    return true;
  }

  // REGISTRO
  async function registro(nome: string, email: string, senha: string) {
    const r = await fetch("/api/registro", {
      method: "POST",
      body: JSON.stringify({ nome, email, senha }),
    });

    if (!r.ok) return false;

    const { user } = await r.json();
    setUser(user);
    localStorage.setItem("thouse_user", JSON.stringify(user));
    return true;
  }

  // LOGOUT
  function logout() {
    setUser(null);
    localStorage.removeItem("thouse_user");
  }

  // UPDATE PROFILE
  function updateUser(data: Partial<User>) {
    setUser((prev) => {
      const updated = prev ? { ...prev, ...data } : null;
      if (updated) {
        localStorage.setItem("thouse_user", JSON.stringify(updated));
      }
      return updated;
    });
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, registro, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
