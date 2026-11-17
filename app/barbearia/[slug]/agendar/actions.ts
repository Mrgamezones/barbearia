"use server";

import { headers } from "next/headers";
import type { BookingErrorCode } from "@/lib/booking-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingSchema, fieldErrors, slugSchema } from "@/lib/validation";
import { afterBookingCreated } from "@/lib/notifications/after-booking";
import { notifyShopAdmins } from "@/lib/notifications/shop-alert";

export type CreateBookingResult =
  | { ok: true; token: string }
  | { ok: false; error: BookingErrorCode; fields?: Record<string, string> };

/** Limites por IP: 5 agendamentos a cada 10 minutos. */
const RATE_LIMIT = { max: 5, windowSeconds: 600 };

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

export async function createBooking(shopSlug: string, input: unknown): Promise<CreateBookingResult> {
  const slug = slugSchema.safeParse(shopSlug);
  if (!slug.success) return { ok: false, error: "unknown" };
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_data", fields: fieldErrors(parsed.error) };

  const db = createAdminClient();
  const ip = await clientIp();
  const { data: allowed, error: rlError } = await db.rpc("hit_rate_limit", {
    // Por barbearia: o limite de uma não bloqueia clientes de outra.
    p_key: `booking:${slug.data}:${ip}`,
    p_limit: RATE_LIMIT.max,
    p_window_seconds: RATE_LIMIT.windowSeconds,
  });
  if (rlError) return { ok: false, error: "unknown" };
  if (!allowed) return { ok: false, error: "rate_limited" };

  const b = parsed.data;
  const { data, error } = await db.rpc("create_booking", {
    p_shop_slug: slug.data,
    p_service_ids: b.serviceIds,
    p_starts_at: b.startsAt,
    p_name: b.name,
    p_phone: b.phone,
    p_email: b.email ?? null,
    p_whatsapp_opt_in: b.whatsappOptIn,
  });
  if (error) return { ok: false, error: "unknown" };

  const result = data as { ok: boolean; error?: BookingErrorCode; id?: string; token?: string };
  if (!result.ok || !result.token || !result.id) return { ok: false, error: result.error ?? "unknown" };

  // Confirmação ao cliente e aviso ao dono em paralelo; nenhum dos dois lança erro.
  await Promise.allSettled([afterBookingCreated(result.id, result.token), notifyShopAdmins(result.id, "booked")]);
  return { ok: true, token: result.token };
}
