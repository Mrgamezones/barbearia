#!/usr/bin/env node
// Verificação antes do `next build`: o build pré-renderiza páginas lendo o Supabase. Sem o banco no ar,
// o Next reaproveitaria em silêncio dados antigos do cache (ou quebraria com stack traces de ECONNREFUSED).
import { pathToFileURL } from "node:url";

const TIMEOUT_MS = 5000;

/**
 * Mesma precedência de `publicEnv()` em `lib/env.ts` (mantenha os dois iguais):
 * `SUPABASE_INTERNAL_URL`/`SUPABASE_ANON_KEY` (Docker) antes das `NEXT_PUBLIC_*`.
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveSupabaseEnv(env = process.env) {
  const url = env.SUPABASE_INTERNAL_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

/** Retorna `null` se o Supabase respondeu, ou o motivo da falha. Status < 500 conta como "no ar". */
export async function probeSupabase({ url, anonKey }, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(`${url}/rest/v1/`, { headers: { apikey: anonKey }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.status < 500 ? null : `respondeu HTTP ${res.status}`;
  } catch (err) {
    if (err?.name === "TimeoutError") return `sem resposta em ${TIMEOUT_MS / 1000} s`;
    return err?.cause?.code ?? err?.message ?? String(err);
  }
}

async function main() {
  const { default: nextEnv } = await import("@next/env");
  nextEnv.loadEnvConfig(process.cwd(), false, { info: () => {}, error: console.error });

  const config = resolveSupabaseEnv();
  if (!config) {
    console.error(
      "✖ Build interrompido: Supabase não configurado.\n" +
        "  Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)\n" +
        "  ou SUPABASE_INTERNAL_URL e SUPABASE_ANON_KEY (Docker).",
    );
    process.exit(1);
  }

  const failure = await probeSupabase(config);
  if (failure) {
    console.error(
      `✖ Build interrompido: Supabase inacessível em ${config.url} (${failure}).\n` +
        "  O build lê serviços e configurações do banco para pré-renderizar as páginas.\n" +
        "  Local: suba o banco com `npm run docker:up` ou `npx supabase start`.\n" +
        "  Deploy: confira a URL e a chave do Supabase nas variáveis de ambiente.",
    );
    process.exit(1);
  }
  console.log(`✓ Supabase acessível em ${config.url}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();
