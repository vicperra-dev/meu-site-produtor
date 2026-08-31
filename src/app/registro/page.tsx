"use client";

/**
 * Registro — GO-03F: Design System (AuthShell + Field/Input/Select/Button/Callout).
 * GO-06E: capitalização automática, ano de nascimento na faixa de idade, sexo/gênero placeholder.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import {
  validateBirthDateString,
  getBirthDateMinYear,
  getBirthDateMaxYear,
} from "../lib/birth-date-validation";
import {
  AuthShell,
  Button,
  Callout,
  Field,
  Input,
  Select,
} from "@/components/design-system";

/** Capitaliza a primeira letra de cada palavra (ex.: joao da silva → Joao Da Silva). */
function capitalizeWords(value: string): string {
  return value
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export default function RegistroPage() {
  const { registro } = useAuth();
  const router = useRouter();

  // ===== Dados principais =====
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [nomeArtistico, setNomeArtistico] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");

  // ===== Localização =====
  const [pais, setPais] = useState("Brasil");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [bairro, setBairro] = useState("");

  // ===== Perfil =====
  const [dataNascimento, setDataNascimento] = useState("");
  const [nomeSocial, setNomeSocial] = useState("");
  const [sexo, setSexo] = useState("");
  const [genero, setGenero] = useState("");
  const [generoOutro, setGeneroOutro] = useState("");
  const [estilosMusicais, setEstilosMusicais] = useState("");
  const [nacionalidade, setNacionalidade] = useState("");

  function calcularIdade(data: string): number {
    if (!data) return 0;
    const hoje = new Date();
    const nascimento = new Date(data + "T12:00:00");
    if (Number.isNaN(nascimento.getTime())) return 0;
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return idade;
  }

  const idade = calcularIdade(dataNascimento);
  const menorDeIdade = idade > 0 && idade < 18;
  const minYear = getBirthDateMinYear();
  const maxYear = getBirthDateMaxYear();

  // ===== UI =====
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [aceiteTermos, setAceiteTermos] = useState(false);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function formatarCpf(value: string) {
    const apenasNumeros = value.replace(/\D/g, "");
    let formatado = apenasNumeros;
    if (apenasNumeros.length > 3) {
      formatado = apenasNumeros.slice(0, 3) + "." + apenasNumeros.slice(3);
    }
    if (apenasNumeros.length > 6) {
      formatado =
        apenasNumeros.slice(0, 3) +
        "." +
        apenasNumeros.slice(3, 6) +
        "." +
        apenasNumeros.slice(6);
    }
    if (apenasNumeros.length > 9) {
      formatado =
        apenasNumeros.slice(0, 3) +
        "." +
        apenasNumeros.slice(3, 6) +
        "." +
        apenasNumeros.slice(6, 9) +
        "-" +
        apenasNumeros.slice(9, 11);
    }
    setCpf(formatado);
  }

  function onBirthDateChange(value: string) {
    if (!value) {
      setDataNascimento("");
      return;
    }
    const yearPart = value.slice(0, 4);
    if (yearPart.length === 4) {
      const year = Number(yearPart);
      if (!Number.isFinite(year) || year < minYear || year > maxYear) {
        setErro(`Ano de nascimento deve estar entre ${minYear} e ${maxYear}.`);
        setDataNascimento("");
        return;
      }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const check = validateBirthDateString(value);
      if (!check.valid) {
        setErro(check.error);
        setDataNascimento("");
        return;
      }
    }
    setErro((prev) =>
      prev.startsWith("Ano de nascimento") || prev.startsWith("Idade") || prev.startsWith("Data de nascimento")
        ? ""
        : prev
    );
    setDataNascimento(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha !== confirmar) {
      setErro("As senhas não conferem.");
      return;
    }

    if (!aceiteTermos) {
      setErro("É necessário aceitar os termos de uso para se registrar.");
      return;
    }

    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) {
      setErro("CPF deve conter 11 dígitos numéricos.");
      return;
    }

    const birthCheck = validateBirthDateString(dataNascimento);
    if (!birthCheck.valid) {
      setErro(birthCheck.error);
      return;
    }

    if (!sexo) {
      setErro("Selecione o sexo.");
      return;
    }

    if (!genero) {
      setErro("Selecione o gênero.");
      return;
    }

    if (genero === "outro" && !generoOutro.trim()) {
      setErro("Especifique seu gênero.");
      return;
    }

    setCarregando(true);

    const result = await registro({
      nomeCompleto: capitalizeWords(nomeCompleto.trim()),
      nomeArtistico: capitalizeWords(nomeArtistico.trim()),
      nomeSocial: nomeSocial ? capitalizeWords(nomeSocial.trim()) : null,
      email,
      senha,
      telefone,
      cpf: cpfDigits,
      pais,
      estado,
      cidade,
      bairro,
      dataNascimento,
      sexo,
      genero,
      generoOutro: genero === "outro" ? generoOutro : null,
      estilosMusicais: estilosMusicais
        ? capitalizeWords(estilosMusicais.trim())
        : null,
      nacionalidade: nacionalidade
        ? capitalizeWords(nacionalidade.trim())
        : null,
    });

    setCarregando(false);

    if (!result.ok) {
      setErro(
        result.error ||
          "Não foi possível registrar. Verifique os dados ou se o email já está em uso."
      );
      return;
    }

    router.push("/conta");
  }

  return (
    <AuthShell
      title="Criar conta na THouse Rec"
      subtitle="Crie seu acesso para gerenciar agendamentos, planos e produções com o Tremv."
      backgroundImage="/registro-bg.png.png"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nome completo">
          <Input
            required
            value={nomeCompleto}
            onChange={(e) => setNomeCompleto(e.target.value)}
            onBlur={() => setNomeCompleto((v) => capitalizeWords(v.trim()))}
            placeholder="Seu nome completo de registro"
          />
        </Field>

        <Field label="Nome artístico">
          <Input
            required
            value={nomeArtistico}
            onChange={(e) => setNomeArtistico(e.target.value)}
            onBlur={() => setNomeArtistico((v) => capitalizeWords(v.trim()))}
            placeholder="Tremv, Dizzy, etc."
          />
        </Field>

        <Field label="Nome social (opcional)">
          <Input
            value={nomeSocial}
            onChange={(e) => setNomeSocial(e.target.value)}
            onBlur={() => setNomeSocial((v) => (v ? capitalizeWords(v.trim()) : v))}
            placeholder="Como você gostaria de ser chamado"
          />
        </Field>

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

        <Field label="Telefone">
          <Input
            required
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="+55 (21) 99999-9999"
          />
        </Field>

        <Field label="CPF">
          <Input
            required
            value={cpf}
            onChange={(e) => formatarCpf(e.target.value)}
            placeholder="000.000.000-00"
            maxLength={14}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="País">
            <Input required value={pais} onChange={(e) => setPais(e.target.value)} />
          </Field>
          <Field label="Estado">
            <Input required value={estado} onChange={(e) => setEstado(e.target.value)} />
          </Field>
          <Field label="Cidade">
            <Input required value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Field>
          <Field label="Bairro">
            <Input required value={bairro} onChange={(e) => setBairro(e.target.value)} />
          </Field>
        </div>

        <Field
          label="Data de nascimento"
          hint={`Ano entre ${minYear} e ${maxYear}`}
        >
          <Input
            type="date"
            required
            value={dataNascimento}
            onChange={(e) => onBirthDateChange(e.target.value)}
            min={`${minYear}-01-01`}
            max={`${maxYear}-12-31`}
          />
        </Field>

        {idade > 0 && (
          <Callout intent="neutral" icon="info">
            <strong>Idade:</strong> {idade} anos
          </Callout>
        )}

        {menorDeIdade && (
          <Callout intent="warning" title="Autorização necessária">
            <p>
              Para menores de 18 anos, é necessário enviar uma autorização por escrito do responsável legal
              para o email de contato da THouse Rec antes de realizar qualquer serviço ou assinar planos.
            </p>
            <p className="mt-2 text-xs text-yellow-300">
              Email: contato@thouse-rec.com.br (será atualizado em breve)
            </p>
          </Callout>
        )}

        <Field label="Sexo">
          <Select
            required
            value={sexo}
            onChange={(e) => {
              if (e.target.value) setSexo(e.target.value);
            }}
            options={[
              ...(!sexo ? [{ value: "", label: "Selecione…" }] : []),
              { value: "masculino", label: "Masculino" },
              { value: "feminino", label: "Feminino" },
              { value: "prefiro_nao_declarar", label: "Prefiro não declarar" },
            ]}
          />
        </Field>

        <Field label="Gênero">
          <Select
            required
            value={genero}
            onChange={(e) => {
              const v = e.target.value;
              if (!v) return;
              setGenero(v);
              if (v !== "outro") setGeneroOutro("");
            }}
            options={[
              ...(!genero ? [{ value: "", label: "Selecione…" }] : []),
              { value: "heterossexual", label: "Heterossexual" },
              { value: "homossexual", label: "Homossexual" },
              { value: "bissexual", label: "Bissexual" },
              { value: "transsexual", label: "Transsexual" },
              { value: "nao_binario", label: "Não-binário" },
              { value: "outro", label: "Outro" },
              { value: "prefiro_nao_informar", label: "Prefiro não informar" },
            ]}
          />
        </Field>

        {genero === "outro" && (
          <Field label="Especifique seu gênero">
            <Input
              value={generoOutro}
              onChange={(e) => setGeneroOutro(e.target.value)}
              placeholder="Como você se identifica?"
            />
          </Field>
        )}

        <Field label="Estilos musicais (opcional)">
          <Input
            value={estilosMusicais}
            onChange={(e) => setEstilosMusicais(e.target.value)}
            onBlur={() =>
              setEstilosMusicais((v) => (v ? capitalizeWords(v.trim()) : v))
            }
            placeholder="Trap, Boom bap, Drill..."
          />
        </Field>

        <Field label="Nacionalidade (opcional)">
          <Input
            value={nacionalidade}
            onChange={(e) => setNacionalidade(e.target.value)}
            onBlur={() =>
              setNacionalidade((v) => (v ? capitalizeWords(v.trim()) : v))
            }
          />
        </Field>

        <Field label="Senha">
          <div className="relative">
            <Input
              type={mostrarSenha ? "text" : "password"}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              className="pr-16"
            />
            <Button
              type="button"
              onClick={() => setMostrarSenha((v) => !v)}
              variant="ghost"
              size="xs"
              className="absolute inset-y-1 right-1"
              aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? "Ocultar" : "Ver"}
            </Button>
          </div>
        </Field>

        <Field label="Confirmar senha">
          <div className="relative">
            <Input
              type={mostrarConfirmar ? "text" : "password"}
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              className="pr-16"
            />
            <Button
              type="button"
              onClick={() => setMostrarConfirmar((v) => !v)}
              variant="ghost"
              size="xs"
              className="absolute inset-y-1 right-1"
              aria-label={mostrarConfirmar ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarConfirmar ? "Ocultar" : "Ver"}
            </Button>
          </div>
        </Field>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="aceite-termos-registro"
            checked={aceiteTermos}
            onChange={(e) => setAceiteTermos(e.target.checked)}
            className="mt-1 h-4 w-4 cursor-pointer rounded border-zinc-600 bg-zinc-900 text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-0"
            required
          />
          <label
            htmlFor="aceite-termos-registro"
            className="text-xs text-white cursor-pointer"
          >
            Li e aceito os{" "}
            <a
              href="/termos-contratos"
              target="_blank"
              className="!text-blue-400 underline underline-offset-2 hover:!text-blue-300 transition-colors"
              style={{ color: "#60a5fa" }}
              onClick={(e) => e.stopPropagation()}
            >
              termos de uso
            </a>
          </label>
        </div>

        {erro && <Callout intent="error">{erro}</Callout>}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          size="md"
          loading={carregando}
        >
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
