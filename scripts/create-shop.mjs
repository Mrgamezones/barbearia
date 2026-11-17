#!/usr/bin/env node
// Cadastra uma barbearia nova (dados, horário, serviços e login do dono) a partir de um arquivo JSON.
// Uso: node --env-file=.env.local scripts/create-shop.mjs supabase/shops/<slug>.json
// Modelo do arquivo: supabase/shops/demir-barbershop.example.json
// Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Tudo é gravado numa transação (provision_shop):
// se algo falhar, nada fica no banco e o usuário do dono criado agora é removido.
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const WEEKDAYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const time = z.string().regex(/^\d{2}:\d{2}$/, "use HH:MM, ex.: 08:00");
const text = (max) => z.string().trim().max(max).default("");
const httpsUrl = z.string().trim().refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "use um link começando com https://").default("");

/** "+55 (71) 99999-8888", "71999998888" → "+5571999998888" (mesma regra do banco). */
function phone(v, ctx) {
  if (!v.trim()) return "";
  let d = v.replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  const e164 = `+${d}`;
  if (!/^\+55[1-9][0-9][2-9][0-9]{7,8}$/.test(e164)) {
    ctx.addIssue({ code: "custom", message: "WhatsApp inválido (DDD + número)" });
    return z.NEVER;
  }
  return e164;
}

const hourSchema = z
  .object({
    dia: z.enum(WEEKDAYS, { message: `use um destes: ${WEEKDAYS.join(", ")}` }),
    abre: time,
    fecha: time,
    intervalo_inicio: time.optional(),
    intervalo_fim: time.optional(),
  })
  .refine((h) => h.abre < h.fecha, "a abertura deve ser antes do fechamento")
  .refine((h) => !!h.intervalo_inicio === !!h.intervalo_fim, "informe início e fim do intervalo, ou nenhum")
  .refine(
    (h) => !h.intervalo_inicio || (h.intervalo_inicio < h.intervalo_fim && h.intervalo_inicio >= h.abre && h.intervalo_fim <= h.fecha),
    "o intervalo deve ficar dentro do horário de funcionamento",
  );

const serviceSchema = z.object({
  nome: z.string().trim().min(1).max(80),
  descricao: text(300),
  preco: z.number().nonnegative("o preço não pode ser negativo"),
  duracao_min: z
    .number()
    .int()
    .refine((n) => n > 0 && n % 5 === 0, "a duração deve ser múltipla de 5 minutos"),
  combo: z.boolean().default(false),
});

export const shopFileSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "use letras minúsculas sem acento, números e hífens"),
  nome: z.string().trim().min(2).max(60),
  endereco: z
    .object({
      logradouro: text(120),
      numero: text(20),
      complemento: text(60),
      bairro: text(80),
      cidade: text(80),
      uf: z
        .string()
        .trim()
        .toUpperCase()
        .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), "use a sigla com 2 letras")
        .default(""),
      cep: z
        .string()
        .transform((v) => v.replace(/\D/g, ""))
        .refine((v) => v === "" || v.length === 8, "o CEP tem 8 números")
        .default(""),
    })
    .default({}),
  whatsapp: z.string().default("").transform(phone),
  email: z.string().trim().refine((v) => v === "" || z.email().safeParse(v).success, "e-mail inválido").default(""),
  instagram: httpsUrl,
  sobre: text(400),
  pagina_inicial: z
    .object({ destaque: text(60), titulo_linha1: text(40), titulo_linha2: text(40), subtitulo: text(160) })
    .default({}),
  barbeiro: z.object({ nome: text(60), bio: text(160), foto: httpsUrl }).default({}),
  horarios: z.array(hourSchema).min(1, "informe pelo menos um dia de atendimento"),
  // De quantos em quantos minutos a agenda oferece horários, a partir da abertura (ex.: 40 → 8h, 8h40, 9h20).
  intervalo_agenda_min: z
    .number()
    .int()
    .refine((n) => n >= 5 && n <= 120 && n % 5 === 0, "o intervalo da agenda vai de 5 a 120 minutos, múltiplo de 5")
    .default(15),
  servicos: z.array(serviceSchema).min(1, "informe pelo menos um serviço"),
  dono: z.object({
    email: z.email("e-mail do dono inválido"),
    senha: z.string().min(8, "a senha precisa de 8+ caracteres").optional(),
  }),
  demonstracao: z.boolean().default(false),
});

