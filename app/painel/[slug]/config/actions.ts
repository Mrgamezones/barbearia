"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { shopTag } from "@/lib/data/public";
import { panelPath, shopPath } from "@/lib/paths";
import { normalizeBrazilPhone } from "@/lib/validation";

const text = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);
const httpsUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use um endereço completo começando com https://");

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da barbearia.").max(60),
  street: text(120),
  number: text(20),
  complement: text(60),
  district: text(80),
  city: text(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "Use a sigla do estado com 2 letras, ex.: BA."),
  postal_code: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || v.length === 8, "O CEP tem 8 números, ex.: 40000-000."),
  whatsapp: z.string().transform((v, ctx) => {
    if (!v.trim()) return "";
    const n = normalizeBrazilPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "WhatsApp inválido." });
      return z.NEVER;
    }
    return n;
  }),
  email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "E-mail inválido."),
  instagram_url: httpsUrl,
  about: text(400),
  hero_eyebrow: text(60),
  hero_title_line1: text(40),
  hero_title_line2: text(40),
  hero_subtitle: text(160),
  barber_name: text(60),
  barber_bio: text(160),
  barber_photo_url: httpsUrl,
});

export type SettingsInput = z.input<typeof schema>;
export type SettingsResult = { ok: true } | { ok: false; fields: Record<string, string> };

export async function saveSettings(slug: string, input: unknown): Promise<SettingsResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { ok: false, fields };
  }
  const { supabase, shop } = await requireAdmin(slug);
  const { error } = await supabase.from("shops").update(parsed.data).eq("id", shop.id);
  if (error) return { ok: false, fields: { form: "Não foi possível salvar." } };
  revalidateTag(shopTag(slug), { expire: 0 });
  revalidatePath(shopPath(slug), "layout");
  revalidatePath(panelPath(slug), "layout");
  return { ok: true };
}
