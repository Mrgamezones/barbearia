import { expect, type Page } from "@playwright/test";
import { adminDb } from "./db";
import { panel, shopId } from "./shop";

export const ADMIN = { email: "admin-e2e@barbearia.local", password: "admin-e2e-senha-123" };
export const COMMON = { email: "comum-e2e@barbearia.local", password: "comum-e2e-senha-123" };

async function ensureUser(email: string, password: string, isAdmin: boolean) {
  const db = adminDb();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = data.users.find((u) => u.email === email);
  if (!user) {
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) {
      // Outro arquivo de teste rodando em paralelo pode ter criado o mesmo usuário agora.
      const again = await db.auth.admin.listUsers({ perPage: 1000 });
      user = again.data.users.find((u) => u.email === email);
      if (!user) throw created.error;
    } else user = created.data.user;
  }
  // ADMIN é dono só da barbearia de teste; COMMON não tem barbearia.
  await db.from("shop_admins").delete().eq("user_id", user.id);
  if (isAdmin) await db.from("shop_admins").insert({ shop_id: await shopId(), user_id: user.id });
}

export async function ensureTestUsers() {
  await ensureUser(ADMIN.email, ADMIN.password, true);
  await ensureUser(COMMON.email, COMMON.password, false);
}

export async function login(page: Page, who = ADMIN, next = panel()) {
  await page.goto(`/painel/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Senha").fill(who.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/painel\/login/);
}
