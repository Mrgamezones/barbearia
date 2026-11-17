"use server";

import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin/auth";
import { alertEndpointSchema, alertSubscriptionSchema, shortUserAgent } from "@/lib/admin/alert-subscription";
import { sendTestShopAlert } from "@/lib/notifications/shop-alert";

export type AlertActionResult = { ok: true } | { ok: false; error: "invalid" | "not_found" | "send_failed" | "unknown" };

/** Ativa os avisos neste aparelho: grava (ou renova) a inscrição do dono nesta barbearia. */
export async function subscribeAlerts(slug: string, input: unknown): Promise<AlertActionResult> {
  const parsed = alertSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, user, shop } = await requireAdmin(slug);
  const { error } = await supabase.from("admin_push_subscriptions").upsert(
    {
      shop_id: shop.id,
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      user_agent: shortUserAgent((await headers()).get("user-agent")),
    },
    { onConflict: "shop_id,endpoint" },
  );
  if (error) {
    console.error("[alertas] falha ao inscrever", error.message);
    return { ok: false, error: "unknown" };
  }
  return { ok: true };
}

/** Desativa os avisos neste aparelho. */
export async function unsubscribeAlerts(slug: string, endpoint: unknown): Promise<AlertActionResult> {
  const parsed = alertEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, shop } = await requireAdmin(slug);
  const { error } = await supabase.from("admin_push_subscriptions").delete().eq("shop_id", shop.id).eq("endpoint", parsed.data);
  if (error) return { ok: false, error: "unknown" };
  return { ok: true };
}

/** Este aparelho está inscrito (para o próprio usuário, nesta barbearia)? */
export async function isAlertSubscribed(slug: string, endpoint: unknown): Promise<boolean> {
  const parsed = alertEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return false;
  const { supabase, shop } = await requireAdmin(slug);
  const { data } = await supabase.from("admin_push_subscriptions").select("id").eq("shop_id", shop.id).eq("endpoint", parsed.data).maybeSingle();
  return !!data;
}

/** Envia um aviso de teste só a este aparelho, e só se a inscrição for do próprio usuário (RLS). */
export async function sendTestAlert(slug: string, endpoint: unknown): Promise<AlertActionResult> {
  const parsed = alertEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, shop } = await requireAdmin(slug);
  const { data: sub } = await supabase
    .from("admin_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("shop_id", shop.id)
    .eq("endpoint", parsed.data)
    .maybeSingle();
  if (!sub) return { ok: false, error: "not_found" };
  const r = await sendTestShopAlert(sub, shop.slug);
  if (r === "gone") await supabase.from("admin_push_subscriptions").delete().eq("id", sub.id);
  return r === "sent" ? { ok: true } : { ok: false, error: r === "gone" ? "not_found" : "send_failed" };
}

/** Último aviso desta barbearia (a agenda aberta compara para atualizar e tocar o som). */
export async function latestAlertId(slug: string): Promise<number> {
  const { supabase, shop } = await requireAdmin(slug);
  const { data } = await supabase.from("shop_alerts").select("id").eq("shop_id", shop.id).order("id", { ascending: false }).limit(1).maybeSingle();
  return (data?.id as number | undefined) ?? 0;
}
