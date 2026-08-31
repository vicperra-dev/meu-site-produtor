"use client";

/**
 * Portal do Cliente — Perfil.
 * Usa exatamente as mesmas APIs da página /conta:
 * GET /api/conta e POST /api/conta/update (mesmas regras de autenticação;
 * alteração de e-mail continua exigindo senha atual no backend).
 * Alteração de senha usa o fluxo oficial /api/esqueci-senha → /verificar-codigo.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Callout,
  Card,
  ErrorState,
  Field,
  Input,
  LoadingBlock,
  Section,
  Select,
  useToast,
} from "@/components/design-system";

type ContaData = {
  id: string;
  nomeArtistico: string;
  nomeSocial: string | null;
  email: string;
  telefone: string;
  cpf: string | null;
  pais: string;
  estado: string;
  cidade: string;
  bairro: string;
  dataNascimento: string;
  sexo: string | null;
  genero: string | null;
  generoOutro: string | null;
  estilosMusicais: string | null;
  nacionalidade: string | null;
  foto: string | null;
  role: string;
  createdAt: string;
};

function formatCpf(cpf: string): string {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function ProfileSection() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState<ContaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [enviandoCodigoSenha, setEnviandoCodigoSenha] = useState(false);
  const [emailOriginal, setEmailOriginal] = useState("");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [dragFoto, setDragFoto] = useState(false);
  const [showUrlAvancado, setShowUrlAvancado] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void carregar();
  }, []);

  async function carregar() {
    setLoading(true);
    setErro(null);
    try {
      const r = await fetch("/api/conta", { method: "GET", credentials: "include" });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${r.status}`);
      }
      const data: ContaData = await r.json();
      if (!data || !data.id) throw new Error("Dados da conta incompletos");
      setForm(data);
      setEmailOriginal(data.email);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar dados da conta");
    } finally {
      setLoading(false);
    }
  }

  function setCampo<K extends keyof ContaData>(campo: K, valor: ContaData[K] | string) {
    setForm((prev) => {
      if (!prev) return prev;
      if (valor === "" && (campo === "nomeSocial" || campo === "generoOutro")) {
        return { ...prev, [campo]: null };
      }
      return { ...prev, [campo]: valor as ContaData[K] };
    });
  }

  async function uploadAvatar(file: File) {
    if (!form) return;
    const okType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!okType) {
      toast.error("Formato inválido", "Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size <= 0 || file.size > 2 * 1024 * 1024) {
      toast.error("Arquivo inválido", "Máximo 2MB.");
      return;
    }
    setUploadingFoto(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const r = await fetch("/api/conta/avatar", {
        method: "POST",
        body,
        credentials: "include",
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        toast.error("Upload falhou", data.error || "Não foi possível enviar a imagem.");
        return;
      }
      setCampo("foto", data.foto || null);
      toast.success("Avatar atualizado", "Sua foto de perfil foi salva.");
    } catch {
      toast.error("Upload falhou", "Erro de conexão ao enviar a imagem.");
    } finally {
      setUploadingFoto(false);
    }
  }

  async function salvar() {
    if (!form) return;
    setSalvando(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      if (senhaAtual) payload.senhaAtual = senhaAtual;
      const r = await fetch("/api/conta/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error("Não foi possível salvar", data.error || "Erro ao salvar dados");
        return;
      }
      toast.success("Perfil atualizado", "Suas alterações foram salvas com sucesso.");
      setSenhaAtual("");
      setEmailOriginal(form.email);
    } finally {
      setSalvando(false);
    }
  }

  async function iniciarAlteracaoSenha() {
    if (!form?.email) return;
    setEnviandoCodigoSenha(true);
    try {
      const res = await fetch("/api/esqueci-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          "Não foi possível iniciar",
          typeof data.error === "string"
            ? data.error
            : "Tente novamente em instantes."
        );
        return;
      }
      toast.success(
        "Código enviado",
        "Se existir uma conta vinculada a este e-mail, enviaremos as instruções. Verifique a caixa de entrada e o spam."
      );
      router.push(`/verificar-codigo?email=${encodeURIComponent(form.email)}`);
    } catch {
      toast.error("Não foi possível iniciar", "Erro de conexão. Tente novamente.");
    } finally {
      setEnviandoCodigoSenha(false);
    }
  }

  if (loading) return <LoadingBlock label="Carregando seu perfil..." />;
  if (erro || !form) {
    return <ErrorState title="Não foi possível carregar o perfil" description={erro} onRetry={carregar} />;
  }

  const precisaSenhaAtual = form.email !== emailOriginal;

  return (
    <Section title="Perfil" icon="user">
      <div className="space-y-4">
        {/* Cabeçalho com avatar */}
        <Card className="flex flex-col sm:flex-row items-center gap-4">
          <Avatar name={form.nomeArtistico} src={form.foto} size="xl" />
          <div className="flex-1 text-center sm:text-left space-y-3 w-full">
            <div>
              <p className="text-lg font-bold text-zinc-100">{form.nomeArtistico}</p>
              <p className="text-sm text-zinc-500">{form.email}</p>
            </div>
            <div
              className={`rounded-xl border border-dashed px-4 py-3 transition-colors ${
                dragFoto ? "border-red-500/60 bg-red-500/5" : "border-zinc-700 bg-zinc-900/40"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragFoto(true);
              }}
              onDragLeave={() => setDragFoto(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragFoto(false);
                const file = e.dataTransfer.files?.[0];
                if (file && !uploadingFoto) void uploadAvatar(file);
              }}
            >
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={uploadingFoto}
                  onClick={() => fotoInputRef.current?.click()}
                >
                  {uploadingFoto ? "Enviando…" : "Selecionar imagem"}
                </Button>
                <span className="text-[11px] text-zinc-500">JPG, PNG ou WEBP · até 2MB · ou arraste aqui</span>
              </div>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                  e.target.value = "";
                }}
              />
            </div>
            <button
              type="button"
              className="text-[11px] text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
              onClick={() => setShowUrlAvancado((v) => !v)}
            >
              {showUrlAvancado ? "Ocultar URL avançada" : "Usar URL avançada"}
            </button>
            {showUrlAvancado && (
              <Field label="URL da foto (avançado)">
                <Input
                  value={form.foto ?? ""}
                  onChange={(e) => setCampo("foto", e.target.value)}
                  placeholder="https://... ou /uploads/avatars/..."
                />
              </Field>
            )}
          </div>
        </Card>

        {/* Dados pessoais */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Dados pessoais</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nome artístico">
              <Input
                value={form.nomeArtistico}
                onChange={(e) => setCampo("nomeArtistico", e.target.value)}
              />
            </Field>
            <Field label="Nome social (opcional)">
              <Input
                value={form.nomeSocial ?? ""}
                onChange={(e) => setCampo("nomeSocial", e.target.value || null)}
              />
            </Field>
            <Field label="Email">
              <Input value={form.email} onChange={(e) => setCampo("email", e.target.value)} />
            </Field>
            <Field label="Telefone">
              <Input value={form.telefone} onChange={(e) => setCampo("telefone", e.target.value)} />
            </Field>
            <Field label="CPF">
              <Input
                value={form.cpf ? formatCpf(form.cpf) : ""}
                onChange={(e) => {
                  const apenasNumeros = e.target.value.replace(/\D/g, "");
                  setCampo("cpf", apenasNumeros || null);
                }}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </Field>
            <Field label="Data de nascimento">
              <Input
                type="date"
                value={form.dataNascimento?.slice(0, 10) ?? ""}
                onChange={(e) => setCampo("dataNascimento", e.target.value)}
              />
            </Field>
            <Field label="Sexo">
              <Select
                value={form.sexo || ""}
                onChange={(e) => setCampo("sexo", e.target.value || null)}
                options={[
                  ...(!form.sexo ? [{ value: "", label: "Selecione..." }] : []),
                  { value: "masculino", label: "Masculino" },
                  { value: "feminino", label: "Feminino" },
                  { value: "prefiro_nao_declarar", label: "Prefiro não declarar" },
                ]}
              />
            </Field>
            <Field label="Gênero">
              <Select
                value={form.genero || ""}
                onChange={(e) => {
                  setCampo("genero", e.target.value || null);
                  if (e.target.value !== "outro") setCampo("generoOutro", null);
                }}
                options={[
                  ...(!form.genero ? [{ value: "", label: "Selecione..." }] : []),
                  { value: "heterossexual", label: "Heterossexual" },
                  { value: "homossexual", label: "Homossexual" },
                  { value: "bissexual", label: "Bissexual" },
                  { value: "transsexual", label: "Transsexual" },
                  { value: "nao_binario", label: "Não-binário" },
                  { value: "outro", label: "Outro" },
                ]}
              />
            </Field>
            {form.genero === "outro" && (
              <Field label="Especifique seu gênero">
                <Input
                  value={form.generoOutro ?? ""}
                  onChange={(e) => setCampo("generoOutro", e.target.value || null)}
                  placeholder="Como você se identifica?"
                />
              </Field>
            )}
          </div>
        </Card>

        {/* Localização e perfil artístico */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Localização e perfil artístico</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="País">
              <Input value={form.pais} onChange={(e) => setCampo("pais", e.target.value)} />
            </Field>
            <Field label="Estado">
              <Input value={form.estado} onChange={(e) => setCampo("estado", e.target.value)} />
            </Field>
            <Field label="Cidade">
              <Input value={form.cidade} onChange={(e) => setCampo("cidade", e.target.value)} />
            </Field>
            <Field label="Bairro">
              <Input value={form.bairro} onChange={(e) => setCampo("bairro", e.target.value)} />
            </Field>
            <Field label="Estilos musicais">
              <Input
                value={form.estilosMusicais ?? ""}
                onChange={(e) => setCampo("estilosMusicais", e.target.value)}
              />
            </Field>
            <Field label="Nacionalidade">
              <Input
                value={form.nacionalidade ?? ""}
                onChange={(e) => setCampo("nacionalidade", e.target.value)}
              />
            </Field>
          </div>
        </Card>

        {/* Segurança */}
        <Card className="space-y-3">
          <p className="text-sm font-semibold text-zinc-200">Segurança</p>
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <Button
                type="button"
                variant="secondary"
                size="md"
                loading={enviandoCodigoSenha}
                onClick={() => void iniciarAlteracaoSenha()}
              >
                Alterar senha
              </Button>
              <p className="text-xs text-zinc-500">
                Enviaremos um código para o e-mail cadastrado e você concluirá a troca na página de verificação.
              </p>
            </div>
            {precisaSenhaAtual && (
              <Field
                label="Senha atual"
                hint="Obrigatória para alterar o e-mail."
              >
                <Input
                  type="password"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </Field>
            )}
          </div>
          {precisaSenhaAtual && (
            <Callout intent="warning">
              Por segurança, alterações de e-mail exigem a confirmação da sua senha atual.
            </Callout>
          )}
        </Card>

        <div className="flex justify-end">
          <Button variant="primary" size="md" icon="check" loading={salvando} onClick={salvar}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </Section>
  );
}
