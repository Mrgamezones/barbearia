import { expect, test, type Page } from "@playwright/test";
import { ADMIN, ensureTestUsers, login } from "./helpers/admin";
import { chooseDateAndTime, chooseServices, fillCustomer, insertAppointment, prettyPhone } from "./helpers/booking";
import { adminDb } from "./helpers/db";
import { cleanupByPhone, findFreeSlot, serviceId, testPhone } from "./helpers/slots";
import { SHOP, panel, shopId, site } from "./helpers/shop";

const phones: string[] = [];
const endpoints: string[] = [];

test.describe.configure({ mode: "serial" });
test.beforeAll(async () => ensureTestUsers());
test.afterAll(async () => {
  await cleanupByPhone(phones);
  if (endpoints.length) await adminDb().from("admin_push_subscriptions").delete().in("endpoint", endpoints);
});

/** Simula o serviço de push do navegador (o Chromium headless não tem FCM) e conta pedidos de permissão. */
async function mockPush(page: Page, endpoint: string) {
  endpoints.push(endpoint);
  await page.addInitScript((ep) => {
    const w = window as unknown as { __permissionRequests: number };
    w.__permissionRequests = 0;
    const original = Notification.requestPermission.bind(Notification);
    Notification.requestPermission = async () => {
      w.__permissionRequests++;
      return original();
    };
    const fake = { endpoint: ep, toJSON: () => ({ endpoint: ep, keys: { p256dh: "chave-p256dh", auth: "chave-auth" } }) };
    let subscribed = false;
    PushManager.prototype.subscribe = async () => {
      subscribed = true;
      return fake as unknown as PushSubscription;
    };
    PushManager.prototype.getSubscription = async () => (subscribed || Notification.permission === "granted" ? (fake as unknown as PushSubscription) : null);
  }, endpoint);
}

const permissionRequests = (page: Page) => page.evaluate(() => (window as unknown as { __permissionRequests: number }).__permissionRequests);

async function adminSubscriptions(endpoint: string) {
  const { data } = await adminDb().from("admin_push_subscriptions").select("shop_id,endpoint").eq("endpoint", endpoint);
  return data ?? [];
}

async function alertsFor(appointmentId: string) {
  const { data } = await adminDb().from("shop_alerts").select("kind").eq("appointment_id", appointmentId);
  return (data ?? []).map((a) => a.kind as string);
}

