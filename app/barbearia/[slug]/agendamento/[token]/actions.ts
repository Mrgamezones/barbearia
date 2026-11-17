"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { afterBookingCancelled } from "@/lib/notifications/after-cancel";
import { notifyShopAdmins } from "@/lib/notifications/shop-alert";
import { bookingPath } from "@/lib/paths";
import { createPublicClient } from "@/lib/supabase/public";
import { slugSchema } from "@/lib/validation";

export type CancelResult = { ok: true } | { ok: false; error: "not_found" | "not_cancellable" | "too_late" | "unknown" };

export async function cancelBooking(shopSlug: string, token: string): Promise<CancelResult> {
  const s = slugSchema.safeParse(shopSlug);
  const t = z.string().min(20).max(200).safeParse(token);
  if (!s.success || !t.success) return { ok: false, error: "not_found" };
  const { data, error } = await createPublicClient().rpc("cancel_booking_by_token", { p_shop_slug: s.data, p_token: t.data });
  if (error) return { ok: false, error: "unknown" };
  const r = data as CancelResult & { appointment_id?: string };
  if (!r.ok) return { ok: false, error: r.error };
  revalidatePath(bookingPath(s.data, t.data));
  if (r.appointment_id) {
    await Promise.allSettled([afterBookingCancelled(r.appointment_id, "client"), notifyShopAdmins(r.appointment_id, "cancelled_by_client")]);
  }
  return { ok: true };
}
