import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Garante sessão de administrador. Sem sessão → login; com sessão sem papel de admin → null.
 * Retorna o cliente Supabase autenticado para uso nas páginas/ações do painel.
 */
export const getAdminSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("is_admin");
  return { supabase, user, isAdmin: isAdmin === true };
});

/** Para Server Actions: lança erro se não for admin. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.isAdmin) throw new Error("Acesso negado");
  return session;
}