test.describe("ativação dos avisos", () => {
  test("pede permissão só no toque, grava a inscrição e desativa", async ({ page, context }) => {
    const endpoint = `https://push.example/dono-e2e-${Date.now()}`;
    await context.grantPermissions(["notifications"]);
    await mockPush(page, endpoint);

    await login(page, ADMIN, panel("config"));
    const card = page.getByTestId("alerts-card");
    const enable = card.getByRole("button", { name: "Receber avisos neste aparelho" });
    await expect(enable).toBeVisible();
    expect(await permissionRequests(page)).toBe(0);

    await enable.click();
    await expect(card.getByRole("status")).toContainText("Avisos ativos neste aparelho");
    expect(await permissionRequests(page)).toBe(1);
    expect(await adminSubscriptions(endpoint)).toEqual([{ shop_id: await shopId(), endpoint }]);

    await card.getByRole("button", { name: "Desativar" }).click();
    await expect(card.getByRole("button", { name: "Receber avisos neste aparelho" })).toBeVisible();
    expect(await adminSubscriptions(endpoint)).toEqual([]);
  });

  test("permissão negada explica como liberar", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Notification, "permission", { get: () => "denied" });
    });
    await login(page, ADMIN, panel("config"));
    await expect(page.getByTestId("alerts-denied")).toContainText("bloqueadas");
  });

  test("iPhone fora do app instalado: instruções no lugar do botão", async ({ browser }) => {
    const ctx = await browser.newContext({
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page, ADMIN, panel("config"));
    await expect(page.getByTestId("alerts-ios-install")).toContainText("Adicionar à Tela de Início");
    await expect(page.getByRole("button", { name: "Receber avisos neste aparelho" })).toHaveCount(0);
    // Na agenda, o lembrete aponta para a ativação.
    await page.goto(panel());
    await expect(page.getByTestId("alerts-reminder")).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test("painel declara o manifesto do app do painel", async ({ page }) => {
    await login(page);
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", `${panel()}/manifest.webmanifest`);
  });
});

test.describe("avisos de agendamento e cancelamento", () => {
  const endpoint = `https://push.example/dono-e2e-fluxo-${Date.now()}`;

  test.beforeAll(async () => {
    // Dono inscrito: o envio vai para um endpoint inexistente e falha, sem afetar o cliente.
    endpoints.push(endpoint);
    const { data: users } = await adminDb().auth.admin.listUsers({ perPage: 1000 });
    const owner = users.users.find((u) => u.email === ADMIN.email)!;
    await adminDb().from("admin_push_subscriptions").insert({ shop_id: await shopId(), user_id: owner.id, endpoint, p256dh: "k", auth: "a" });
  });

  test("agendamento pelo site gera aviso, sem atrasar a confirmação do cliente", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    await page.goto(site("agendar"));
    await chooseServices(page, ["Barba"]);
    await chooseDateAndTime(page);
    await fillCustomer(page, prettyPhone(phone), "Cliente Aviso");
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();

    const { data } = await adminDb().from("appointments").select("id").eq("customer_phone", phone).single();
    expect(await alertsFor(data!.id)).toEqual(["booked"]);
  });

  test("cancelamento pelo link gera aviso", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    // Daqui a 3 dias: um cancelado na agenda de hoje atrapalharia o teste de acessibilidade do painel,
    // que roda em paralelo no CI.
    const startsAt = new Date(Date.now() + 3 * 86_400_000);
    startsAt.setUTCHours(15, 0, 0, 0);
    const { id, token } = await insertAppointment({ startsAt, phone });
    await page.goto(`${site()}/agendamento/${token}`);
    await page.getByRole("button", { name: "Cancelar agendamento" }).click();
    await page.getByRole("button", { name: "Sim, cancelar" }).click();
    await expect(page.getByTestId("booking-status")).toHaveText("Cancelado");
    expect(await alertsFor(id)).toEqual(["cancelled_by_client"]);
  });

  test("agendamento manual pelo painel não gera aviso", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    const { date } = await findFreeSlot(30, { minOffsetDays: 12, pick: 2 });
    await login(page, ADMIN, panel("novo"));
    await page.getByRole("checkbox", { name: /^Bigode/ }).click();
    await page.getByLabel("Data").fill(date);
    const slots = page.getByRole("group", { name: "Horários disponíveis" }).getByRole("button");
    await expect(slots.first()).toBeVisible();
    await slots.nth(Math.floor(Math.random() * (await slots.count()))).click();
    await page.getByLabel("Nome do cliente").fill("Manual Sem Aviso");
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone.slice(3));
    await page.getByRole("button", { name: "Criar agendamento" }).click();
    await expect(page).toHaveURL(/\/painel\/barbearia-teste\?data=/);

    const { data } = await adminDb().from("appointments").select("id,source").eq("customer_phone", phone).single();
    expect(data!.source).toBe("admin");
    expect(await alertsFor(data!.id)).toEqual([]);
  });
});

test.describe("agenda ao vivo e toque", () => {
  test("agendamento chega com a agenda aberta, sem recarregar", async ({ page }) => {
    test.setTimeout(90_000);
    const phone = testPhone();
    phones.push(phone);
    const { date, slot } = await findFreeSlot(30, { minOffsetDays: 9, pick: 3 });
    await login(page, ADMIN, `${panel()}?data=${date}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // Garante que a primeira consulta (que só inicializa) já aconteceu.
    await page.waitForTimeout(2_000);

    const { data: created } = await adminDb().rpc("create_booking", {
      p_shop_slug: SHOP,
      p_service_ids: [await serviceId("Barba")],
      p_starts_at: slot,
      p_name: "Cliente Ao Vivo",
      p_phone: phone,
    });
    expect(created.ok).toBe(true);
    // O servidor grava o aviso junto com o agendamento pelo site.
    await adminDb().from("shop_alerts").insert({ shop_id: await shopId(), kind: "booked", appointment_id: created.id });

    await expect(page.getByTestId("agenda-item").filter({ hasText: "Cliente Ao Vivo" })).toBeVisible({ timeout: 40_000 });
  });

  test("toque escolhido fica salvo no aparelho, com a explicação do som do sistema", async ({ page }) => {
    await login(page, ADMIN, panel("config"));
    const picker = page.getByTestId("alert-sound-picker");
    await expect(picker.getByRole("radio", { name: "Campainha" })).toBeChecked();
    await picker.getByRole("radio", { name: "Sino" }).check();
    await picker.getByRole("button", { name: "Testar" }).click();
    await page.reload();
    await expect(page.getByTestId("alert-sound-picker").getByRole("radio", { name: "Sino" })).toBeChecked();
    await expect(page.getByTestId("system-sound-note")).toContainText("no iPhone, não é possível escolher");
    await page.getByTestId("alert-sound-picker").getByRole("radio", { name: "Silencioso" }).check();
    await expect(page.getByTestId("alert-sound-picker").getByRole("button", { name: "Testar" })).toBeDisabled();
  });
});
