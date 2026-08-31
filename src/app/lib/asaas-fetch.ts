const asaasInsecureTls =
  process.env.ASAAS_SKIP_TLS_VERIFY === "true" &&
  process.env.NODE_ENV !== "production";

let devTlsRelaxed = false;

function relaxDevTlsIfNeeded() {
  if (!asaasInsecureTls || devTlsRelaxed) return;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  devTlsRelaxed = true;
}

export async function asaasFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  if (asaasInsecureTls) {
    relaxDevTlsIfNeeded();
  }

  try {
    return await fetch(input, init);
  } catch (error) {
    const cause = error instanceof Error ? error.cause : undefined;
    const code =
      cause &&
      typeof cause === "object" &&
      "code" in cause &&
      typeof cause.code === "string"
        ? cause.code
        : null;

    if (code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") {
      throw new Error(
        "Não foi possível conectar ao Asaas: falha na verificação do certificado TLS. " +
          "Em desenvolvimento, defina ASAAS_SKIP_TLS_VERIFY=true no .env.local ou corrija os certificados raiz do sistema."
      );
    }

    throw error;
  }
}
