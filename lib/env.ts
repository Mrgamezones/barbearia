/** Leitura centralizada das variáveis de ambiente. */
export const TIMEZONE = process.env.BUSINESS_TIMEZONE ?? "America/Sao_Paulo";

/** Nome fixo do cookie de sessão: o padrão do @supabase/ssr deriva do hostname da URL, que difere entre navegador (proxy) e servidor. */
export const AUTH_COOKIE_NAME = "sb-barbearia-auth";

/**
 * URL e anon key usadas pelo SERVIDOR. Lidas em tempo de execução:
 * `SUPABASE_INTERNAL_URL`/`SUPABASE_ANON_KEY` (Docker) têm prioridade sobre as `NEXT_PUBLIC_*` (desenvolvimento/Vercel).
 * A verificação antes do build (`scripts/check-supabase.mjs`) repete esta precedência: mantenha as duas iguais.
 */
export function publicEnv() {
  const url = process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Defina SUPABASE_INTERNAL_URL/SUPABASE_ANON_KEY (Docker) ou NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (.env.local)");
  }
  return { url: url.replace(/\/$/, ""), anonKey };
}

/** Chave pública VAPID (Web Push), lida em tempo de execução. */
export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

export function siteUrl() {
  return (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
