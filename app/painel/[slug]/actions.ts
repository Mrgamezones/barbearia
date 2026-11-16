"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { afterBookingCancelled } from "@/lib/notifications/after-cancel";
import { panelPath } from "@/lib/paths";

const statusSchema = z.enum(["confirmed", "completed", "no_show", "cancelled"]);

export async function updateAppointmentStatus(slug: string, id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({ id: z.uuid(), status: statusSchema }).safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "Dados inválidos." };
  const { supabase, shop } = await requireAdmin(slug);

  if (parsed.data.status === "cancelled") {
    // Transição confirmado → cancelado numa única operação: só ela gera aviso ao cliente.
    const { data: cancelled, error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", parsed.data.id)
      .eq("shop_id", shop.id)
      .eq("status", "confirmed")
      .select("id");
    if (error) return { ok: false, error: "Não foi possível atualizar o status." };
    if (cancelled?.length) {
      revalidatePath(panelPath(slug), "layout");
      await afterBookingCancelled(parsed.data.id, "admin");
      return { ok: true };
    }
    // Não estava confirmado (concluído, não compareceu ou já cancelado): atualiza sem aviso.
  }

  const { error } = await supabase.from("appointments").update({ status: parsed.data.status }).eq("id", parsed.data.id).eq("shop_id", shop.id);
  if (error) {
    // Reativar um cancelado pode colidir com outro agendamento no mesmo horário.
    if (error.code === "23P01") return { ok: false, error: "Já existe outro agendamento nesse horário." };
    return { ok: false, error: "Não foi possível atualizar o status." };
  }
  revalidatePath(panelPath(slug), "layout");
  return { ok: true };
}
