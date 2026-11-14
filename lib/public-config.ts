"use client";

/** Configuração pública do navegador, entregue em tempo de execução por /api/public-config. */
export type PublicConfig = { supabaseUrl: string; anonKey: string; vapidPublicKey: string | null };

let pending: Promise<PublicConfig> | null = null;

export function getPublicConfig(): Promise<PublicConfig> {
  pending ??= fetch("/api/public-config", { cache: "no-store" })
    .then((res) => {
      if (!res.ok) throw new Error(`Falha ao carregar configuração: ${res.status}`);
      return res.json() as Promise<Omit<PublicConfig, "supabaseUrl">>;
    })
    // O Supabase é acessado pelo mesmo endereço do site (proxy em app/supabase).
    .then((cfg) => ({ ...cfg, supabaseUrl: `${location.origin}/supabase` }))
    .catch((e) => {
      pending = null; // permite nova tentativa (ex.: voltou a conexão)
      throw e;
    });
  return pending;
}
