"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { shopTag } from "@/lib/data/public";
import { panelPath, shopPath } from "@/lib/paths";
import { parseBRL } from "@/lib/money";

export type ActionResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

function refresh(slug: string) {
  revalidateTag(shopTag(slug), { expire: 0 });
  revalidatePath(panelPath(slug, "servicos"));
  revalidatePath(shopPath(slug), "layout");
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

export async function saveService(slug: string, input: unknown): Promise<ActionResult> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { ok: false, error: "Confira os campos.", fields };
  }
  const { supabase, shop } = await requireAdmin(slug);
  const s = parsed.data;
  const row = { name: s.name, description: s.description, price_cents: s.price, duration_min: s.duration, is_combo: s.is_combo };

  if (s.id) {
    const { error } = await supabase.from("services").update(row).eq("id", s.id).eq("shop_id", shop.id);
    if (error) return { ok: false, error: "Não foi possível salvar." };
  } else {
    const { data: last } = await supabase
      .from("services")
      .select("sort_order")
      .eq("shop_id", shop.id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("services").insert({ ...row, shop_id: shop.id, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { ok: false, error: "Não foi possível criar o serviço." };
  }
  refresh(slug);
  return { ok: true };
}

export async function setServiceActive(slug: string, id: string, active: boolean): Promise<ActionResult> {
  const { supabase, shop } = await requireAdmin(slug);
  const { error } = await supabase.from("services").update({ active }).eq("id", z.uuid().parse(id)).eq("shop_id", shop.id);
  if (error) return { ok: false, error: "Não foi possível atualizar." };
  refresh(slug);
  return { ok: true };
}

/** Troca a posição do serviço com o vizinho acima/abaixo. */
export async function moveService(slug: string, id: string, direction: "up" | "down"): Promise<ActionResult> {
  const { supabase, shop } = await requireAdmin(slug);
  const { data } = await supabase.from("services").select("id,sort_order").eq("shop_id", shop.id).order("sort_order").order("name");
  const list = data ?? [];
  const i = list.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  // Renumera para garantir ordens distintas e troca as duas posições.
  const order = list.map((s) => s.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [index, sid] of order.entries()) {
    const { error } = await supabase.from("services").update({ sort_order: (index + 1) * 10 }).eq("id", sid).eq("shop_id", shop.id);
    if (error) return { ok: false, error: "Não foi possível reordenar." };
  }
  refresh(slug);
  return { ok: true };
}

/** Exclui apenas serviços sem agendamentos; os demais devem ser desativados. */
export async function deleteService(slug: string, id: string): Promise<ActionResult> {
  const { supabase, shop } = await requireAdmin(slug);
  const { error } = await supabase.from("services").delete().eq("id", z.uuid().parse(id)).eq("shop_id", shop.id);
  if (error) {
    if (error.code === "23503") return { ok: false, error: "Este serviço já tem agendamentos e não pode ser excluído. Desative-o." };
    return { ok: false, error: "Não foi possível excluir." };
  }
  refresh(slug);
  return { ok: true };
}
