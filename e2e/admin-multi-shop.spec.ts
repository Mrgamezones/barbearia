import { expect, test } from "@playwright/test";
import { ADMIN, ensureTestUsers, login } from "./helpers/admin";
import { adminDb } from "./helpers/db";
import { DEMO, panel, SHOP_NAME, shopId, site } from "./helpers/shop";

// Painel por barbearia: login volta ao painel certo, outra barbearia é negada, várias barbearias listadas.
test.describe.configure({ mode: "serial" });
test.beforeAll(async () => ensureTestUsers());

test("sem login, o painel da barbearia leva ao login e volta para ele", async ({ page }) => {
  await page.goto(panel("horarios"));
  await expect(page).toHaveURL(/\/painel\/login\?next=%2Fpainel%2Fbarbearia-teste%2Fhorarios/);
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`${panel("horarios")}$`));
  await expect(page.getByRole("heading", { name: "Horário de funcionamento" })).toBeVisible();
});

test("\"Área do barbeiro\" no rodapé leva ao login com o nome da barbearia e ao painel dela", async ({ page }) => {
  await page.goto(site());
  await page.getByRole("contentinfo").getByRole("link", { name: "Área do barbeiro" }).click();
  await expect(page).toHaveURL(/\/painel\/login\?next=%2Fpainel%2Fbarbearia-teste$/);
  await expect(page.getByRole("heading", { name: `Entrar no painel da ${SHOP_NAME}` })).toBeVisible();
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(new RegExp(`${panel()}$`));
});

test("login com next de slug inexistente mostra a marca genérica", async ({ page }) => {
  await page.goto("/painel/login?next=%2Fpainel%2Fnao-existe");
  await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Agendamento online/ })).toBeVisible();
});

test("/painel leva direto à única barbearia do dono", async ({ page }) => {
  await login(page, ADMIN, "/painel");
  await expect(page).toHaveURL(new RegExp(`${panel()}$`));
  await expect(page.getByRole("banner").getByRole("link", { name: new RegExp(SHOP_NAME) })).toBeVisible();
});

test("painel de outra barbearia: acesso negado, sem dados dela", async ({ page }) => {
  await login(page, ADMIN, panel("", DEMO));
  await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  await expect(page.getByTestId("agenda-item")).toHaveCount(0);
  await expect(page.getByText("Barbearia Modelo")).toHaveCount(0);
  await page.goto(panel("servicos", DEMO));
  await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
  await expect(page.getByTestId("admin-service")).toHaveCount(0);
});

test("painel de slug inexistente responde 404", async ({ page }) => {
  await login(page, ADMIN, "/painel");
  const res = await page.goto(panel("", "nao-existe"));
  expect(res?.status()).toBe(404);
});

test("/painel com várias barbearias lista as duas", async ({ page }) => {
  const { data } = await adminDb().auth.admin.listUsers({ perPage: 1000 });
  const user = data.users.find((u) => u.email === ADMIN.email)!;
  await adminDb().from("shop_admins").insert({ shop_id: await shopId(DEMO), user_id: user.id });
  try {
    await login(page, ADMIN, "/painel");
    await expect(page).toHaveURL(/\/painel$/);
    const list = page.getByRole("list", { name: "Suas barbearias" });
    await expect(list.getByRole("link")).toHaveText(["Barbearia Modelo", SHOP_NAME]);
    await list.getByRole("link", { name: "Barbearia Modelo" }).click();
    await expect(page).toHaveURL(new RegExp(`${panel("", DEMO)}$`));
    await expect(page.getByRole("heading", { name: "Acesso negado" })).toHaveCount(0);
  } finally {
    await adminDb().from("shop_admins").delete().eq("user_id", user.id).eq("shop_id", await shopId(DEMO));
  }
});
