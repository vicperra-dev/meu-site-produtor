"use client";

/**
 * Esqueci senha — fluxo seguro: email → código → verificação → troca.
 * GO-04A.1: removido modo admin / reset direto apenas com email.
 * GO-04A.3 RC-06: UI não distingue e-mail existente vs inexistente.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AuthShell,
  Button,
  Callout,
  Field,
  Input,
  COPY,
} from "@/components/design-system";

const GENERIC_OK =
  "Se existir uma conta vinculada a este endereço, enviaremos as instruções. Verifique sua caixa de entrada e spam.";

export default function EsqueciSenhaPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setCarregando(true);

    try {
      const res = await fetch("/api/esqueci-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      setCarregando(false);

      if (!res.ok) {
        if (res.status === 400) {
          setErro(
            typeof data.error === "string" ? data.error : "Dados inválidos"
          );
          return;
        }
        // 503/500: mensagem neutra (não revelar existência)
        setErro(
          typeof data.error === "string"
            ? data.error
            : "Não foi possível processar a solicitação. Tente novamente em instantes."
        );
        return;
      }

      setMensagem(GENERIC_OK);
      router.push(`/verificar-codigo?email=${encodeURIComponent(email)}`);
    } catch {
      setCarregando(false);
      setErro("Não foi possível processar a solicitação. Tente novamente em instantes.");
    }
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Digite seu email para receber um código de verificação."
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

        {erro && (
          <Callout intent="error" title="Não foi possível continuar">
            <span className="whitespace-pre-wrap">{erro}</span>
          </Callout>
        )}

        {mensagem && (
          <Callout intent="success" title={COPY.states.success}>
            {mensagem}
          </Callout>
        )}

        <Button type="submit" variant="primary" fullWidth size="md" loading={carregando}>
          {carregando ? COPY.states.processing : "Enviar código"}
        </Button>
      </form>
    </AuthShell>
  );
}
