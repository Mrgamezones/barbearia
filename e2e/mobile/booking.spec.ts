import { api, BOOKING_SERVICE, deviceEmail, devicePhone, deviceSlot, evidence, expect, expectNoHorizontalScroll, prettyPhone, test } from "./helpers";
import { SHOP, site } from "../helpers/shop";

/** Caixa de e-mail de teste (Mailpit) — acessível de dentro do container de simulação. */
async function findEmail(to: string): Promise<{ Subject: string } | null> {
  const base = process.env.MAILPIT_URL;
  if (!base) return null;
  for (let i = 0; i < 30; i++) {
    const r = (await fetch(`${base}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`).then((res) => res.json())) as { messages: { Subject: string }[] };
    if (r.messages?.length) return r.messages[0];
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`E-mail para ${to} não chegou na caixa de teste`);
}

test("agendamento completo por toque, link de gerenciamento e cancelamento", async ({ page, context, baseURL }, info) => {
  const slot = deviceSlot(info, "booking");
  const phone = devicePhone(info, 0);
  const email = deviceEmail(info);

  // 1. Serviços
  await page.goto(site("agendar"));
  await page.getByRole("checkbox", { name: /^Corte \+ Barba(?! \+)/ }).tap();
  await expect(page.getByTestId("bar-total")).toHaveText("R$ 70,00");
  await expect(page.getByTestId("bar-duration")).toHaveText("1h");
  await expectNoHorizontalScroll(page);
  await evidence(page, info, "1-serviços");
  await page.getByRole("button", { name: "Continuar" }).tap();

  // 2. Data (dia do plano; pode estar no mês seguinte) e 3. horário do aparelho
  await expect(page.getByRole("heading", { name: "Escolha a data e o horário" })).toBeVisible();
  const day = page.locator(`button[data-day="${slot.date}"]`);
  for (let i = 0; i < 2 && !(await day.isVisible()); i++) await page.getByRole("button", { name: "Próximo mês" }).tap();
  await day.tap();
  const time = page.getByRole("group", { name: "Horários disponíveis" }).getByRole("button", { name: slot.label, exact: true });
  await time.tap();
  await expect(time).toHaveAttribute("aria-pressed", "true");
  await expectNoHorizontalScroll(page);
  await evidence(page, info, "2-data-e-horário");
  await page.getByRole("button", { name: "Continuar" }).tap();

  // 4. Dados do cliente
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  await page.getByLabel("Nome", { exact: true }).fill(`Cliente ${info.project.name}`);
  await page.getByLabel("WhatsApp", { exact: true }).fill(prettyPhone(phone));
  await page.getByLabel("E-mail (opcional)").fill(email);
  await evidence(page, info, "3-dados");
  await page.getByRole("button", { name: "Continuar" }).tap();

  // 5. Resumo e confirmação
  await expect(page.getByRole("heading", { name: "Resumo do agendamento" })).toBeVisible();
  await evidence(page, info, "4-resumo");
  await page.getByRole("button", { name: "Confirmar agendamento" }).tap();
  await expect(page).toHaveURL(/\/agendamento\/[^/?]+\?novo=1/);
  await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
  const details = page.getByTestId("booking-details");
  await expect(details).toContainText(slot.label);
  await expect(details).toContainText(BOOKING_SERVICE);
  await expect(details).toContainText("R$ 70,00");
  await expect(page.getByTestId("booking-status")).toHaveText("Confirmado");
  await expectNoHorizontalScroll(page);
  await evidence(page, info, "5-confirmação");

  const mail = await findEmail(email);
  if (mail) expect(mail.Subject).toContain(slot.label);

  // Link de gerenciamento aberto "do zero" (como pelo WhatsApp/e-mail)
  const manageUrl = new URL(page.url()).pathname;
  const manage = await context.newPage();
  await manage.goto(manageUrl);
  await expect(manage.getByTestId("booking-details")).toContainText(slot.label);
  await expect(manage.getByTestId("booking-status")).toHaveText("Confirmado");
  await evidence(manage, info, "6-link-de-gerenciamento");

  // Cancelamento
  await manage.getByRole("button", { name: "Cancelar agendamento" }).tap();
  await manage.getByRole("button", { name: "Sim, cancelar" }).tap();
  await expect(manage.getByTestId("booking-status")).toHaveText("Cancelado");
  await evidence(manage, info, "7-cancelado");

  // O horário volta a ficar livre
  const free = await api<{ slot: string }[]>(baseURL!, "/rest/v1/rpc/get_available_slots", { p_shop_slug: SHOP, p_date: slot.date, p_total_minutes: 60 });
  expect(free.map((s) => new Date(s.slot).toISOString())).toContain(slot.iso);
});
