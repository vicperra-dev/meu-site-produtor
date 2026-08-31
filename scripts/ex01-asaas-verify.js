const fs = require("fs");
const https = require("https");

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const o = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    o[key] = val;
  }
  return o;
}

const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };
const apiKey = env.ASAAS_API_KEY || process.env.ASAAS_API_KEY;

if (!apiKey) {
  console.log(JSON.stringify({ ok: false, error: "ASAAS_API_KEY missing" }));
  process.exit(1);
}

const isProd = apiKey.startsWith("$aact_prod_");
const apiUrl = isProd ? "https://www.asaas.com/api/v3" : "https://sandbox.asaas.com/api/v3";

function get(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, apiUrl);
    const req = https.request(
      url,
      { method: "GET", headers: { access_token: apiKey, "User-Agent": "ex01-sandbox-verify" } },
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => resolve({ status: res.statusCode, body: body.slice(0, 500) }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  const result = {
    tokenPrefix: apiKey.slice(0, 12) + "...",
    environment: isProd ? "PRODUCTION" : "SANDBOX",
    apiUrl,
    sandboxRequired: true,
    sandboxOk: !isProd,
    ping: null,
  };

  try {
    const ping = await get("/finance/balance");
    result.ping = { status: ping.status, snippet: ping.body };
    result.apiReachable = ping.status === 200;
  } catch (e) {
    result.ping = { error: e.message };
    result.apiReachable = false;
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.sandboxOk ? 0 : 2);
})();
