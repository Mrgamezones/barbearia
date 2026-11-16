// Cria (ou atualiza a senha de) um usuário e o vincula como dono de uma barbearia.
// Uso: node --env-file=.env.local scripts/create-admin.mjs <slug-da-barbearia> <email> <senha>
// Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "@supabase/supabase-js";

const [slug, email, password] = process.argv.slice(2);
if (!slug || !email || !password || password.length < 8) {
  console.error("Uso: node --env-file=.env.local scripts/create-admin.mjs <slug-da-barbearia> <email> <senha com 8+ caracteres>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: shop, error: shopError } = await db.from("shops").select("id,name").eq("slug", slug).maybeSingle();
if (shopError) throw shopError;
if (!shop) {
  console.error(`Barbearia "${slug}" não encontrada. Cadastre-a antes com scripts/create-shop.mjs.`);
  process.exitCode = 1;
} else {
  await grantAccess(shop);
}

async function findUser(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u || data.users.length < 200) return u;
  }
}

async function grantAccess(shop) {
  let user = await findUser(email);
  if (user) {
    const { error } = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (error) throw error;
    console.log(`Usuário existente atualizado: ${email}`);
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    user = data.user;
    console.log(`Usuário criado: ${email}`);
  }

  const { error } = await db.from("shop_admins").upsert({ shop_id: shop.id, user_id: user.id });
  if (error) throw error;
  console.log(`Acesso ao painel de "${shop.name}" concedido: /painel/${slug}`);
}

