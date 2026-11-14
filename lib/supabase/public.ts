import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

/** Cliente anônimo sem cookies: leituras públicas (catálogo, configurações) e RPCs públicas. */
export function createPublicClient() {
  const { url, anonKey } = publicEnv();
  return createSupabaseClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
