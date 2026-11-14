"use client";
import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_NAME } from "@/lib/env";
import { getPublicConfig } from "@/lib/public-config";

/** Cliente do navegador: fala com o Supabase pelo mesmo endereço do site e compartilha o cookie de sessão com o servidor. */
export async function createClient() {
  const { supabaseUrl, anonKey } = await getPublicConfig();
  return createBrowserClient(supabaseUrl, anonKey, { cookieOptions: { name: AUTH_COOKIE_NAME } });
}
