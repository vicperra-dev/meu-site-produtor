"use client";

/**
 * Login — GO-03E: Design System (AuthShell + Field/Input/Button).
 * Lógica de autenticação inalterada (useAuth.login).
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { resolvePostLoginRedirect } from "@/app/lib/safe-redirect";
import {
  AuthShell,
  Button,
  Callout,
  Field,
  Input,
  LinkButton,
  LoadingBlock,
  COPY,
} from "@/components/design-system";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const ok = await login(email, senha);
    setCarregando(false);

    if (!ok) {
      setErro("Email ou senha inválidos.");
      return;
    }

    // GO-04A.3 RC-04: apenas paths internos seguros
    const redirectTo = resolvePostLoginRedirect(searchParams);
    router.push(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Email">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
        />
      </Field>

      <Field label="Senha">
        <div className="relative">
          <Input
            type={mostrarSenha ? "text" : "password"}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setMostrarSenha(!mostrarSenha)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
          >
            <span className="text-xs font-medium">{mostrarSenha ? "Ocultar" : "Mostrar"}</span>
          </button>
        </div>
        <div className="flex justify-end mt-1.5">
          <Link
            href="/esqueci-senha"
            className="text-xs text-zinc-400 hover:text-red-400 underline underline-offset-2"
          >
            Esqueci a senha
          </Link>
        </div>
      </Field>

      {erro && (
        <Callout intent="error" title="Não foi possível entrar">
          {erro}
        </Callout>
      )}

      <Button type="submit" variant="primary" fullWidth size="md" loading={carregando}>
        {carregando ? "Entrando…" : COPY.actions.signIn}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Entrar na THouse Rec"
      subtitle="Acesse sua conta para acompanhar agendamentos, planos e serviços."
      backgroundImage="/login-bg.png.png"
      footer={
        <div className="text-center space-y-3">
          <p className="text-sm text-zinc-400">Não possui uma conta?</p>
          <LinkButton href="/registro" variant="primary" size="md">
            {COPY.actions.createAccount}
          </LinkButton>
        </div>
      }
    >
      <Suspense fallback={<LoadingBlock label="Carregando formulário…" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
