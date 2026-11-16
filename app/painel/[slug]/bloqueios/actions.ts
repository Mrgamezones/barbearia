"use server";

import { fromZonedTime } from "date-fns-tz";
import { addDays, format, parse } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { panelPath } from "@/lib/paths";

const schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    fullDay: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    reason: z.string().trim().max(120).optional(),
  })
  .superRefine((v, ctx) => {
    if (!v.fullDay && (!v.startTime || !v.endTime)) ctx.addIssue({ code: "custom", message: "Informe o horário de início e fim." });
  });

export type AffectedAppointment = { id: string; customer_name: string; starts_at: string };
export type CreateBlockResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; needsConfirmation: true; affected: AffectedAppointment[] };

/** Converte o formulário em intervalo UTC [início, fim). */
function toRange(v: z.output<typeof schema>, tz: string) {
  if (v.fullDay) {
    const last = v.endDate && v.endDate >= v.date ? v.endDate : v.date;
    const end = format(addDays(parse(last, "yyyy-MM-dd", new Date()), 1), "yyyy-MM-dd");
    return { starts_at: fromZonedTime(`${v.date}T00:00:00`, tz), ends_at: fromZonedTime(`${end}T00:00:00`, tz) };
  }
  return {
    starts_at: fromZonedTime(`${v.date}T${v.startTime}:00`, tz),
    ends_at: fromZonedTime(`${v.date}T${v.endTime}:00`, tz),
  };
}

/**
 * Cria um bloqueio. Se houver agendamentos ativos no período e `confirmed` for falso,
 * não salva e devolve a lista para o administrador confirmar. Agendamentos não são cancelados.
 */
export async function createBlock(slug: string, input: unknown, confirmed: boolean): Promise<CreateBlockResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { supabase, shop } = await requireAdmin(slug);
  const { starts_at, ends_at } = toRange(parsed.data, shop.timezone);
  if (starts_at >= ends_at) return { ok: false, error: "O fim deve ser depois do início." };

  const { data: affected, error: qError } = await supabase
    .from("appointments")
    .select("id,customer_name,starts_at")
    .eq("shop_id", shop.id)
    .neq("status", "cancelled")
    .lt("starts_at", ends_at.toISOString())
    .gt("ends_at", starts_at.toISOString())
    .order("starts_at");
  if (qError) return { ok: false, error: "Não foi possível verificar a agenda." };
  if (affected.length && !confirmed) return { ok: false, needsConfirmation: true, affected };

  const { error } = await supabase.from("schedule_blocks").insert({
    shop_id: shop.id,
    starts_at: starts_at.toISOString(),
    ends_at: ends_at.toISOString(),
    reason: parsed.data.reason || null,
  });
  if (error) return { ok: false, error: "Não foi possível salvar o bloqueio." };
  revalidatePath(panelPath(slug, "bloqueios"));
  return { ok: true };
}

export async function deleteBlock(slug: string, id: string): Promise<{ ok: boolean }> {
  const { supabase, shop } = await requireAdmin(slug);
  const { error } = await supabase.from("schedule_blocks").delete().eq("id", z.uuid().parse(id)).eq("shop_id", shop.id);
  revalidatePath(panelPath(slug, "bloqueios"));
  return { ok: !error };
}
