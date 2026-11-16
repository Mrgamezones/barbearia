import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { insertAppointment } from "./helpers/booking";
import { adminDb } from "./helpers/db";
import { cleanupByPhone, testPhone } from "./helpers/slots";
import { site } from "./helpers/shop";

test.describe("lembretes por push na página do agendamento", () => {
  test.skip(() => test.info().project.name !== "mobile", "roda no perfil Android (Chromium)");
  const phones: string[] = [];
  test.afterAll(async () => cleanupByPhone(phones));

  async function newBooking(email?: string) {
    const phone = testPhone();
    phones.push(phone);
    const startsAt = new Date(Date.now() + 3 * 86_400_000 + Math.floor(Math.random() * 600) * 15 * 60_000);
    startsAt.setUTCSeconds(0, 0);
    const b = await insertAppointment({ startsAt, phone });
    if (email) await adminDb().from("appointments").update({ customer_email: email }).eq("id", b.id);
    return b;
  }

  /** Simula o serviço de push do navegador (o Chromium headless não tem FCM) e conta pedidos de permissão. */
  async function mockPush(page: Page, endpoint: string) {
    await page.addInitScript((ep) => {
      const w = window as unknown as { __permissionRequests: number };
      w.__permissionRequests = 0;
      const original = Notification.requestPermission.bind(Notification);
      Notification.requestPermission = async () => {
        w.__permissionRequests++;
        return original();
      };
      const fake = { endpoint: ep, toJSON: () => ({ endpoint: ep, keys: { p256dh: "chave-p256dh", auth: "chave-auth" } }) };
      PushManager.prototype.subscribe = async () => fake as unknown as PushSubscription;
      PushManager.prototype.getSubscription = async () => null;
    }, endpoint);
  }

  test("pede permissão só após o clique e grava a inscrição com lembretes de 24 h e 2 h", async ({ page, context }) => {
    const { id, token } = await newBooking();
    const endpoint = `https://push.example/e2e-${id}`;
    await context.grantPermissions(["notifications"]);
    await mockPush(page, endpoint);

    await page.goto(`${site()}/agendamento/${token}`);
    const button = page.getByRole("button", { name: "Ativar lembrete" });
    await expect(button).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __permissionRequests: number }).__permissionRequests)).toBe(0);

    await button.click();
    await expect(page.getByRole("status")).toContainText("Lembretes ativados");
    expect(await page.evaluate(() => (window as unknown as { __permissionRequests: number }).__permissionRequests)).toBe(1);

    const { data: subs } = await adminDb().from("push_subscriptions").select("endpoint").eq("appointment_id", id);
    expect(subs).toEqual([{ endpoint }]);
    const { data: rems } = await adminDb().from("reminders").select("kind").eq("appointment_id", id).eq("channel", "push").order("kind");
    expect(rems!.map((r) => r.kind)).toEqual(["h24", "h2"]);

    // O link de gerenciamento fica guardado no navegador para a notificação abrir.
    const saved = await page.evaluate(async (aid) => (await (await caches.open("lembretes-links")).match(`/__lembrete/${aid}`))?.text(), id);
    expect(saved).toBe(`${site()}/agendamento/${encodeURIComponent(token)}`);
  });

  test("navegador sem suporte explica a alternativa, sem erro", async ({ page }) => {
    const { token } = await newBooking("cliente@teste.local");
    await page.addInitScript(() => {
      delete (window as unknown as Record<string, unknown>).PushManager;
    });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${site()}/agendamento/${token}`);
    await expect(page.getByTestId("reminder-unsupported")).toContainText("receberá os lembretes por e-mail");
    await expect(page.getByRole("button", { name: "Ativar lembrete" })).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("rota de inscrição recusa token inválido e endpoint sem https", async ({ request }) => {
    const bad = await request.post("/api/push/subscribe", {
      data: { token: "token-invalido-123456789012", subscription: { endpoint: "https://push.example/x", keys: { p256dh: "k", auth: "a" } } },
    });
    expect(bad.status()).toBe(404);
    const insecure = await request.post("/api/push/subscribe", {
      data: { token: "token-invalido-123456789012", subscription: { endpoint: "http://push.example/x", keys: { p256dh: "k", auth: "a" } } },
    });
    expect(insecure.status()).toBe(400);
  });

  /** Entrega uma mensagem push ao service worker pela CDP (o Chromium headless não tem serviço de push). */
  async function deliverPush(page: Page, context: BrowserContext, payload: object) {
    const cdp = await context.newCDPSession(page);
    const registrations: { registrationId: string; scopeURL: string; isDeleted: boolean }[] = [];
    cdp.on("ServiceWorker.workerRegistrationUpdated", ({ registrations: r }) => registrations.push(...r));
    await cdp.send("ServiceWorker.enable");
    await expect.poll(() => registrations.filter((r) => !r.isDeleted).length).toBeGreaterThan(0);
    const reg = registrations.filter((r) => !r.isDeleted).at(-1)!;
    await cdp.send("ServiceWorker.deliverPushMessage", { origin: new URL(reg.scopeURL).origin, registrationId: reg.registrationId, data: JSON.stringify(payload) });
  }

  test("service worker exibe a notificação recebida por push", async ({ page, context }) => {
    await context.grantPermissions(["notifications"]);
    await page.goto(site());
    await page.waitForFunction(async () => !!(await navigator.serviceWorker.ready).active);
    await deliverPush(page, context, { title: "Daqui a 2 horas: 14:00 na Barbearia Modelo", body: "Corte de cabelo.", appointmentId: "abc" });

    await expect
      .poll(async () => page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map((n) => n.title)))
      .toContain("Daqui a 2 horas: 14:00 na Barbearia Modelo");
  });
});
