"use client";

/**
 * Trocar senha — GO-03F: Design System (AuthShell + Field/Input/Button).
 * Fluxo de API /api/trocar-senha inalterado.
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AuthShell,
  Button,
  Callout,
  Field,
  Icon,
  Input,
  LinkButton,
  LoadingBlock,
} from "@/components/design-system";

function TrocarSenhaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const token = searchParams.get("token") || "";

  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!email || !token) {
      setErro("Dados inválidos. Por favor, solicite a recuperação novamente.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não conferem.");
      return;
    }

    setCarregando(true);

    try {
      const res = await fetch("/api/trocar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, novaSenha: senha }),
      });

      const data = await res.json();
      setCarregando(false);

      if (!res.ok) {
        setErro(data.error || "Erro ao trocar senha. Tente novamente.");
        return;
      }

      setSucesso(true);
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setCarregando(false);
      setErro("Erro ao trocar senha. Tente novamente.");
    }
  }

  if (sucesso) {
    return (
      <AuthShell title="Senha alterada com sucesso!" backgroundImage="/login-bg.png.png">
        <div className="text-center space-y-4">
          <span className="inline-flex w-14 h-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <Icon name="check-circle" className="w-7 h-7" />
          </span>
          <p className="text-sm text-zinc-400">
            Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login
            em instantes.
          </p>
          <LinkButton href="/login" variant="primary" size="md">
            Ir para login
          </LinkButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Criar nova senha"
      subtitle="Digite sua nova senha abaixo. Certifique-se de escolher uma senha segura."
      backgroundImage="/login-bg.png.png"
      footer={
        <p className="text-center text-xs">
          <Link href="/login" className="text-zinc-400 hover:text-red-400 underline underline-offset-2">
            Voltar para login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nova senha">
          <div className="relative">
            <Input
              type={mostrarSenha ? "text" : "password"}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              autoComplete="new-password"
              className="pr-16"
            />
            <Button
              type="button"
              onClick={() => setMostrarSenha(!mostrarSenha)}
              variant="ghost"
              size="xs"
              className="absolute inset-y-1 right-1"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? "Ocultar" : "Ver"}
            </Button>
          </div>
        </Field>

        <Field label="Confirmar nova senha">
          <div className="relative">
            <Input
              type={mostrarConfirmarSenha ? "text" : "password"}
              required
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              minLength={6}
              autoComplete="new-password"
              className="pr-16"
            />
            <Button
              type="button"
              onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              variant="ghost"
              size="xs"
              className="absolute inset-y-1 right-1"
              aria-label={mostrarConfirmarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarConfirmarSenha ? "Ocultar" : "Ver"}
            </Button>
          </div>
        </Field>

        {erro && (
          <Callout intent="error" title="Não foi possível continuar">
            {erro}
          </Callout>
        )}

        <Button type="submit" variant="primary" fullWidth size="md" loading={carregando}>
          {carregando ? "Alterando senha…" : "Alterar senha"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function TrocarSenhaPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Criar nova senha" backgroundImage="/login-bg.png.png">
          <LoadingBlock label="Carregando formulário…" />
        </AuthShell>
      }
    >
      <TrocarSenhaContent />
    </Suspense>
  );
}
