"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { afterBookingCancelled } from "@/lib/notifications/after-cancel";
import { createPublicClient } from "@/lib/supabase/public";

export type CancelResult = { ok: true } | { ok: false; error: "not_found" | "not_cancellable" | "too_late" | "unknown" };

export async function cancelBooking(token: string): Promise<CancelResult> {
  const t = z.string().min(20).max(200).safeParse(token);
  if (!t.success) return { ok: false, error: "not_found" };
  const { data, error } = await createPublicClient().rpc("cancel_booking_by_token", { p_token: t.data });
  if (error) return { ok: false, error: "unknown" };
  const r = data as CancelResult & { appointment_id?: string };
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(`/agendamento/${encodeURIComponent(t.data)}`);
  if (r.appointment_id) await afterBookingCancelled(r.appointment_id, "client");
  return { ok: true };
}
