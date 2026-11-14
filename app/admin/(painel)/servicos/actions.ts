"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { PUBLIC_DATA_TAG } from "@/lib/data/public";
import { parseBRL } from "@/lib/money";

export type ActionResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

function refresh() {
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
  revalidatePath("/admin/servicos");
  revalidatePath("/", "layout");
}

const serviceSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1, "Informe o nome."),
  description: z.string().trim().max(300, "Máximo de 300 caracteres.").default(""),
  price: z.string().transform((v, ctx) => {
    const cents = parseBRL(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Preço inválido. Ex.: 45,00" });
      return z.NEVER;
    }
    return cents;
  }),
  duration: z.coerce
    .number({ message: "Informe a duração." })
    .int()
    .refine((n) => n > 0 && n % 5 === 0, "A duração deve ser múltiplo de 5 e maior que zero."),
  is_combo: z.boolean().default(false),
});

export async function saveService(input: unknown): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Confira os campos.", fields };
  }
  const { supabase } = await requireAdmin();
  const s = parsed.data;
  const row = { name: s.name, description: s.description, price_cents: s.price, duration_min: s.duration, is_combo: s.is_combo };

  if (s.id) {
    const { error } = await supabase.from("services").update(row).eq("id", s.id);
    if (error) return { ok: false, error: "Não foi possível salvar." };
  } else {
    const { data: last } = await supabase.from("services").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("services").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { ok: false, error: "Não foi possível criar o serviço." };
  }
  refresh();
  return { ok: true };
}

export async function setServiceActive(id: string, active: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("services").update({ active }).eq("id", z.uuid().parse(id));
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  refresh();
  return { ok: true };
}

/** Troca a posição do serviço com o vizinho acima/abaixo. */
export async function moveService(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").select("id,sort_order").order("sort_order").order("name");
  const list = data ?? [];
  const i = list.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // Renumera para garantir ordens distintas e troca as duas posições.
  const order = list.map((s) => s.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [index, sid] of order.entries()) {
    const { error } = await supabase.from("services").update({ sort_order: (index + 1) * 10 }).eq("id", sid);
    if (error) return { ok: false, error: "Não foi possível reordenar." };
  }
  refresh();
  return { ok: true };
}

/** Exclui apenas serviços sem agendamentos; os demais devem ser desativados. */
export async function deleteService(id: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("services").delete().eq("id", z.uuid().parse(id));
  if (error) {
    if (error.code === "23503") return { ok: false, error: "Este serviço já tem agendamentos e não pode ser excluído. Desative-o." };
    return { ok: false, error: "Não foi possível excluir." };
  }
  refresh();
  return { ok: true };
}
