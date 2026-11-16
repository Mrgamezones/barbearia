import "server-only";
import { siteUrl } from "@/lib/env";
import { shopPath } from "@/lib/paths";
import { createAdminClient } from "@/lib/supabase/admin";
import { whatsAppLogDetail, whatsAppLogStatus, type AppointmentShop } from "./after-booking";
import { whatsappCancelledByAdminParams, whatsappCancelledByClientParams } from "./templates";
import { sendWhatsAppTemplate } from "./whatsapp";

export type CancelledBy = "admin" | "client";

/**
 * Avisa o cliente pelo WhatsApp que o agendamento foi cancelado (pela barbearia ou por ele mesmo).
 * O aviso é reservado antes do envio (claim_notification), então sai no máximo uma vez por agendamento.
 * Falhas são registradas e nunca lançam erro.
 */
export async function afterBookingCancelled(appointmentId: string, by: CancelledBy): Promise<void> {
  try {
    const db = createAdminClient();
    const { data: a } = await db
      .from("appointments")
      .select("customer_name,customer_phone,whatsapp_opt_in,starts_at,shops(slug,name,notifications_enabled)")
      .eq("id", appointmentId)
      .single();
    if (!a || !a.whatsapp_opt_in || !a.customer_phone) return;
    const shop = a.shops as unknown as Pick<AppointmentShop, "slug" | "name" | "notifications_enabled">;
    if (!shop.notifications_enabled) return; // demonstração: nenhum aviso

    const kind = by === "admin" ? "cancelled_admin" : "cancelled_client";
    const { data: logId, error: claimError } = await db.rpc("claim_notification", {
      p_appointment_id: appointmentId,
      p_channel: "whatsapp",
      p_kind: kind,
    });
    if (claimError) throw claimError;
    if (logId === null || logId === undefined) return; // aviso já enviado antes

    const data = {
      businessName: shop.name,
      customerName: a.customer_name,
      startsAt: a.starts_at,
      bookUrl: `${siteUrl()}${shopPath(shop.slug, "agendar")}`,
    };
    const result =
      by === "admin"
        ? await sendWhatsAppTemplate({ to: a.customer_phone, template: "agendamento_cancelado_barbearia", params: whatsappCancelledByAdminParams(data) })
        : await sendWhatsAppTemplate({ to: a.customer_phone, template: "agendamento_cancelado_cliente", params: whatsappCancelledByClientParams(data) });

    await db.from("notification_log").update({ status: whatsAppLogStatus(result), detail: whatsAppLogDetail(result) }).eq("id", logId);
  } catch (e) {
    console.error("[after-cancel] falha ao avisar cancelamento", e);
  }
}
