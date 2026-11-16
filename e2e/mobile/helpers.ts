import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";
import { EMULATION_LIMITATIONS, MOBILE_DEVICES, type MobileProject } from "./devices";

export const BOOKING_SERVICE = "Corte + Barba";
export const PANEL_SERVICE = "Corte de cabelo";
/** Dono da barbearia de teste no seed (os cenários mobile rodam nela). */
export const LOCAL_ADMIN = { email: "dono-teste@barbearia.local", password: "admin-local-123" };
export const PLAN_FILE = join(__dirname, "..", "results", "plan.json");
const TZ = "America/Sao_Paulo";

export type Plan = {
  booking: { serviceId: string; date: string; slots: string[] };
  panel: { serviceId: string; date: string; slots: string[] };
};

// ---------------------------------------------------------------------------
// Acesso ao Supabase pelo proxy do próprio site (/supabase): funciona igual no host e no container.

let anonKey: Promise<string> | undefined;
function publicAnonKey(baseURL: string) {
  anonKey ??= fetch(`${baseURL}/api/public-config`)
    .then((r) => r.json())
    .then((c: { anonKey: string }) => c.anonKey);
  return anonKey;
}

/** PostgREST via proxy: GET sem corpo, POST com corpo. `serviceRole` usa a chave de serviço do .env. */
export async function api<T>(
  baseURL: string,
  path: string,
  body?: unknown,
  { serviceRole = false, method }: { serviceRole?: boolean; method?: string } = {},
): Promise<T> {
  const key = serviceRole ? process.env.SUPABASE_SERVICE_ROLE_KEY : await publicAnonKey(baseURL);
  if (!key) throw new Error("Defina SUPABASE_SERVICE_ROLE_KEY no .env");
  const res = await fetch(`${baseURL}/supabase${path}`, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ---------------------------------------------------------------------------
// Dados próprios de cada aparelho (índice 0–3 pela ordem em devices.ts).

export function deviceIndex(info: TestInfo): number {
  const i = MOBILE_DEVICES.findIndex((d) => d.project === info.project.name);
  if (i < 0) throw new Error(`Projeto fora da lista de aparelhos: ${info.project.name}`);
  return i;
}


/** Celular SP válido e único por aparelho e cenário: +55 11 999 <aparelho:2> <cenário:4>. */
export function devicePhone(info: TestInfo, scenario = 0): string {
  return `+5511999${String(deviceIndex(info)).padStart(2, "0")}${String(scenario).padStart(4, "0")}`;
}

/** "+5511999000000" -> "(11) 99900-0000" (como o cliente digita). */
export function prettyPhone(e164: string) {
  const d = e164.slice(3);
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const deviceEmail = (info: TestInfo) => `${info.project.name as MobileProject}@teste.local`;

/** IP próprio por aparelho: o limite de agendamentos é por IP e todos os navegadores saem do mesmo container. */
export const deviceIp = (info: TestInfo) => `203.0.113.${10 + deviceIndex(info)}`;

export function readPlan(): Plan {
  return JSON.parse(readFileSync(PLAN_FILE, "utf8")) as Plan;
}

export const timeLabel = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** Horário do aparelho: slot de posição `índice * 4` da lista calculada no global setup (banco no estado do seed). */
export function deviceSlot(info: TestInfo, kind: keyof Plan): { serviceId: string; date: string; iso: string; label: string } {
  const p = readPlan()[kind];
  const iso = p.slots[deviceIndex(info) * 4];
  if (!iso) throw new Error(`Sem horário na posição ${deviceIndex(info) * 4} em ${p.date}`);
  return { serviceId: p.serviceId, date: p.date, iso, label: timeLabel(iso) };
}

// ---------------------------------------------------------------------------
// Evidências e verificações comuns

/** Screenshot de página inteira anexada ao relatório (evidência, não comparação visual). */
export async function evidence(page: Page, info: TestInfo, name: string) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await info.attach(name, { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
}

/** A página não pode rolar na horizontal no aparelho. */
export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, `sem rolagem horizontal: conteúdo ${scroll}px, tela ${width}px`).toBeLessThanOrEqual(width);
}

/** goto que tolera ser interrompido (ex.: ao voltar a conexão o navegador refaz uma navegação pendente). */
export async function gotoStable(page: Page, path: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(path);
      return;
    } catch (e) {
      if (attempt >= 3 || !/interrupted by another navigation/.test(String(e))) throw e;
      await page.waitForLoadState("load").catch(() => {});
    }
  }
}

export async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker?.ready;
      return !!reg?.active && !!navigator.serviceWorker.controller;
    },
    undefined,
    { timeout: 30_000 },
  );
}

/**
 * `test` da simulação: cada cenário recebe o IP do aparelho e a anotação das limitações da emulação
 * (visível no relatório HTML).
 */
export const test = base.extend<{ deviceSetup: void }>({
  deviceSetup: [
    async ({ context }, use, info) => {
      info.annotations.push({ type: "Limitações da emulação", description: EMULATION_LIMITATIONS });
      await context.setExtraHTTPHeaders({ "x-forwarded-for": deviceIp(info) });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
