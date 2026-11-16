// Captura as telas do sistema usadas na apostila de vendas (docs/vendas/telas/*.png).
// Requer o site local no ar com os dados do seed (npm run docker:up, ou supabase start + npm run dev).
// Uso: npm run handbook:screens            (HANDBOOK_URL muda o endereço; padrão http://localhost:3000)
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "docs/vendas/telas");
const baseURL = process.env.HANDBOOK_URL ?? "http://localhost:3000";

// Só dados de exemplo: admin local do seed e um cliente fictício.
const ADMIN = { email: "admin@barbearia.local", password: "admin-local-123" };
const CUSTOMER = { name: "João Silva", phone: "(11) 98888-7777", email: "joao@exemplo.com" };

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--lang=pt-BR"] });
const context = await browser.newContext({
  baseURL,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});
// Esconde o indicador de desenvolvimento do Next, que não existe no site publicado.
await context.addInitScript(() => {
  const hide = () => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.documentElement.appendChild(style);
  };
  if (document.documentElement) hide();
  else document.addEventListener("DOMContentLoaded", hide);
});
const page = await context.newPage();
page.setDefaultTimeout(30_000);

const shots = [];
async function shot(name, { fullPage = false, clip } = {}) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage, clip });
  shots.push(name);
  console.log(`  ✓ ${name}.png`);
}

try {
  console.log(`Capturando telas de ${baseURL}`);

  // Site público
  await page.goto("/");
  await shot("01-inicio");
  await page.goto("/barbearia/demonstracao/servicos");
  await shot("02-servicos");

  // Agendamento, passo a passo
  await page.goto("/barbearia/demonstracao/agendar");
  await page.waitForLoadState("networkidle").catch(() => {});
  for (const name of [/^Corte de cabelo/, /^Barba/]) {
    const box = page.getByRole("checkbox", { name });
    // Em modo de desenvolvimento a página pode demorar a responder ao toque: repete até marcar.
    for (let i = 0; i < 10 && !(await box.isChecked()); i++) {
      await box.click();
      await page.waitForTimeout(500);
    }
    if (!(await box.isChecked())) throw new Error(`Não consegui marcar o serviço ${name}`);
  }
  await shot("03-agendar-servicos");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("heading", { name: "Escolha a data e o horário" }).waitFor();
  const days = page.locator("button[data-day]:enabled");
  await days.first().waitFor();
  if ((await days.count()) < 3 && (await page.getByRole("button", { name: "Próximo mês" }).isVisible())) {
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await days.first().waitFor();
  }
  const day = days.nth(Math.min(2, (await days.count()) - 1));
  const bookedDate = await day.getAttribute("data-day");
  await day.click();
  const slots = page.getByRole("group", { name: "Horários disponíveis" }).getByRole("button");
  await slots.first().waitFor();
  await slots.nth(Math.min(3, (await slots.count()) - 1)).click();
  await shot("04-agendar-data-horario");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("heading", { name: "Seus dados" }).waitFor();
  await page.getByLabel("Nome", { exact: true }).fill(CUSTOMER.name);
  await page.getByLabel("WhatsApp", { exact: true }).fill(CUSTOMER.phone);
  await page.getByLabel("E-mail (opcional)").fill(CUSTOMER.email);
  await shot("05-agendar-dados");
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByRole("heading", { name: "Resumo do agendamento" }).waitFor();
  await shot("06-agendar-resumo");
  await page.getByRole("button", { name: "Confirmar agendamento" }).click();

  await page.getByRole("heading", { name: "Agendamento confirmado!" }).waitFor();
  await shot("07-agendar-confirmacao");

  // Página do agendamento aberta pelo link (como o cliente vê depois)
  const manageUrl = new URL(page.url()).pathname;
  await page.goto(manageUrl);
  await page.getByTestId("booking-details").waitFor();
  // Recorte: o navegador de captura sempre bloqueia notificações e mostra um aviso que o cliente real não vê.
  const reminder = await page.getByRole("button", { name: "Ativar lembrete" }).boundingBox();
  await shot("08-link-do-agendamento", {
    clip: { x: 0, y: 0, width: 390, height: Math.min(844, Math.round((reminder?.y ?? 780) + (reminder?.height ?? 0) + 6)) },
  });

  // Painel do barbeiro
  await page.goto("/painel/demonstracao");
  await page.getByLabel("E-mail").fill(ADMIN.email);
  await page.getByLabel("Senha").fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/painel/login"));

  await page.goto(`/painel/demonstracao?data=${bookedDate}`);
  await page.getByText(CUSTOMER.name).first().waitFor();
  await shot("09-painel-agenda");
  await page.goto("/painel/demonstracao/servicos");
  await shot("10-painel-servicos");
  await page.goto("/painel/demonstracao/horarios");
  await shot("11-painel-horarios");
  await page.goto("/painel/demonstracao/config");
  await shot("12-painel-configuracoes");

  // Cancela o agendamento de exemplo, para o script poder rodar de novo (limite de 2 por número).
  await page.goto(manageUrl);
  await page.getByRole("button", { name: "Cancelar agendamento" }).click();
  await page.getByRole("button", { name: "Sim, cancelar" }).click();
  await page.getByTestId("booking-status").filter({ hasText: "Cancelado" }).waitFor();

  console.log(`\n${shots.length} telas salvas em ${outDir}`);
} catch (err) {
  await page.screenshot({ path: resolve(outDir, "_erro.png") }).catch(() => {});
  console.error(`\nFalhou depois de ${shots.length} telas: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
