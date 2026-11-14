import { createHash, randomBytes } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { adminDb } from "./db";
import { serviceId } from "./slots";

/** IP aleatório (faixa de documentação) para não esbarrar no rate limit entre testes. */
export function randomIp(): string {
  return `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
}

/** Cria um agendamento direto no banco (ignora regras de antecedência), com token conhecido. */
export async function insertAppointment(opts: {
  startsAt: Date;
  minutes?: number;
  phone: string;
  serviceName?: string;
  status?: string;
  whatsappOptIn?: boolean;
}) {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const minutes = opts.minutes ?? 30;
  const svcId = await serviceId(opts.serviceName ?? "Corte de cabelo");
  const { data, error } = await adminDb()
    .from("appointments")
    .insert({
      customer_name: "Cliente Teste",
      customer_phone: opts.phone,
      starts_at: opts.startsAt.toISOString(),
      ends_at: new Date(opts.startsAt.getTime() + minutes * 60_000).toISOString(),
      total_cents: 4500,
      manage_token_hash: hash,
      status: opts.status ?? "confirmed",
      whatsapp_opt_in: opts.whatsappOptIn ?? false,
    })
    .select("id")
    .single();
  if (error) throw error;
  await adminDb().from("appointment_services").insert({
    appointment_id: data.id,
    service_id: svcId,
    name_snapshot: opts.serviceName ?? "Corte de cabelo",
    price_cents_snapshot: 4500,
    duration_min_snapshot: minutes,
  });
  return { id: data.id as string, token };
}

/**
 * Avança para a próxima etapa no celular (botão "Continuar" da etapa visível).
 * No desktop (≥ 1024 px) as quatro colunas ficam visíveis e não há "Continuar": não faz nada.
 */
export async function continueIfMobile(page: Page) {
  const button = page.getByRole("button", { name: "Continuar" });
  if (await button.count()) await button.click();
}

/** Seleciona serviços pelo nome na etapa 1 e avança. */
export async function chooseServices(page: Page, names: string[]) {
  for (const n of names) await page.getByRole("checkbox", { name: new RegExp(`^${n}`) }).click();
  await continueIfMobile(page);
  await expect(page.getByRole("heading", { name: "Escolha a data e o horário" })).toBeVisible();
}

/** Escolhe um dia disponível e um horário (índice aleatório para evitar colisões entre testes). */
export async function chooseDateAndTime(page: Page): Promise<string> {
  const days = page.locator("button[data-day]:enabled");
  await expect(days.first()).toBeVisible();
  // Se o mês atual tiver poucos dias livres, avança para o próximo mês.
  if ((await days.count()) < 3 && (await page.getByRole("button", { name: "Próximo mês" }).isVisible())) {
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(days.first()).toBeVisible();
  }
  const count = await days.count();
  await days.nth(Math.floor(Math.random() * count)).click();
  const slots = page.getByRole("group", { name: "Horários disponíveis" }).getByRole("button");
  await expect(slots.first()).toBeVisible();
  const n = await slots.count();
  const chosen = slots.nth(Math.floor(Math.random() * n));
  const label = (await chosen.textContent())!.trim();
  await chosen.click();
  await expect(chosen).toHaveAttribute("aria-pressed", "true");
  await continueIfMobile(page);
  await expect(page.getByRole("heading", { name: "Seus dados" })).toBeVisible();
  return label;
}

/** Envia os dados do cliente: "Continuar" no celular; no desktop, valida pelo botão de confirmar. */
export async function submitCustomer(page: Page) {
  const button = page.getByRole("button", { name: "Continuar" });
  if (await button.count()) await button.click();
  else await page.getByRole("button", { name: "Confirmar agendamento" }).click();
}

export async function fillCustomer(page: Page, phone: string, name = "Cliente E2E") {
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("WhatsApp", { exact: true }).fill(phone);
  await continueIfMobile(page);
  await expect(page.getByRole("heading", { name: "Resumo do agendamento" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar agendamento" })).toBeEnabled();
}

/** "+5511912345678" -> "(11) 91234-5678" */
export function prettyPhone(e164: string) {
  const d = e164.slice(3);
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
