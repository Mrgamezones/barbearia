"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { PUBLIC_DATA_TAG } from "@/lib/data/public";
import { WEEKDAYS } from "@/lib/hours";

const time = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/)
  .transform((v) => v.slice(0, 5))
  .or(z.literal("").transform(() => null))
  .nullable();

const rowSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  is_open: z.boolean(),
  open_time: time,
  close_time: time,
  break_start: time,
  break_end: time,
});

export type HoursRow = z.input<typeof rowSchema>;
export type SaveHoursResult = { ok: true } | { ok: false; errors: Record<number, string> };

/** Valida as regras de um dia; retorna a mensagem de erro ou null. */
function validateDay(r: z.output<typeof rowSchema>): string | null {
  if (!r.is_open) return null;
  if (!r.open_time || !r.close_time) return "Informe abertura e fechamento.";
  if (r.open_time >= r.close_time) return "A abertura deve ser antes do fechamento.";
  if (!!r.break_start !== !!r.break_end) return "Informe início e fim do intervalo, ou deixe ambos vazios.";
  if (r.break_start && r.break_end) {
    if (r.break_start >= r.break_end) return "O intervalo deve começar antes de terminar.";
    if (r.break_start < r.open_time || r.break_end > r.close_time) return "O intervalo deve estar dentro do horário de funcionamento.";
  }
  return null;
}

export async function saveHours(input: unknown): Promise<SaveHoursResult> {
  const rows = z.array(rowSchema).length(7).parse(input);
  const errors: Record<number, string> = {};
  for (const r of rows) {
    const e = validateDay(r);
    if (e) errors[r.weekday] = `${WEEKDAYS[r.weekday]}: ${e}`;
  }
  if (Object.keys(errors).length) return { ok: false, errors };

  const { supabase } = await requireAdmin();
  const payload = rows.map((r) =>
    r.is_open ? r : { weekday: r.weekday, is_open: false, open_time: null, close_time: null, break_start: null, break_end: null },
  );
  const { error } = await supabase.from("business_hours").upsert(payload, { onConflict: "weekday" });
  if (error) return { ok: false, errors: { [-1]: "Não foi possível salvar." } };
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return { ok: true };
}
