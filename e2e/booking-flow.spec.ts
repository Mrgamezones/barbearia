import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminDb } from "./helpers/db";
import { chooseDateAndTime, chooseServices, continueIfMobile, fillCustomer, insertAppointment, prettyPhone, randomIp, submitCustomer } from "./helpers/booking";
import { cleanupByPhone, serviceId, testPhone } from "./helpers/slots";

const phones: string[] = [];
test.afterAll(async () => cleanupByPhone(phones));

test.beforeEach(async ({ context }) => {
  await context.setExtraHTTPHeaders({ "x-forwarded-for": randomIp() });
});

test.describe("fluxo /agendar", () => {
  test("não avança sem serviço selecionado", async ({ page }) => {
    await page.goto("/agendar");
    if (test.info().project.name === "desktop") {
      // Desktop: as colunas ficam visíveis, mas confirmar só é possível com serviço e horário.
      await expect(page.getByRole("button", { name: "Confirmar agendamento" })).toBeDisabled();
      await expect(page.getByText("Escolha um serviço para ver os dias e horários livres.")).toBeVisible();
      return;
    }
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText("Escolha ao menos um serviço para continuar.");
    await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  });

  test("caminho feliz: serviços → data → horário → dados → confirmação", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    await page.goto("/agendar");

    await page.getByRole("checkbox", { name: /^Corte de cabelo/ }).click();
    await page.getByRole("checkbox", { name: /^Bigode/ }).click();
    const mobile = test.info().project.name === "mobile";
    await expect(page.getByTestId(mobile ? "bar-duration" : "summary-duration")).toHaveText("40 min");
    await expect(page.getByTestId(mobile ? "bar-total" : "summary-total")).toHaveText("R$ 60,00");
    await expect(page.getByTestId(mobile ? "bar-total" : "summary-total")).toBeVisible();
    await expect(page).toHaveURL(/servicos=/);
    await continueIfMobile(page);

    const time = await chooseDateAndTime(page);
    await expect(new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze().then((r) => r.violations.map((v) => v.id))).resolves.toEqual([]);
    await fillCustomer(page, prettyPhone(phone), "Maria Teste");
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();

    await expect(page).toHaveURL(/\/agendamento\/.+\?novo=1/);
    await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
    const details = page.getByTestId("booking-details");
    await expect(details).toContainText(time);
    await expect(details).toContainText("Corte de cabelo");
    await expect(details).toContainText("Bigode");
    await expect(details).toContainText("R$ 60,00");
    await expect(details).toContainText("Rua Exemplo");
    await expect(page.getByTestId("booking-status")).toHaveText("Confirmado");

    const { data } = await adminDb().from("appointments").select("status,total_cents,whatsapp_opt_in").eq("customer_phone", phone).single();
    expect(data).toEqual({ status: "confirmed", total_cents: 6000, whatsapp_opt_in: true });
  });

  test("desmarcar o WhatsApp grava o agendamento sem consentimento", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    await page.goto("/agendar");
    await chooseServices(page, ["Barba"]);
    await chooseDateAndTime(page);
    await page.getByLabel("Nome", { exact: true }).fill("Sem Zap");
    await page.getByLabel("WhatsApp", { exact: true }).fill(prettyPhone(phone));
    const optIn = page.getByRole("checkbox", { name: "Receber confirmação e lembretes pelo WhatsApp" });
    await expect(optIn).toBeChecked();
    await optIn.uncheck();
    await continueIfMobile(page);
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();

    const { data } = await adminDb().from("appointments").select("whatsapp_opt_in").eq("customer_phone", phone).single();
    expect(data).toEqual({ whatsapp_opt_in: false });
    const { count } = await adminDb()
      .from("notification_log")
      .select("*", { count: "exact", head: true })
      .eq("channel", "whatsapp")
      .eq("appointment_id", (await adminDb().from("appointments").select("id").eq("customer_phone", phone).single()).data!.id);
    expect(count).toBe(0);
  });

  test("telefone inválido mostra mensagem e não avança", async ({ page }) => {
    await page.goto("/agendar");
    await chooseServices(page, ["Barba"]);
    await chooseDateAndTime(page);
    await page.getByLabel("Nome", { exact: true }).fill("Teste");
    await page.getByLabel("WhatsApp", { exact: true }).fill("1234");
    await submitCustomer(page);
    await expect(page.getByText(/WhatsApp inválido/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  });

  test("horário ocupado por outra pessoa durante o fluxo: volta para escolher outro", async ({ page }) => {
    const phone = testPhone();
    const other = testPhone();
    phones.push(phone, other);
    await page.goto("/agendar");
    await chooseServices(page, ["Barba"]);
    await chooseDateAndTime(page);
    await fillCustomer(page, prettyPhone(phone));

    // Outra pessoa confirma o mesmo horário antes.
    const slot = new URL(page.url()).searchParams.get("hora")!;
    const { data } = await adminDb().rpc("create_booking", {
      p_service_ids: [await serviceId("Barba")],
      p_starts_at: slot,
      p_name: "Outra Pessoa",
      p_phone: other,
    });
    expect(data.ok).toBe(true);

    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("acabou de ser ocupado");
    await expect(page.getByRole("heading", { name: "Escolha a data e o horário" })).toBeVisible();
    await expect(page).not.toHaveURL(/hora=/);
    const slotsGroup = page.getByRole("group", { name: "Horários disponíveis" });
    await expect(slotsGroup).toBeVisible();
    const taken = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(slot));
    await expect(slotsGroup.getByRole("button", { name: taken, exact: true })).toHaveCount(0);
  });

  test("excesso de tentativas do mesmo IP mostra erro amigável", async ({ page, context }) => {
    const ip = "198.51.100.77";
    await context.setExtraHTTPHeaders({ "x-forwarded-for": ip });
    await adminDb().from("rate_limits").upsert({ key: `booking:${ip}`, window_start: new Date().toISOString(), hits: 5 });
    const phone = testPhone();
    phones.push(phone);

    await page.goto("/agendar");
    await chooseServices(page, ["Bigode"]);
    await chooseDateAndTime(page);
    await fillCustomer(page, prettyPhone(phone));
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Muitas tentativas");
    await adminDb().from("rate_limits").delete().eq("key", `booking:${ip}`);
  });
});

