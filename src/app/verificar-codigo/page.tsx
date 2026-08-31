"use client";

/**
 * Verificar código — GO-03F: Design System (AuthShell + Field/Input/Button).
 * Fluxo de API /api/verificar-codigo inalterado.
 */

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AuthShell,
  Button,
  Callout,
  Field,
  Input,
  LoadingBlock,
} from "@/components/design-system";

function VerificarCodigoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    if (!email) {
      setErro("Email não encontrado. Por favor, solicite a recuperação novamente.");
      setCarregando(false);
      return;
    }

    if (codigo.length !== 6) {
      setErro("O código deve ter 6 dígitos.");
      setCarregando(false);
      return;
    }

    try {
      const res = await fetch("/api/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codigo }),
      });

      const data = await res.json();
      setCarregando(false);

      if (!res.ok) {
        setErro(data.error || "Código inválido ou expirado.");
        return;
      }

      // Redirecionar para página de troca de senha
      router.push(`/trocar-senha?email=${encodeURIComponent(email)}&token=${data.token}`);
    } catch {
      setCarregando(false);
      setErro("Erro ao verificar código. Tente novamente.");
    }
  }

  return (
    <AuthShell
      title="Verificação de código"
      subtitle={
        <>
          Enviamos um código de verificação para <strong>{email}</strong>. Verifique sua caixa
          de entrada e digite o código abaixo.
        </>
      }
      backgroundImage="/login-bg.png.png"
      footer={
        <div className="text-center space-y-2">
          <Link
            href="/esqueci-senha"
            className="block text-xs text-zinc-400 hover:text-red-400 underline underline-offset-2"
          >
            Solicitar novo código
          </Link>
          <Link
            href="/login"
            className="block text-xs text-zinc-400 hover:text-red-400 underline underline-offset-2"
          >
            Voltar para login
          </Link>
        </div>
      }
    >
      <Callout intent="warning" title="Instruções" className="mb-4">
        <ol className="ml-4 list-decimal space-y-1">
          <li>Acesse sua caixa de entrada do email <strong>{email}</strong></li>
          <li>Procure pelo email da THouse Rec com o assunto &quot;Código de Recuperação de Senha&quot;</li>
          <li>Copie o código de 6 dígitos que está no email</li>
          <li>Cole o código no campo abaixo</li>
          <li>Clique em &quot;Verificar código&quot;</li>
        </ol>
        <p className="mt-2">⚠️ O código expira em 15 minutos.</p>
      </Callout>

      <form onSubmit={handleSubmit} className="space-y-3">
        <Field
          label="Código de verificação"
          hint="Digite o código de 6 dígitos enviado por email"
        >
          <Input
            type="text"
            required
            value={codigo}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCodigo(value);
            }}
            className="text-center text-2xl font-mono tracking-widest"
            placeholder="000000"
            maxLength={6}
          />
        </Field>

        {erro && (
          <Callout intent="error" title="Não foi possível continuar">
            {erro}
          </Callout>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="md"
          loading={carregando}
          disabled={codigo.length !== 6}
        >
          {carregando ? "Verificando…" : "Verificar código"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function VerificarCodigoPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Verificação de código" backgroundImage="/login-bg.png.png">
          <LoadingBlock label="Carregando formulário…" />
        </AuthShell>
      }
    >
      <VerificarCodigoContent />
    </Suspense>
  );
}
