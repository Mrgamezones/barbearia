import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatShopAlert, type ShopAlertKind } from "./shop-alert-text";
import type { PushPayload, PushSendResult, PushSubscriptionRow } from "./dispatch";
import { sendPush } from "./push";

export type { ShopAlertKind } from "./shop-alert-text";

/** Tempo máximo de cada envio: o cliente não pode ficar esperando o serviço de push. */
const SEND_TIMEOUT_MS = 5_000;

export type ShopAlertDeps = {
  db: SupabaseClient;
  sendPush: (sub: PushSubscriptionRow, payload: PushPayload) => Promise<PushSendResult>;
  now?: Date;
};

export type ShopAlertSummary = { alertId: number | null; sent: number; failed: number; removed: number };

function withTimeout<T>(p: Promise<T>, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), SEND_TIMEOUT_MS))]);
}

/**
 * Registra o aviso (shop_alerts) e envia push aos aparelhos dos donos da barbearia do agendamento.
 * Barbearia com notificações desligadas (demonstração): registra, mas não envia.
 * Inscrições expiradas são removidas. Nunca lança erro.
 */
export async function notifyShopAdminsWith(deps: ShopAlertDeps, appointmentId: string, kind: ShopAlertKind): Promise<ShopAlertSummary> {
  const summary: ShopAlertSummary = { alertId: null, sent: 0, failed: 0, removed: 0 };
  try {
    const { db } = deps;
    const { data: a } = await db
      .from("appointments")
      .select("shop_id,customer_name,starts_at,appointment_services(name_snapshot),shops(slug,notifications_enabled)")
      .eq("id", appointmentId)
      .single();
    if (!a) return summary;
    const shop = a.shops as unknown as { slug: string; notifications_enabled: boolean };

    const { data: alert, error: alertError } = await db
      .from("shop_alerts")
      .insert({ shop_id: a.shop_id, kind, appointment_id: appointmentId })
      .select("id")
      .single();
    if (alertError) throw alertError;
    summary.alertId = alert.id as number;

    if (!shop.notifications_enabled) return summary;

    const { data: subs } = await db.from("admin_push_subscriptions").select("id,endpoint,p256dh,auth").eq("shop_id", a.shop_id);
    if (!subs?.length) return summary;

    const text = formatShopAlert({
      kind,
      customerName: a.customer_name,
      startsAt: a.starts_at,
      services: (a.appointment_services ?? []).map((s: { name_snapshot: string }) => s.name_snapshot),
      shopSlug: shop.slug,
      now: deps.now,
    });
    const payload: PushPayload = { ...text, appointmentId, alertId: summary.alertId, tag: `alerta-${summary.alertId}` };

    const results = await Promise.all(
      (subs as PushSubscriptionRow[]).map(async (sub) => {
        const r = await withTimeout(deps.sendPush(sub, payload), "error" as PushSendResult);
        if (r === "gone") await db.from("admin_push_subscriptions").delete().eq("id", sub.id);
        return r;
      }),
    );
    for (const r of results) {
      if (r === "sent") summary.sent++;
      else if (r === "gone") summary.removed++;
      else summary.failed++;
    }
    if (summary.failed) console.error(`[shop-alert] ${summary.failed} envio(s) falharam para o alerta ${summary.alertId}`);
  } catch (e) {
    console.error("[shop-alert] falha ao avisar os donos", e);
  }
  return summary;
}

/** Avisa os donos da barbearia (agendamento pelo site ou cancelamento pelo cliente). */
export function notifyShopAdmins(appointmentId: string, kind: ShopAlertKind): Promise<ShopAlertSummary> {
  return notifyShopAdminsWith({ db: createAdminClient(), sendPush }, appointmentId, kind);
}

/** Envia um aviso de teste a uma inscrição (botão "Enviar aviso de teste" do painel). */
export async function sendTestShopAlert(sub: PushSubscriptionRow, shopSlug: string): Promise<PushSendResult> {
  return withTimeout(
    sendPush(sub, {
      title: "Aviso de teste",
      body: "Os avisos de agendamento estão funcionando neste aparelho.",
      appointmentId: "",
      tag: "alerta-teste",
      url: `/painel/${shopSlug}`,
    }),
    "error",
  );
}
