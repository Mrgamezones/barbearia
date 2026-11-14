"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { PUBLIC_DATA_TAG } from "@/lib/data/public";
import { normalizeBrazilPhone } from "@/lib/validation";

const text = (max: number) => z.string().trim().max(max, `Use no máximo ${max} caracteres.`);
const httpsUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Use um endereço completo começando com https://");

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da barbearia.").max(60),
  address: text(200),
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

export async function saveSettings(input: unknown): Promise<SettingsResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] ??= i.message;
    return { ok: false, fields };
  }
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("business_settings").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, fields: { form: "Não foi possível salvar." } };
  revalidateTag(PUBLIC_DATA_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  return { ok: true };
}
