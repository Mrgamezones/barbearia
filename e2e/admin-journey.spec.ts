import { expect, test } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { ensureTestUsers, login } from "./helpers/admin";
import { chooseDateAndTime, chooseServices, fillCustomer, prettyPhone, randomIp } from "./helpers/booking";
import { adminDb } from "./helpers/db";
import { cleanupByPhone, testPhone } from "./helpers/slots";
import { SHOP, panel, site } from "./helpers/shop";

const TZ = "America/Sao_Paulo";

test.describe("jornada completa", () => {
  const phone = testPhone();
  test.beforeAll(async () => ensureTestUsers());
  test.afterAll(async () => cleanupByPhone([phone]));

  test("cliente agenda → admin vê na agenda → cliente cancela pelo link → horário volta a ficar livre", async ({ browser }) => {
    // 1) Cliente agenda pelo site.
    const client = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
    const page = await client.newPage();
    await page.goto(site("agendar"));
    await chooseServices(page, ["Corte de cabelo"]);
    const time = await chooseDateAndTime(page);
    await fillCustomer(page, prettyPhone(phone), "Jornada Completa");
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
    const manageUrl = page.url().replace("?novo=1", "");

    const { data: appt } = await adminDb().from("appointments").select("id,starts_at").eq("customer_phone", phone).single();
    const day = formatInTimeZone(new Date(appt!.starts_at), TZ, "yyyy-MM-dd");

    // 2) Barbeiro vê o agendamento na agenda do dia.
    const barber = await browser.newContext();
    const admin = await barber.newPage();
    await login(admin, undefined, `${panel()}?data=${day}`);
    const item = admin.getByTestId("agenda-item").filter({ hasText: prettyPhone(phone) });
    await expect(item).toContainText("Jornada Completa");
    await expect(item).toContainText(time);
    await expect(item).toContainText("Corte de cabelo");

    // 3) Cliente cancela pelo link.
    await page.goto(manageUrl);
    await page.getByRole("button", { name: "Cancelar agendamento" }).click();
    await page.getByRole("button", { name: "Sim, cancelar" }).click();
    await expect(page.getByTestId("booking-status")).toHaveText("Cancelado");

    // 4) Agenda mostra cancelado e o horário volta a ser oferecido no site.
    await admin.reload();
    await expect(item).toContainText("Cancelado");
    const { data: slots } = await adminDb().rpc("get_available_slots", { p_shop_slug: SHOP, p_date: day, p_total_minutes: 30 });
    expect((slots as { slot: string }[]).some((s) => new Date(s.slot).getTime() === new Date(appt!.starts_at).getTime())).toBe(true);

    await client.close();
    await barber.close();
  });
});
