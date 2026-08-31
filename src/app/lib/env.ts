/**
 * Helper para carregar variáveis de ambiente de forma mais robusta
 * Isso resolve problemas com tokens que começam com $ sendo interpretados como variáveis vazias
 */

let asaasApiKeyCache: string | undefined = undefined;

/**
 * Lê o arquivo .env diretamente para evitar problemas com Next.js interpretando $ como variável
 */
function parseEnvContent(content: string): string | undefined {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim().startsWith('ASAAS_API_KEY=')) {
      const value = line.split('=').slice(1).join('='); // Juntar caso tenha = no token
      const trimmed = value.replace(/^["']|["']$/g, '').trim();
      return trimmed || undefined;
    }
  }
  return undefined;
}

function readEnvFile(): string | undefined {
  if (typeof window !== 'undefined') return undefined; // Não funciona no cliente
  
  try {
    const fs = require('fs');
    const path = require('path');
    
    const envLocalPath = path.join(process.cwd(), '.env.local');
    const envPath = path.join(process.cwd(), '.env');
    
    // Prioridade: .env.local primeiro, depois .env (igual ao Next.js)
    // Se a chave existir em .env.local, usa; senão busca em .env
    if (fs.existsSync(envLocalPath)) {
      const localContent = fs.readFileSync(envLocalPath, 'utf8');
      const key = parseEnvContent(localContent);
      if (key) return key;
    }
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const key = parseEnvContent(envContent);
      if (key) return key;
    }
  } catch (error) {
    console.warn('[env.ts] Erro ao ler arquivo .env:', error);
  }
  
  return undefined;
}

/**
 * Obtém uma variável de ambiente removendo aspas e espaços
 */
export function getEnv(key: string): string | undefined {
  // Em produção, sempre usar process.env diretamente
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const value = process.env[key];
    if (!value) return undefined;
    return value.replace(/^["']|["']$/g, '').trim() || undefined;
  }
  
  // Em desenvolvimento, para ASAAS_API_KEY, tentar ler do arquivo primeiro
  if (key === 'ASAAS_API_KEY') {
    if (asaasApiKeyCache === undefined) {
      asaasApiKeyCache = readEnvFile();
    }
    // Se não encontrou no arquivo, tentar process.env
    if (!asaasApiKeyCache) {
      const value = process.env[key];
      if (value) {
        asaasApiKeyCache = value.replace(/^["']|["']$/g, '').trim() || undefined;
      }
    }
    return asaasApiKeyCache;
  }
  
  // Para outras variáveis, usar process.env normal
  const value = process.env[key];
  if (!value) return undefined;
  // Remover aspas simples ou duplas do início e fim, e espaços
  return value.replace(/^["']|["']$/g, '').trim() || undefined;
}

/**
 * Obtém ASAAS_API_KEY de forma robusta
 * Em produção (Vercel), usa process.env diretamente
 * Em desenvolvimento, tenta ler do arquivo .env
 */
export function getAsaasApiKey(): string | undefined {
  // Em produção (Vercel), sempre usar process.env diretamente
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
    const key = process.env.ASAAS_API_KEY;
    if (!key) return undefined;
    // Remover aspas se presentes
    return key.replace(/^["']|["']$/g, '').trim() || undefined;
  }
  
  // Em desenvolvimento, usar a função getEnv que tenta ler do arquivo
  return getEnv('ASAAS_API_KEY');
}
