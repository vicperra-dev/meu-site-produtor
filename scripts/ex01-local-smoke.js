/**
 * EX-01 local smoke — HTTP journey até checkout sandbox (sem pagamento).
 * Execução única; não altera regra de negócio.
 */
const BASE = process.env.BASE_URL || "http://localhost:3000";

function jar() {
  let cookie = "";
  return {
    store(res) {
      const set = res.headers.getSetCookie?.() || [];
      const raw = res.headers.get("set-cookie");
      const parts = set.length ? set : raw ? [raw] : [];
      for (const line of parts) {
        const m = line.match(/session_id=([^;]+)/);
        if (m) cookie = `session_id=${m[1]}`;
      }
    },
    headers() {
      return cookie ? { Cookie: cookie } : {};
    },
  };
}

async function req(path, opts = {}, cookies) {
  const url = `${BASE}${path}`;
  const headers = { ...(opts.headers || {}), ...cookies.headers() };
  const start = Date.now();
  const res = await fetch(url, { ...opts, headers, redirect: "manual" });
  cookies.store(res);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _raw: text.slice(0, 300) };
  }
  return { status: res.status, json, text: text.slice(0, 500), ms: Date.now() - start };
}

function gerarCpfValido() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 9));
  let d1 = 0;
  for (let i = 0; i < 9; i++) d1 += n[i] * (10 - i);
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = 0;
  for (let i = 0; i < 9; i++) d2 += n[i] * (11 - i);
  d2 += d1 * 2;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return [...n, d1, d2].join("");
}

async function main() {
  const cookies = jar();
  const ts = Date.now();
  const email = `ex01-${ts}@homolog.test`;
  const results = [];

  const step = (n, name, pass, evidence) => {
    results.push({ step: n, name, status: pass ? "PASS" : "FAIL", evidence });
    if (!pass) {
      console.log(JSON.stringify({ halt: true, results }, null, 2));
      process.exit(1);
    }
  };

  // 1 Home
  const home = await req("/", {}, cookies);
  step(1, "Abrir Home", home.status === 200, { status: home.status, ms: home.ms });

  // 2 Registro
  const regBody = {
    nomeCompleto: "EX01 Homolog Test",
    nomeArtistico: "EX01 Artist",
    email,
    senha: "senha123",
    telefone: "11999999999",
    cpf: gerarCpfValido(),
    pais: "Brasil",
    estado: "SP",
    cidade: "São Paulo",
    bairro: "Centro",
    dataNascimento: "1995-06-15",
    sexo: "masculino",
  };
  const reg = await req(
    "/api/registro",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(regBody),
    },
    cookies
  );
  step(2, "Registrar usuário", reg.status === 200 || reg.status === 201, {
    status: reg.status,
    email,
    body: reg.json,
  });

  // 3 Auto-login
  const me = await req("/api/me", {}, cookies);
  const loggedIn = me.json?.user?.email === email;
  step(3, "Confirmar login automático", loggedIn, {
    status: me.status,
    user: me.json?.user ? { id: me.json.user.id, email: me.json.user.email } : null,
  });
  const userId = me.json.user.id;

  // 4 Minha Conta
  const minha = await req("/api/meus-dados", {}, cookies);
  const minhaPage = await req("/minha-conta", {}, cookies);
  step(
    4,
    "Abrir Minha Conta",
    minha.status === 200 && minhaPage.status === 200,
    { apiStatus: minha.status, pageStatus: minhaPage.status }
  );

  // 5-7 Serviço, data, carrinho (simulado como na UI)
  const servico = { id: "sessao", nome: "Sessão", quantidade: 1, preco: 40 };
  const cartItem = {
    data: "2026-09-20",
    hora: "14:00",
    duracaoMinutos: 60,
    tipo: "sessao",
    servicos: [servico],
    beats: [],
    total: 40,
    observacoes: "EX-01 homologação",
  };
  step(5, "Selecionar um serviço", servico.id === "sessao", { servico: servico.nome, preco: servico.preco });
  step(6, "Selecionar data", !!cartItem.data && !!cartItem.hora, {
    data: cartItem.data,
    hora: cartItem.hora,
  });
  step(7, "Adicionar ao carrinho", cartItem.total > 0, { items: 1, total: cartItem.total });

  // 8 Carrinho
  const carrinhoPage = await req("/carrinho", {}, cookies);
  step(8, "Abrir Carrinho", carrinhoPage.status === 200, { status: carrinhoPage.status });

  // Update conta (CPF) como a UI faz antes do checkout
  await req(
    "/api/conta/update",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeArtistico: regBody.nomeArtistico,
        dataNascimento: "1995-06-15",
        cpf: regBody.cpf,
        pais: "Brasil",
        cidade: "São Paulo",
        bairro: "Centro",
        cep: "01310100",
      }),
    },
    cookies
  );

  // 9 Checkout
  const checkout = await req(
    "/api/asaas/checkout-carrinho",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [cartItem],
        total: 40,
      }),
    },
    cookies
  );
  const initPoint = checkout.json?.initPoint;
  const checkoutOk =
    checkout.status === 200 &&
    typeof initPoint === "string" &&
    initPoint.includes("sandbox.asaas.com");
  step(9, "Iniciar Checkout", checkoutOk, {
    status: checkout.status,
    initPointPrefix: initPoint ? initPoint.slice(0, 80) + "..." : null,
    error: checkout.json?.error,
  });

  // 10 Confirm paymentId, PaymentMetadata
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();
  let meta = null;
  let paymentId = null;
  try {
    meta = await prisma.paymentMetadata.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, asaasId: true, metadata: true, createdAt: true },
    });
    paymentId = meta?.asaasId || null;
  } finally {
    await prisma.$disconnect();
  }

  const step10Ok =
    !!paymentId && !!meta?.id && typeof initPoint === "string" && initPoint.includes("sandbox");
  step(10, "Confirmar checkout criado", step10Ok, {
    paymentId,
    paymentMetadataId: meta?.id,
    initPointSandbox: initPoint?.includes("sandbox.asaas.com"),
    provider: checkout.json?.provider,
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        email,
        userId,
        paymentId,
        paymentMetadataId: meta?.id,
        initPoint: initPoint?.slice(0, 120) + "...",
        results,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(JSON.stringify({ error: e.message, stack: e.stack?.split("\n").slice(0, 5) }));
  process.exit(1);
});
