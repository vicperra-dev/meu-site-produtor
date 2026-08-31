const fs = require("fs");

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
const keys = ["DATABASE_URL", "ASAAS_API_KEY", "NEXT_PUBLIC_SITE_URL", "ASAAS_WEBHOOK_ACCESS_TOKEN"];

for (const k of keys) {
  const v = env[k] || process.env[k];
  if (!v) {
    console.log(`${k}: MISSING`);
    continue;
  }
  let meta = `set len=${v.length}`;
  if (k === "ASAAS_API_KEY") {
    meta += v.startsWith("$aact_prod_") ? " type=PROD" : v.startsWith("$aact_") ? " type=sandbox" : " type=unknown";
  }
  if (k === "DATABASE_URL") {
    meta += v.includes("neon") ? " provider=neon" : v.includes("localhost") ? " provider=local" : " provider=other";
  }
  console.log(`${k}: OK ${meta}`);
}
