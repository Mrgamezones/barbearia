import { expect, test } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { COMMON, ensureTestUsers, login } from "./helpers/admin";
import { prettyPhone } from "./helpers/booking";
import { adminDb } from "./helpers/db";
import { cleanupByPhone, findFreeSlot, serviceId, testPhone } from "./helpers/slots";
import { SHOP, panel, shopId, site } from "./helpers/shop";

const TZ = "America/Sao_Paulo";
const phones: string[] = [];
const localDay = (iso: string) => formatInTimeZone(new Date(iso), TZ, "yyyy-MM-dd");

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => ensureTestUsers());
test.afterAll(async () => cleanupByPhone(phones));

async function book(serviceName: string, opts?: { pick?: number; minOffsetDays?: number; whatsappOptIn?: boolean }) {
  const phone = testPhone();
  phones.push(phone);
  const svc = await serviceId(serviceName);
  const { slot } = await findFreeSlot(30, { minOffsetDays: opts?.minOffsetDays ?? 4, pick: opts?.pick ?? 2 });
  const { data, error } = await adminDb().rpc("create_booking", { p_shop_slug: SHOP,
    p_service_ids: [svc],
    p_starts_at: slot,
    p_name: "Cliente Painel",
    p_phone: phone,
    p_whatsapp_opt_in: opts?.whatsappOptIn ?? false,
  });
  expect(error).toBeNull();
  expect(data.ok).toBe(true);
  return { phone, slot, id: data.id as string };
}

