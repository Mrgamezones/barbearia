import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./email";
import { confirmationEmail, whatsappConfirmationParams, type ConfirmationData } from "./templates";
import { sendWhatsAppTemplate, type WhatsAppResult } from "./whatsapp";

/** Status gravado no notification_log para um resultado do WhatsApp. */
export function whatsAppLogStatus(r: WhatsAppResult): "sent" | "dry_run" | "failed" {
  return r.status === "sent" ? "sent" : r.status === "dry_run" ? "dry_run" : "failed";
}

export function whatsAppLogDetail(r: WhatsAppResult): string | null {
  return r.status === "sent" ? r.id : r.status === "dry_run" ? null : r.error;
}

/**
 * Executado após um agendamento ser criado (site ou painel): envia a confirmação por e-mail
 * (quando informado) e por WhatsApp (quando há consentimento), em paralelo.
 * Falhas não impedem o agendamento nem afetam o outro canal.
 */
export async function afterBookingCreated(appointmentId: string, token: string): Promise<void> {
  try {
    const db = createAdminClient();
    const [{ data: a }, { data: settings }] = await Promise.all([
      db
        .from("appointments")
        .select("customer_name,customer_email,customer_phone,whatsapp_opt_in,starts_at,total_cents,appointment_services(name_snapshot,price_cents_snapshot)")
        .eq("id", appointmentId)
        .single(),
      db.from("business_settings").select("name,address").eq("id", 1).single(),
    ]);
    if (!a) return;

    const data: ConfirmationData = {
      businessName: settings?.name ?? "Barbearia",
      address: settings?.address ?? "",
      customerName: a.customer_name,
      startsAt: a.starts_at,
      totalCents: a.total_cents,
      services: (a.appointment_services ?? []).map((s: { name_snapshot: string; price_cents_snapshot: number }) => ({
        name: s.name_snapshot,
        price_cents: s.price_cents_snapshot,
      })),
      manageUrl: `${siteUrl()}/agendamento/${encodeURIComponent(token)}`,
    };

    const tasks: Promise<unknown>[] = [];

    if (a.customer_email) {
      tasks.push(
        (async () => {
          const result = await sendEmail({ to: a.customer_email, ...confirmationEmail(data) });
          await db.from("notification_log").insert({
            appointment_id: appointmentId,
            channel: "email",
            kind: "confirmation",
            status: result.ok ? (result.dryRun ? "dry_run" : "sent") : "failed",
            detail: result.ok ? (result.id ?? null) : result.error,
          });
        })(),
      );
    }

    if (a.whatsapp_opt_in && a.customer_phone) {
      tasks.push(
        (async () => {
          const result = await sendWhatsAppTemplate({ to: a.customer_phone, template: "agendamento_confirmado", params: whatsappConfirmationParams(data) });
          await db.from("notification_log").insert({
            appointment_id: appointmentId,
            channel: "whatsapp",
            kind: "confirmation",
            status: whatsAppLogStatus(result),
            detail: whatsAppLogDetail(result),
          });
        })(),
      );
    }

    const results = await Promise.allSettled(tasks);
    for (const r of results) if (r.status === "rejected") console.error("[after-booking] falha ao enviar confirmação", r.reason);
  } catch (e) {
    console.error("[after-booking] falha ao enviar confirmação", e);
  }
}
