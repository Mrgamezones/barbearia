import "server-only";
import { siteUrl } from "@/lib/env";
import { formatAddress } from "@/lib/format";
import { bookingPath } from "@/lib/paths";
import type { ShopAddress } from "@/lib/types";
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

/** Barbearia do agendamento, lida junto com ele (embed do PostgREST). */
export type AppointmentShop = ShopAddress & { slug: string; name: string; notifications_enabled: boolean };

/**
 * Executado após um agendamento ser criado (site ou painel): envia a confirmação por e-mail
 * (quando informado) e por WhatsApp (quando há consentimento), em paralelo.
 * Falhas não impedem o agendamento nem afetam o outro canal.
 * Barbearia com notificações desligadas (demonstração): nada é enviado, só registrado como `skipped`.
 */
export async function afterBookingCreated(appointmentId: string, token: string): Promise<void> {
  try {
    const db = createAdminClient();
    const { data: a } = await db
      .from("appointments")
      .select(
        "customer_name,customer_email,customer_phone,whatsapp_opt_in,starts_at,total_cents,appointment_services(name_snapshot,price_cents_snapshot),shops(slug,name,street,number,complement,district,city,state,postal_code,notifications_enabled)",
      )
      .eq("id", appointmentId)
      .single();
    if (!a) return;
    const shop = a.shops as unknown as AppointmentShop;

    if (!shop.notifications_enabled) {
      const channels = [a.customer_email ? "email" : null, a.whatsapp_opt_in && a.customer_phone ? "whatsapp" : null].filter(Boolean);
      if (channels.length) {
        await db.from("notification_log").insert(
          channels.map((channel) => ({ appointment_id: appointmentId, channel, kind: "confirmation", status: "skipped", detail: "notificações desligadas" })),
        );
      }
      return;
    }

    const data: ConfirmationData = {
      businessName: shop.name,
      address: formatAddress(shop),
      customerName: a.customer_name,
      startsAt: a.starts_at,
      totalCents: a.total_cents,
      services: (a.appointment_services ?? []).map((s: { name_snapshot: string; price_cents_snapshot: number }) => ({
        name: s.name_snapshot,
        price_cents: s.price_cents_snapshot,
      })),
      manageUrl: `${siteUrl()}${bookingPath(shop.slug, token)}`,
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
