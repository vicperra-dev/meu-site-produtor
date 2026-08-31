"use client";

import { useState } from "react";
import {
  Button,
  Callout,
  Card,
  Field,
  Input,
  PageHeader,
} from "@/components/design-system";

export default function AdminResetSenhaPage() {
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [usuario, setUsuario] = useState<any>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function verificarUsuario() {
    if (!email) {
      setErro("Digite um email");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const res = await fetch(`/api/admin/reset-senha?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao verificar usuário");
        setUsuario(null);
      } else {
        setUsuario(data.usuario);
        setMensagem("Usuário encontrado!");
      }
    } catch (err) {
      setErro("Erro ao verificar usuário");
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }

  async function resetarSenha() {
    if (!email || !novaSenha) {
      setErro("Email e nova senha são obrigatórios");
      return;
    }

    if (novaSenha.length < 6) {
      setErro("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setCarregando(true);
    setErro("");
    setMensagem("");

    try {
      const res = await fetch("/api/admin/reset-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, novaSenha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao resetar senha");
      } else {
        setMensagem(data.message);
        setNovaSenha("");
      }
    } catch (err) {
      setErro("Erro ao resetar senha");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Resetar Senha" subtitle="Verificar usuários e resetar senhas" icon="lock" />

      <Card className="!p-6 space-y-4">
        <Field label="Email do Usuário">
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && verificarUsuario()}
              className="flex-1"
              placeholder="email@exemplo.com"
            />
            <Button
              variant="secondary"
              onClick={verificarUsuario}
              loading={carregando}
            >
              Verificar
            </Button>
          </div>
        </Field>

        {usuario && (
          <Callout intent="success" title="Usuário Encontrado:">
            <div className="text-sm text-zinc-300 space-y-1">
              <div><strong>Nome:</strong> {usuario.nomeArtistico}</div>
              <div><strong>Email:</strong> {usuario.email}</div>
              <div><strong>Role:</strong> {usuario.role}</div>
              <div><strong>Bloqueado:</strong> {usuario.blocked ? "Sim" : "Não"}</div>
              <div><strong>Criado em:</strong> {new Date(usuario.createdAt).toLocaleString("pt-BR")}</div>
            </div>
          </Callout>
        )}

        {usuario && (
          <Field label="Nova Senha">
            <Input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Digite a nova senha"
            />
            <Button
              variant="primary"
              fullWidth
              className="mt-2"
              onClick={resetarSenha}
              disabled={!novaSenha}
              loading={carregando}
            >
              Resetar Senha
            </Button>
          </Field>
        )}

        {erro && <Callout intent="error">{erro}</Callout>}
        {mensagem && <Callout intent="success">{mensagem}</Callout>}
      </Card>
    </div>
  );
}
