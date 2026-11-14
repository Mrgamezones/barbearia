// Leituras públicas de disponibilidade feitas direto do navegador, com a chave anon, via PostgREST.
// - Não usam Server Actions: actions disparadas em sequência enquanto a URL muda (replaceState)
//   podem ficar presas na fila do roteador do Next e nunca serem enviadas.
// - Usam fetch puro (sem supabase-js) para não pesar no JavaScript da página inicial.

import { getPublicConfig } from "@/lib/public-config";

async function rpc<T>(fn: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const { supabaseUrl, anonKey: key } = await getPublicConfig();
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    signal,
  });
  if (!res.ok) throw new Error(`Falha em ${fn}: ${res.status}`);
  return res.json() as Promise<T>;
}

/** Datas com pelo menos um horário livre entre `from` e `to` (inclusive). */
export async function fetchAvailableDates(from: string, to: string, totalMinutes: number, signal?: AbortSignal): Promise<string[]> {
  const rows = await rpc<{ day: string }[]>("get_available_dates", { p_from: from, p_to: to, p_total_minutes: totalMinutes }, signal);
  return rows.map((r) => r.day);
}

/** Horários livres (ISO) de uma data. */
export async function fetchSlots(date: string, totalMinutes: number, signal?: AbortSignal): Promise<string[]> {
  const rows = await rpc<{ slot: string }[]>("get_available_slots", { p_date: date, p_total_minutes: totalMinutes }, signal);
  return rows.map((r) => new Date(r.slot).toISOString());
}
