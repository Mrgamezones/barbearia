import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { FullConfig } from "@playwright/test";
import { api, BOOKING_SERVICE, PANEL_SERVICE, PLAN_FILE, type Plan } from "./helpers";

/** Pacote @playwright/test e imagem do container precisam ser da mesma versão (navegadores da imagem). */
function checkPlaywrightVersion() {
  const image = process.env.PLAYWRIGHT_IMAGE_VERSION;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = (require("@playwright/test/package.json") as { version: string }).version;
  if (image && image !== pkg) {
    throw new Error(`Versão do Playwright divergente: imagem v${image} × pacote instalado ${pkg}. Rode npm install e tente de novo.`);
  }
}

async function waitForApp(baseURL: string) {
  for (let i = 0; i < 60; i++) {
    const ok = await fetch(`${baseURL}/api/health`).then(
      (r) => r.ok,
      () => false,
    );
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`App não respondeu em ${baseURL}/api/health`);
}

/**
 * Calcula UMA vez, a partir do banco recém-resetado, os horários de cada aparelho.
 * Assim a escolha não depende da ordem em que os aparelhos agendam em paralelo.
 */
async function buildPlan(baseURL: string): Promise<Plan> {
  const svc = async (name: string) => {
    const rows = await api<{ id: string; duration_min: number }[]>(baseURL, `/rest/v1/services?select=id,duration_min&name=eq.${encodeURIComponent(name)}`);
    if (!rows[0]) throw new Error(`Serviço não encontrado no seed: ${name}`);
    return rows[0];
  };
  const booking = await svc(BOOKING_SERVICE);
  const panel = await svc(PANEL_SERVICE);

  // A partir de amanhã: o cancelamento pelo link exige 2 h de antecedência.
  const day = (offset: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offset * 86_400_000));
  const dates = await api<{ day: string }[]>(baseURL, "/rest/v1/rpc/get_available_dates", {
    p_from: day(1),
    p_to: day(45),
    p_total_minutes: booking.duration_min,
  });
  if (dates.length < 2) throw new Error("São necessários ao menos 2 dias abertos nos próximos 45 dias");
  const slots = (date: string, minutes: number) =>
    api<{ slot: string }[]>(baseURL, "/rest/v1/rpc/get_available_slots", { p_date: date, p_total_minutes: minutes }).then((r) =>
      r.map((s) => new Date(s.slot).toISOString()),
    );

  return {
    booking: { serviceId: booking.id, date: dates[0].day, slots: await slots(dates[0].day, booking.duration_min) },
    panel: { serviceId: panel.id, date: dates[1].day, slots: await slots(dates[1].day, panel.duration_min) },
  };
}

export default async function globalSetup(config: FullConfig) {
  checkPlaywrightVersion();
  const baseURL = config.projects[0].use.baseURL!;
  await waitForApp(baseURL);
  const plan = await buildPlan(baseURL);
  mkdirSync(dirname(PLAN_FILE), { recursive: true });
  writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
}
