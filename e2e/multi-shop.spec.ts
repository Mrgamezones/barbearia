import { expect, test } from "@playwright/test";
import { chooseDateAndTime, chooseServices, fillCustomer, insertAppointment, prettyPhone } from "./helpers/booking";
import { adminDb } from "./helpers/db";
import { DEMO, SHOP, SHOP_NAME, site } from "./helpers/shop";
import { cleanupByPhone, findFreeSlot, serviceId, testPhone } from "./helpers/slots";

// Várias barbearias no mesmo domínio: endereços, agendas e links independentes.
test.describe("várias barbearias", () => {
  test.skip(() => test.info().project.name !== "desktop", "regras de servidor: roda uma vez");
  const phones: string[] = [];
  test.afterAll(async () => cleanupByPhone(phones));

  test("a raiz do domínio leva à barbearia de demonstração", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`${site("", DEMO)}$`));
    await expect(page.getByRole("banner").getByRole("link", { name: /Barbearia Modelo — início/ })).toBeVisible();
  });

  test("slug inexistente responde 404 no site e no manifesto", async ({ page, request }) => {
    const res = await page.goto(site("", "nao-existe"));
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    expect((await request.get(site("manifest.webmanifest", "nao-existe"))).status()).toBe(404);
  });

  test("cada barbearia mostra os próprios dados", async ({ page }) => {
    await page.goto(site());
    await expect(page.locator("#contato")).toContainText(SHOP_NAME);
    await expect(page.locator("#contato")).not.toContainText("Barbearia Modelo");
    await page.goto(site("", DEMO));
    await expect(page.locator("#contato")).toContainText("Barbearia Modelo");
    await expect(page.locator("#contato")).toContainText("Rua Exemplo, 100 – Centro, São Paulo – SP");
  });

  test("mesmo horário em barbearias diferentes: os dois agendamentos são confirmados", async () => {
    const { slot } = await findFreeSlot(30, { minOffsetDays: 9, pick: 6 });
    const book = async (shop: string) => {
      const phone = testPhone();
      phones.push(phone);
      const { data, error } = await adminDb().rpc("create_booking", {
        p_shop_slug: shop,
        p_service_ids: [await serviceId("Barba", shop)],
        p_starts_at: slot,
        p_name: "Mesmo Horário",
        p_phone: phone,
      });
      expect(error).toBeNull();
      return data as { ok: boolean; error?: string };
    };
    expect((await book(SHOP)).ok).toBe(true);
    expect((await book(DEMO)).ok).toBe(true);
    // Na mesma barbearia, o horário continua protegido.
    expect((await book(SHOP)).error).toBe("slot_taken");
  });

  test("token de outra barbearia responde 404 sem dados do agendamento", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    const { token } = await insertAppointment({ startsAt: new Date(Date.now() + 15 * 86_400_000), phone, shop: SHOP });

    const ok = await page.goto(`${site()}/agendamento/${token}`);
    expect(ok?.status()).toBe(200);
    await expect(page.getByTestId("booking-details")).toBeVisible();

    const other = await page.goto(`${site("", DEMO)}/agendamento/${token}`);
    expect(other?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Agendamento não encontrado" })).toBeVisible();
    await expect(page.getByTestId("booking-details")).toHaveCount(0);
    await expect(page.getByText("Cliente Teste")).toHaveCount(0);
  });

  test("demonstração: agendamento pelo site não envia mensagens", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    await page.goto(site("agendar", DEMO));
    await chooseServices(page, ["Barba"]);
    await chooseDateAndTime(page);
    await page.getByLabel("E-mail (opcional)").fill("visitante@teste.local");
    await fillCustomer(page, prettyPhone(phone), "Visitante Demo");
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`${site("", DEMO)}/agendamento/`));

    const { data: appt } = await adminDb().from("appointments").select("id,whatsapp_opt_in").eq("customer_phone", phone).single();
    expect(appt!.whatsapp_opt_in).toBe(true);
    const { data: logs } = await adminDb().from("notification_log").select("channel,status").eq("appointment_id", appt!.id).order("channel");
    expect(logs).toEqual([
      { channel: "email", status: "skipped" },
      { channel: "whatsapp", status: "skipped" },
    ]);
    const { data: reminders } = await adminDb().from("reminders").select("id").eq("appointment_id", appt!.id);
    expect(reminders).toEqual([]);
  });

  test("manifesto do app instalado fica restrito à barbearia", async ({ request }) => {
    const m = await (await request.get(site("manifest.webmanifest"))).json();
    expect(m).toMatchObject({ id: `${site()}/`, scope: `${site()}/`, name: `${SHOP_NAME} — Agendamento` });
    expect(m.start_url).toMatch(new RegExp(`^${site()}/`));
  });
});
