"use client";

import { createContext, useContext, useEffect, useState } from "react";

/* =========================================================
   TIPOS
========================================================= */

export interface User {
  id: string;

  // Nome real (usado em pagamentos, contratos, etc)
  nome?: string;

  // Nome artístico (exibição pública)
  nomeArtistico: string;

  email: string;
  role: "USER" | "ADMIN";
}


export interface RegistroPayload {
  nomeCompleto: string;
  nomeArtistico: string;
  nomeSocial?: string | null;
  email: string;
  senha: string;
  telefone: string;
  cpf: string;
  pais: string;
  estado: string;
  cidade: string;
  bairro: string;
  dataNascimento: string;
  sexo?: string | null;
  genero?: string | null;
  generoOutro?: string | null;
  estilosMusicais?: string | null;
  nacionalidade?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<boolean>;
  registro: (payload: RegistroPayload) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

/* =========================================================
   CONTEXT
========================================================= */

const AuthContext = createContext<AuthContextType | null>(null);

/* =========================================================
   PROVIDER
========================================================= */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /* --------------------------------------
     🔁 REFRESH REAL (COOKIE → BACKEND)
  -------------------------------------- */
  async function refresh() {
    try {
      const r = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
      });

      const data = await r.json();

      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("[Auth] Falha ao validar sessão:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  /* --------------------------------------
     🧠 HIDRATAÇÃO INICIAL
  -------------------------------------- */
  useEffect(() => {
    refresh();
  }, []);

  /* --------------------------------------
     🔐 LOGIN
  -------------------------------------- */
  async function login(email: string, senha: string): Promise<boolean> {
    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, senha }),
      });

      if (!r.ok) return false;

      await refresh();
      return true;
    } catch (err) {
      console.error("Erro no login:", err);
      return false;
    }
  }

  /* --------------------------------------
     📝 REGISTRO
  -------------------------------------- */
  async function registro(payload: RegistroPayload): Promise<{ ok: boolean; error?: string }> {
    try {
      const r = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        return { ok: false, error: data.error || "Não foi possível registrar." };
      }

      await refresh();
      return { ok: true };
    } catch (err) {
      console.error("Erro no registro:", err);
      return { ok: false, error: "Erro de conexão ao registrar." };
    }
  }

  /* --------------------------------------
     🚪 LOGOUT
  -------------------------------------- */
  async function logout() {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Erro no logout:", err);
    } finally {
      setUser(null);
      // Forçar refresh da página para limpar qualquer estado
      window.location.href = "/";
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registro,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
}
