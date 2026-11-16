import "server-only";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { panelPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { SHOP_COLUMNS, type Shop } from "@/lib/types";
import { slugSchema } from "@/lib/validation";

/** Endereço do login preservando para onde voltar. */
export function loginPath(next?: string) {
  return next ? `/painel/login?next=${encodeURIComponent(next)}` : "/painel/login";
}

/**
 * Sessão do painel de uma barbearia. Sem sessão → login (voltando ao painel dela);
 * slug inexistente → 404; com sessão mas sem vínculo com a barbearia → `isAdmin: false`.
 * Retorna o cliente Supabase autenticado (RLS por barbearia) para páginas e actions.
 */
export const getPanelSession = cache(async (slug: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginPath(panelPath(slug)));
  if (!slugSchema.safeParse(slug).success) notFound();

  // shops é público para barbearias ativas; o dono também enxerga a sua se estiver inativa.
  const { data } = await supabase.from("shops").select(SHOP_COLUMNS).eq("slug", slug).maybeSingle();
  if (!data) notFound();
  const shop = data as unknown as Shop;
  const { data: isAdmin } = await supabase.rpc("is_shop_admin", { p_shop_id: shop.id });
  return { supabase, user, shop, isAdmin: isAdmin === true };
});

/** Para Server Actions: lança erro se o usuário não for dono da barbearia do slug. */
export async function requireAdmin(slug: string) {
  const session = await getPanelSession(slug);
  if (!session.isAdmin) throw new Error("Acesso negado");
  return session;
}
