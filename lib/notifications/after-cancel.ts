import "server-only";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { whatsAppLogDetail, whatsAppLogStatus } from "./after-booking";
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
    const [{ data: a }, { data: settings }] = await Promise.all([
      db.from("appointments").select("customer_name,customer_phone,whatsapp_opt_in,starts_at").eq("id", appointmentId).single(),
      db.from("business_settings").select("name").eq("id", 1).single(),
    ]);
    if (!a || !a.whatsapp_opt_in || !a.customer_phone) return;

    const kind = by === "admin" ? "cancelled_admin" : "cancelled_client";
    const { data: logId, error: claimError } = await db.rpc("claim_notification", {
      p_appointment_id: appointmentId,
      p_channel: "whatsapp",
      p_kind: kind,
    });
    if (claimError) throw claimError;
    if (logId === null || logId === undefined) return; // aviso já enviado antes

    const data = {
      businessName: settings?.name ?? "Barbearia",
      customerName: a.customer_name,
      startsAt: a.starts_at,
      bookUrl: `${siteUrl()}/agendar`,
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
