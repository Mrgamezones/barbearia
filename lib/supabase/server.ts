import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { AUTH_COOKIE_NAME, publicEnv } from "@/lib/env";

/** Cliente com a sessão do usuário (cookies). Usado no painel e em Server Actions. */
export async function createClient() {
  const { url, anonKey } = publicEnv();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookieOptions: { name: AUTH_COOKIE_NAME },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de um Server Component: o middleware renova a sessão.
        }
      },
    },
  });
}
