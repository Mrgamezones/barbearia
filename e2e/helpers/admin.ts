import { expect, type Page } from "@playwright/test";
import { adminDb } from "./db";

export const ADMIN = { email: "admin-e2e@barbearia.local", password: "admin-e2e-senha-123" };
export const COMMON = { email: "comum-e2e@barbearia.local", password: "comum-e2e-senha-123" };

async function ensureUser(email: string, password: string, isAdmin: boolean) {
  const db = adminDb();
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  let user = data.users.find((u) => u.email === email);
  if (!user) {
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    user = created.data.user;
  }
  if (isAdmin) await db.from("admins").upsert({ user_id: user.id });
  else await db.from("admins").delete().eq("user_id", user.id);
}

export async function ensureTestUsers() {
  await ensureUser(ADMIN.email, ADMIN.password, true);
  await ensureUser(COMMON.email, COMMON.password, false);
}

export async function login(page: Page, who = ADMIN, next = "/admin") {
  await page.goto(`/admin/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("E-mail").fill(who.email);
  await page.getByLabel("Senha").fill(who.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/admin\/login/);
}