/** Arquivo validado → payload de public.provision_shop (sem o dono). */
export function toProvisionPayload(f) {
  return {
    slug: f.slug,
    name: f.nome,
    street: f.endereco.logradouro,
    number: f.endereco.numero,
    complement: f.endereco.complemento,
    district: f.endereco.bairro,
    city: f.endereco.cidade,
    state: f.endereco.uf,
    postal_code: f.endereco.cep,
    whatsapp: f.whatsapp,
    email: f.email,
    instagram_url: f.instagram,
    about: f.sobre,
    hero_eyebrow: f.pagina_inicial.destaque,
    hero_title_line1: f.pagina_inicial.titulo_linha1,
    hero_title_line2: f.pagina_inicial.titulo_linha2,
    hero_subtitle: f.pagina_inicial.subtitulo,
    barber_name: f.barbeiro.nome,
    barber_bio: f.barbeiro.bio,
    barber_photo_url: f.barbeiro.foto,
    is_demo: f.demonstracao,
    notifications_enabled: !f.demonstracao,
    hours: f.horarios.map((h) => ({
      weekday: WEEKDAYS.indexOf(h.dia),
      is_open: true,
      open_time: h.abre,
      close_time: h.fecha,
      break_start: h.intervalo_inicio ?? null,
      break_end: h.intervalo_fim ?? null,
    })),
    services: f.servicos.map((s) => ({
      name: s.nome,
      description: s.descricao,
      price_cents: Math.round(s.preco * 100),
      duration_min: s.duracao_min,
      is_combo: s.combo,
    })),
  };
}

/** Mensagens de validação legíveis: "servicos.2.duracao_min: a duração deve ser múltipla de 5 minutos". */
export function formatIssues(error) {
  return error.issues.map((i) => `  - ${i.path.join(".") || "(arquivo)"}: ${i.message}`).join("\n");
}

async function findUser(db, email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u || data.users.length < 200) return u;
  }
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Uso: node --env-file=.env.local scripts/create-shop.mjs supabase/shops/<slug>.json");
    return 1;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    return 1;
  }

  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.error(`Não foi possível ler ${file}: ${e.message}`);
    return 1;
  }
  const parsed = shopFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`✖ Arquivo com problemas, nada foi gravado:\n${formatIssues(parsed.error)}`);
    return 1;
  }
  const f = parsed.data;
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: existing, error: slugError } = await db.from("shops").select("id").eq("slug", f.slug).maybeSingle();
  if (slugError) throw slugError;
  if (existing) {
    console.error(`✖ Já existe uma barbearia com o endereço "${f.slug}". Nada foi alterado.`);
    return 1;
  }

  // Dono: reaproveita o usuário se o e-mail já existir (um dono pode ter várias barbearias).
  let user = await findUser(db, f.dono.email);
  let createdUser = false;
  let password = f.dono.senha;
  if (!user) {
    password ??= randomBytes(9).toString("base64url");
    const { data, error } = await db.auth.admin.createUser({ email: f.dono.email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    createdUser = true;
  } else if (password) {
    const { error } = await db.auth.admin.updateUserById(user.id, { password });
    if (error) throw error;
  }

  const { error } = await db.rpc("provision_shop", { p: { ...toProvisionPayload(f), owner_user_id: user.id } });
  if (error) {
    if (createdUser) await db.auth.admin.deleteUser(user.id);
    console.error(`✖ O banco recusou o cadastro, nada foi gravado: ${error.message}`);
    return 1;
  }
  if (f.intervalo_agenda_min !== 15) {
    const { error: stepError } = await db.from("shops").update({ slot_interval_minutes: f.intervalo_agenda_min }).eq("slug", f.slug);
    if (stepError) {
      console.error(
        `✖ Barbearia criada, mas o intervalo da agenda ficou em 15 min: ${stepError.message}
` +
          `  Corrija no SQL Editor: update shops set slot_interval_minutes = ${f.intervalo_agenda_min} where slug = '${f.slug}';`,
      );
      return 1;
    }
  }

  const site = (process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  console.log(`✓ ${f.nome} cadastrada.`);
  console.log(`  Site:   ${site}/barbearia/${f.slug}`);
  console.log(`  Painel: ${site}/painel/${f.slug}`);
  console.log(`  Login:  ${f.dono.email}${createdUser && !f.dono.senha ? ` · senha provisória: ${password} (guarde e envie ao dono)` : ""}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
