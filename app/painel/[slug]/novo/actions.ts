"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BOOKING_ERROR_MESSAGES, type BookingErrorCode } from "@/lib/booking-errors";
import { requireAdmin } from "@/lib/admin/auth";
import { afterBookingCreated } from "@/lib/notifications/after-booking";
import { panelPath } from "@/lib/paths";
import { bookingSchema, fieldErrors } from "@/lib/validation";

export async function adminFetchSlots(slug: string, date: string, totalMinutes: number): Promise<string[]> {
  const p = z.tuple([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.number().int().positive().max(600)]).parse([date, totalMinutes]);
  const { supabase, shop } = await requireAdmin(slug);
  const { data, error } = await supabase.rpc("admin_available_slots", { p_shop_id: shop.id, p_date: p[0], p_total_minutes: p[1] });
  if (error) throw new Error("Falha ao carregar horários");
  return (data as { slot: string }[]).map((r) => new Date(r.slot).toISOString());
}

export type AdminCreateResult = { ok: true; id: string } | { ok: false; message: string; fields?: Record<string, string> };

export async function adminCreateBooking(slug: string, input: unknown): Promise<AdminCreateResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Confira os campos.", fields: fieldErrors(parsed.error) };
  const { supabase, shop } = await requireAdmin(slug);
  const b = parsed.data;
  const { data, error } = await supabase.rpc("admin_create_booking", {
    p_shop_id: shop.id,
    p_service_ids: b.serviceIds,
    p_starts_at: b.startsAt,
    p_name: b.name,
    p_phone: b.phone,
    p_email: b.email ?? null,
    p_whatsapp_opt_in: b.whatsappOptIn,
  });
  if (error) return { ok: false, message: BOOKING_ERROR_MESSAGES.unknown };
  const r = data as { ok: boolean; error?: BookingErrorCode; id?: string; token?: string };
  if (!r.ok || !r.id || !r.token) return { ok: false, message: BOOKING_ERROR_MESSAGES[r.error ?? "unknown"] };
  await afterBookingCreated(r.id, r.token);
  revalidatePath(panelPath(slug));
  return { ok: true, id: r.id };
}