test.describe("link de gerenciamento /agendamento/[token]", () => {
  test("link inválido mostra 'não encontrado' sem dados", async ({ page }) => {
    await page.goto("/agendamento/token-que-nao-existe-1234567890");
    await expect(page.getByRole("heading", { name: "Agendamento não encontrado" })).toBeVisible();
    await expect(page.getByTestId("booking-details")).toHaveCount(0);
  });

  test("cancelamento dentro do prazo libera o horário", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    const startsAt = new Date(Date.now() + 5 * 3_600_000);
    startsAt.setUTCMinutes(0, 0, 0);
    const { id, token } = await insertAppointment({ startsAt, phone, minutes: 30, whatsappOptIn: true });

    await page.goto(`/agendamento/${token}`);
    await expect(page.getByTestId("booking-status")).toHaveText("Confirmado");
    await page.getByRole("button", { name: "Cancelar agendamento" }).click();
    await page.getByRole("button", { name: "Sim, cancelar" }).click();
    await expect(page.getByTestId("booking-status")).toHaveText("Cancelado");

    // Confirmação do cancelamento pelo WhatsApp (dry-run sem credenciais).
    const { data: logs } = await adminDb().from("notification_log").select("channel,kind,status").eq("appointment_id", id);
    expect(logs).toEqual([{ channel: "whatsapp", kind: "cancelled_client", status: "dry_run" }]);

    const { data } = await adminDb().from("appointments").select("status").eq("customer_phone", phone).single();
    expect(data!.status).toBe("cancelled");
    // Sem agendamento ativo sobrepondo o intervalo, o horário volta a ser elegível.
    const { count } = await adminDb()
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("starts_at", startsAt.toISOString())
      .neq("status", "cancelled");
    expect(count).toBe(0);
  });

  test("cancelamento fora do prazo: sem botão e com WhatsApp", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    const startsAt = new Date(Date.now() + 60 * 60_000);
    const { id, token } = await insertAppointment({ startsAt, phone, whatsappOptIn: true });

    await page.goto(`/agendamento/${token}`);
    await expect(page.getByTestId("too-late")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancelar agendamento" })).toHaveCount(0);
    // O servidor também recusa (too_late) e não gera aviso de cancelamento.
    const { data: tooLate } = await adminDb().rpc("cancel_booking_by_token", { p_token: token });
    expect(tooLate).toEqual({ ok: false, error: "too_late" });
    const { count } = await adminDb().from("notification_log").select("*", { count: "exact", head: true }).eq("appointment_id", id);
    expect(count).toBe(0);
    await expect(page.getByRole("main").getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /wa\.me\/5511999999999/);
  });
});
