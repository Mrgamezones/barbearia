import type { SupabaseClient } from "@supabase/supabase-js";
import { formatAddress } from "@/lib/format";
import type { ShopAddress } from "@/lib/types";
import { reminderEmail, reminderMessage, whatsappReminderParams } from "./templates";
import type { WhatsAppMessage, WhatsAppResult } from "./whatsapp";

export type PushSubscriptionRow = { id: string; endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; appointmentId: string; tag: string };

/** Resultado de um envio push: `gone` = inscrição expirada/inválida (404/410), deve ser removida. */
export type PushSendResult = "sent" | "gone" | "error";

export type Senders = {
  sendPush: (sub: PushSubscriptionRow, payload: PushPayload) => Promise<PushSendResult>;
  sendEmail: (msg: { to: string; subject: string; html: string; text: string }) => Promise<{ ok: boolean; error?: string; dryRun?: boolean }>;
  sendWhatsApp?: (msg: WhatsAppMessage) => Promise<WhatsAppResult>;
};

type Claimed = {
  reminder_id: string;
  appointment_id: string;
  kind: "h24" | "h2";
  channel: "push" | "email" | "whatsapp";
  starts_at: string;
  customer_name: string;
  customer_email: string | null;
  services: string | null;
  customer_phone?: string | null;
  whatsapp_opt_in?: boolean | null;
  shop_id: string;
};

export type DispatchSummary = { claimed: number; sent: number; failed: number; released: number; removedSubscriptions: number };

/**
 * Reserva lembretes vencidos e envia por push/e-mail.
 * - Cada lembrete é reservado uma única vez (SKIP LOCKED + sent_at), então reexecuções não duplicam.
 * - Falha temporária devolve o lembrete à fila; inscrição expirada é removida sem afetar o e-mail.
 * `db` deve usar a service_role.
 */
export async function dispatchDueReminders(db: SupabaseClient, senders: Senders, limit = 50): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, sent: 0, failed: 0, released: 0, removedSubscriptions: 0 };
  const { data, error } = await db.rpc("claim_due_reminders", { p_limit: limit });
  if (error) throw error;
  const due = (data ?? []) as Claimed[];
  summary.claimed = due.length;
  if (!due.length) return summary;

  // Nome e endereço de cada barbearia envolvida, lidos uma vez por execução.
  const shopIds = [...new Set(due.map((r) => r.shop_id))];
  const { data: shops } = await db
    .from("shops")
    .select("id,name,street,number,complement,district,city,state,postal_code")
    .in("id", shopIds);
  const bases = new Map(
    ((shops ?? []) as (ShopAddress & { id: string; name: string })[]).map((s) => [s.id, { businessName: s.name, address: formatAddress(s) }]),
  );

  for (const r of due) {
    const base = bases.get(r.shop_id) ?? { businessName: "Barbearia", address: "" };
    const data = { ...base, customerName: r.customer_name, startsAt: r.starts_at, services: r.services ?? "", kind: r.kind };
    let status: "sent" | "failed" | "no_target" | "dry_run" | "undeliverable" = "failed";
    let detail: string | null = null;

    if (r.channel === "whatsapp") {
      if (!r.whatsapp_opt_in || !r.customer_phone || !senders.sendWhatsApp) status = "no_target";
      else {
        const res = await senders.sendWhatsApp({ to: r.customer_phone, template: "lembrete_agendamento", params: whatsappReminderParams(data) });
        if (res.status === "sent") {
          status = "sent";
          detail = res.id;
        } else if (res.status === "dry_run") {
          status = "dry_run";
        } else {
          // Temporário volta para a fila; permanente (número sem WhatsApp, modelo inválido) não.
          status = res.status === "temporary" ? "failed" : "undeliverable";
          detail = res.error;
        }
      }
    } else if (r.channel === "email") {
      if (!r.customer_email) status = "no_target";
      else {
        const res = await senders.sendEmail({ to: r.customer_email, ...reminderEmail(data) });
        status = res.ok ? (res.dryRun ? "dry_run" : "sent") : "failed";
        detail = res.error ?? null;
      }
    } else {
      const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("appointment_id", r.appointment_id);
      const msg = reminderMessage(data);
      const results: PushSendResult[] = [];
      for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
        const res = await senders.sendPush(sub, { ...msg, appointmentId: r.appointment_id, tag: `lembrete-${r.appointment_id}-${r.kind}` });
        results.push(res);
        if (res === "gone") {
          await db.from("push_subscriptions").delete().eq("id", sub.id);
          summary.removedSubscriptions++;
        }
      }
      if (!results.length || results.every((x) => x === "gone")) status = "no_target";
      else if (results.includes("sent")) status = "sent";
      else status = "failed";
    }

    if (status === "failed") {
      // Falha temporária: devolve para a próxima execução.
      await db.rpc("release_reminder", { p_reminder_id: r.reminder_id });
      summary.released++;
      summary.failed++;
    } else if (status === "sent" || status === "dry_run") {
      summary.sent++;
    }

    await db.from("notification_log").insert({
      appointment_id: r.appointment_id,
      reminder_id: r.reminder_id,
      channel: r.channel,
      kind: r.kind,
      status,
      detail,
    });
  }
  return summary;
}