test.describe("acesso", () => {
  test("visitante sem login é redirecionado para o login", async ({ page }) => {
    await page.goto(panel("servicos"));
    await expect(page).toHaveURL(/\/painel\/login\?next=%2Fpainel%2Fbarbearia-teste%2Fservicos/);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("senha errada mostra erro", async ({ page }) => {
    await page.goto("/painel/login");
    await page.getByLabel("E-mail").fill(COMMON.email);
    await page.getByLabel("Senha").fill("errada-123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  });

  test("usuário autenticado sem papel de admin não recebe dados", async ({ page }) => {
    await book("Barba");
    await login(page, COMMON);
    await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await expect(page.getByTestId("agenda-item")).toHaveCount(0);
    await page.goto(panel("servicos"));
    await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
    await expect(page.getByTestId("admin-service")).toHaveCount(0);
  });
});

test.describe("agenda", () => {
  test("mostra o dia em ordem, total previsto e permite cancelar liberando o horário", async ({ page }) => {
    const a = await book("Corte de cabelo", { pick: 1, minOffsetDays: 6 });
    await login(page, undefined, `${panel()}?data=${localDay(a.slot)}`);
    const item = page.getByTestId("agenda-item").filter({ hasText: prettyPhone(a.phone) });
    await expect(item).toBeVisible();
    await expect(item.getByRole("link", { name: /\(11\)/ })).toHaveAttribute("href", /wa\.me\/55/);
    await expect(page.getByTestId("agenda-total")).toContainText("R$");

    page.once("dialog", (d) => d.accept());
    await item.getByLabel("Status").selectOption("cancelled");
    await expect.poll(async () => (await adminDb().from("appointments").select("status").eq("id", a.id).single()).data?.status).toBe("cancelled");
    const { data: slots } = await adminDb().rpc("get_available_slots", { p_shop_slug: SHOP, p_date: localDay(a.slot), p_total_minutes: 30 });
    expect((slots as { slot: string }[]).some((s) => new Date(s.slot).getTime() === new Date(a.slot).getTime())).toBe(true);
  });

  test("cancelar no painel avisa o cliente pelo WhatsApp uma única vez", async ({ page }) => {
    const a = await book("Corte de cabelo", { pick: 5, minOffsetDays: 7, whatsappOptIn: true });
    const cancelLogs = async () =>
      (await adminDb().from("notification_log").select("status").eq("appointment_id", a.id).eq("channel", "whatsapp").eq("kind", "cancelled_admin")).data ?? [];
    await login(page, undefined, `${panel()}?data=${localDay(a.slot)}`);
    const item = page.getByTestId("agenda-item").filter({ hasText: prettyPhone(a.phone) });
    const status = item.getByLabel("Status");
    page.on("dialog", (d) => d.accept());

    await status.selectOption("cancelled");
    await expect.poll(cancelLogs).toEqual([{ status: "dry_run" }]);

    // Reativar e cancelar de novo não gera um segundo aviso.
    await status.selectOption("confirmed");
    await expect.poll(async () => (await adminDb().from("appointments").select("status").eq("id", a.id).single()).data?.status).toBe("confirmed");
    await status.selectOption("cancelled");
    await expect.poll(async () => (await adminDb().from("appointments").select("status").eq("id", a.id).single()).data?.status).toBe("cancelled");
    expect(await cancelLogs()).toHaveLength(1);
  });

  test("marcar como concluído não gera aviso de cancelamento", async ({ page }) => {
    const a = await book("Barba", { pick: 7, minOffsetDays: 7, whatsappOptIn: true });
    await login(page, undefined, `${panel()}?data=${localDay(a.slot)}`);
    const item = page.getByTestId("agenda-item").filter({ hasText: prettyPhone(a.phone) });
    await item.getByLabel("Status").selectOption("completed");
    await expect.poll(async () => (await adminDb().from("appointments").select("status").eq("id", a.id).single()).data?.status).toBe("completed");
    const { count } = await adminDb()
      .from("notification_log")
      .select("*", { count: "exact", head: true })
      .eq("appointment_id", a.id)
      .like("kind", "cancelled%");
    expect(count).toBe(0);
  });

  test("reativar um cancelado em horário já ocupado continua sendo recusado", async ({ page }) => {
    const a = await book("Corte de cabelo", { pick: 9, minOffsetDays: 7 });
    await adminDb().from("appointments").update({ status: "cancelled" }).eq("id", a.id);
    const other = testPhone();
    phones.push(other);
    const svc = await serviceId("Corte de cabelo");
    const { data: taken } = await adminDb().rpc("create_booking", { p_shop_slug: SHOP, p_service_ids: [svc], p_starts_at: a.slot, p_name: "Ocupou", p_phone: other });
    expect(taken.ok).toBe(true);

    await login(page, undefined, `${panel()}?data=${localDay(a.slot)}`);
    const item = page.getByTestId("agenda-item").filter({ hasText: prettyPhone(a.phone) });
    await item.getByLabel("Status").selectOption("confirmed");
    await expect(item.getByRole("alert")).toHaveText("Já existe outro agendamento nesse horário.");
  });

  test("marcar 'não compareceu' aparece no histórico do cliente", async ({ page }) => {
    const a = await book("Barba", { pick: 3, minOffsetDays: 6 });
    await login(page, undefined, `${panel()}?data=${localDay(a.slot)}`);
    const item = page.getByTestId("agenda-item").filter({ hasText: prettyPhone(a.phone) });
    await item.getByLabel("Status").selectOption("no_show");
    await expect.poll(async () => (await adminDb().from("appointments").select("status").eq("id", a.id).single()).data?.status).toBe("no_show");
    await item.getByRole("link", { name: "Cliente Painel" }).click();
    await expect(page.getByTestId("no-show-count")).toHaveText("1 falta(s)");
    await expect(page.getByTestId("history-row")).toContainText(["Não compareceu"]);
  });
});

test.describe("agendamento manual", () => {
  // Abre o dia de hoje inteiro para haver horários nos próximos minutos.
  const todayDow = Number(formatInTimeZone(new Date(), TZ, "i")) % 7;
  let original: Record<string, unknown> | null = null;
  test.beforeAll(async () => {
    original = (await adminDb().from("business_hours").select("*").eq("shop_id", await shopId()).eq("weekday", todayDow).single()).data;
    await adminDb()
      .from("business_hours")
      .update({ is_open: true, open_time: "00:00", close_time: "23:45", break_start: null, break_end: null })
      .eq("shop_id", await shopId())
      .eq("weekday", todayDow);
  });
  test.afterAll(async () => {
    if (original) await adminDb().from("business_hours").update(original).eq("shop_id", await shopId()).eq("weekday", todayDow);
  });

  test("encaixe em menos de 60 minutos é permitido pelo painel", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    await login(page, undefined, panel("novo"));
    await page.getByRole("checkbox", { name: /^Bigode/ }).click();
    const slots = page.getByRole("group", { name: "Horários disponíveis" }).getByRole("button");
    await expect(slots.first()).toBeVisible();
    const first = (await slots.first().textContent())!.trim();
    const [h, m] = first.split(":").map(Number);
    const nowSp = formatInTimeZone(new Date(), TZ, "HH:mm").split(":").map(Number);
    const diff = h * 60 + m - (nowSp[0] * 60 + nowSp[1]);
    test.skip(diff < 0, "virada de dia durante o teste");
    expect(diff).toBeLessThan(60);

    await slots.first().click();
    await page.getByLabel("Nome do cliente").fill("Encaixe Telefone");
    await page.getByLabel("WhatsApp", { exact: true }).fill(phone.slice(3));
    await expect(page.getByRole("checkbox", { name: "Cliente aceitou receber mensagens no WhatsApp" })).toBeChecked();
    await page.getByRole("button", { name: "Criar agendamento" }).click();
    await expect(page).toHaveURL(/\/painel\/barbearia-teste\?data=/);
    await expect(page.getByTestId("agenda-item").filter({ hasText: "Encaixe Telefone" })).toBeVisible();
    const { data } = await adminDb().from("appointments").select("id,source,whatsapp_opt_in").eq("customer_phone", phone).single();
    expect(data).toMatchObject({ source: "admin", whatsapp_opt_in: true });
    // Confirmação pelo WhatsApp (dry-run sem credenciais).
    const { data: logs } = await adminDb().from("notification_log").select("kind,status").eq("appointment_id", data!.id).eq("channel", "whatsapp");
    expect(logs).toEqual([{ kind: "confirmation", status: "dry_run" }]);
  });
});

test.describe("serviços", () => {
  const name = `Serviço Preço E2E ${Date.now()}`;
  let svcId = "";
  test.beforeAll(async () => {
    const { data } = await adminDb().from("services").insert({ shop_id: await shopId(), name, price_cents: 4500, duration_min: 30, sort_order: 9999 }).select("id").single();
    svcId = data!.id;
  });
  test.afterAll(async () => {
    await adminDb().from("appointment_services").delete().eq("service_id", svcId);
    await adminDb().from("services").delete().eq("id", svcId);
  });

  test("mudar o preço não altera agendamentos existentes e reflete no site", async ({ page }) => {
    const phone = testPhone();
    phones.push(phone);
    const { slot } = await findFreeSlot(30, { minOffsetDays: 8, pick: 5 });
    const { data: created } = await adminDb().rpc("create_booking", { p_shop_slug: SHOP, p_service_ids: [svcId], p_starts_at: slot, p_name: "Preço Antigo", p_phone: phone });
    expect(created.ok).toBe(true);

    await login(page, undefined, panel("servicos"));
    const row = page.getByTestId("admin-service").filter({ hasText: name });
    await row.getByRole("button", { name: "Editar" }).click();
    const form = page.getByRole("form", { name: `Editar ${name}` });
    await form.getByLabel("Preço (R$)").fill("50,00");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByTestId("admin-service").filter({ hasText: name })).toContainText("R$ 50,00");

    const { data: appt } = await adminDb()
      .from("appointments")
      .select("total_cents, appointment_services(price_cents_snapshot)")
      .eq("id", created.id)
      .single();
    expect(appt!.total_cents).toBe(4500);
    expect(appt!.appointment_services[0].price_cents_snapshot).toBe(4500);

    await page.goto(site("servicos"));
    await expect(page.getByTestId("service-item").filter({ hasText: name })).toContainText("R$ 50,00");
  });

  test("duração inválida é recusada", async ({ page }) => {
    await login(page, undefined, panel("servicos"));
    const row = page.getByTestId("admin-service").filter({ hasText: name });
    await row.getByRole("button", { name: "Editar" }).click();
    const form = page.getByRole("form", { name: `Editar ${name}` });
    await form.getByLabel("Duração (min)").fill("22");
    await form.getByRole("button", { name: "Salvar" }).click();
    await expect(form.getByText("A duração deve ser múltiplo de 5 e maior que zero.")).toBeVisible();
  });

  test("serviço com agendamentos não pode ser excluído; desativar o esconde do site", async ({ page }) => {
    await login(page, undefined, panel("servicos"));
    const row = page.getByTestId("admin-service").filter({ hasText: name });
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: `Excluir ${name}` }).click();
    await expect(row.getByRole("alert")).toContainText("não pode ser excluído");

    await row.getByRole("button", { name: "Desativar" }).click();
    await expect(row).toContainText("inativo");
    await page.goto(site("servicos"));
    await expect(page.getByTestId("service-item").first()).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
  });
});

test.describe("horários e bloqueios", () => {
  test("domingo fechado não aparece disponível; ao abrir passa a aparecer", async ({ page }) => {
    const sundayOpen = async () => {
      const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
      const end = formatInTimeZone(new Date(Date.now() + 29 * 86_400_000), TZ, "yyyy-MM-dd");
      const { data } = await adminDb().rpc("get_available_dates", { p_shop_slug: SHOP, p_from: today, p_to: end, p_total_minutes: 30 });
      return (data as { day: string }[]).some((d) => new Date(`${d.day}T12:00:00Z`).getUTCDay() === 0);
    };
    expect(await sundayOpen()).toBe(false);

    await login(page, undefined, panel("horarios"));
    const sunday = page.getByTestId("hours-0");
    await sunday.getByLabel("Domingo aberto").check();
    await page.getByRole("button", { name: "Salvar horários" }).click();
    await expect(page.getByRole("status")).toHaveText("Horários salvos.");
    expect(await sundayOpen()).toBe(true);

    await sunday.getByLabel("Domingo aberto").uncheck();
    await page.getByRole("button", { name: "Salvar horários" }).click();
    await expect(page.getByRole("status")).toHaveText("Horários salvos.");
    expect(await sundayOpen()).toBe(false);
  });

  test("intervalo fora do funcionamento é recusado", async ({ page }) => {
    await login(page, undefined, panel("horarios"));
    await page.getByLabel("Terça início do intervalo").fill("08:00");
    await page.getByRole("button", { name: "Salvar horários" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("Terça: O intervalo deve estar dentro do horário de funcionamento.");
  });

  test("bloqueio com agendamentos lista-os, pede confirmação e não os cancela", async ({ page }) => {
    const a = await book("Barba", { pick: 4, minOffsetDays: 12 });
    const day = localDay(a.slot);
    await login(page, undefined, panel("bloqueios"));
    const form = page.getByRole("form", { name: "Novo bloqueio" });
    await form.getByLabel("Data").fill(day);
    await form.getByLabel("Motivo (opcional)").fill("Bloqueio E2E");
    await form.getByRole("button", { name: "Bloquear" }).click();
    const dialog = page.getByRole("alertdialog", { name: "Agendamentos no período" });
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId("affected-list")).toContainText("Cliente Painel");
    await dialog.getByRole("button", { name: "Confirmar bloqueio" }).click();
    await expect(page.getByText("Bloqueio salvo.")).toBeVisible();

    const { data: appt } = await adminDb().from("appointments").select("status").eq("id", a.id).single();
    expect(appt!.status).toBe("confirmed");
    const { data: slots } = await adminDb().rpc("get_available_slots", { p_shop_slug: SHOP, p_date: day, p_total_minutes: 30 });
    expect(slots).toEqual([]);
    await adminDb().from("schedule_blocks").delete().eq("reason", "Bloqueio E2E");
  });
});

test.describe("configurações", () => {
  test("novo WhatsApp aparece no site público", async ({ page }) => {
    const { data: before } = await adminDb().from("shops").select("whatsapp").eq("slug", SHOP).single();
    try {
      await login(page, undefined, panel("config"));
      await page.getByLabel("WhatsApp de contato").fill("(21) 98888-7777");
      await page.getByRole("button", { name: "Salvar" }).click();
      await expect(page.getByRole("status")).toHaveText("Configurações salvas.");
      await page.goto(site());
      await expect(page.locator("#contato")).toContainText("(21) 98888-7777");
    } finally {
      await adminDb().from("shops").update({ whatsapp: before!.whatsapp }).eq("slug", SHOP);
    }
  });

  test("editar o título do hero no painel muda a página inicial", async ({ page }) => {
    const { data: before } = await adminDb().from("shops").select("hero_title_line1,hero_title_line2").eq("slug", SHOP).single();
    try {
      await login(page, undefined, panel("config"));
      await page.getByLabel("Título — 1ª linha").fill("Seu corte,");
      await page.getByLabel("Título — 2ª linha (dourada)").fill("nossa assinatura.");
      await page.getByRole("button", { name: "Salvar" }).click();
      await expect(page.getByRole("status")).toHaveText("Configurações salvas.");
      await page.goto(site());
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toHaveText("Seu corte, nossa assinatura.");
      await expect(h1.locator(".text-gold")).toHaveText("nossa assinatura.");
    } finally {
      // Restaura pelo painel para invalidar o cache das páginas públicas.
      await page.goto(panel("config"));
      await page.getByLabel("Título — 1ª linha").fill(before!.hero_title_line1);
      await page.getByLabel("Título — 2ª linha (dourada)").fill(before!.hero_title_line2);
      await page.getByRole("button", { name: "Salvar" }).click();
      await expect(page.getByRole("status")).toHaveText("Configurações salvas.");
    }
  });

  test("link de Instagram sem https é recusado", async ({ page }) => {
    await login(page, undefined, panel("config"));
    await page.getByLabel("Instagram (link completo)").fill("instagram.com/x");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Use um endereço completo começando com https://")).toBeVisible();
  });
});
