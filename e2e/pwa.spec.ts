import { devices, expect, test, type Page } from "@playwright/test";
import { serviceId } from "./helpers/slots";
import { site } from "./helpers/shop";

async function waitForServiceWorker(page: Page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker?.ready;
    return !!reg?.active && !!navigator.serviceWorker.controller;
  }, undefined, { timeout: 30_000 });
}

test.describe("PWA", () => {
  test.skip(() => test.info().project.name !== "mobile", "roda no perfil Android (Chromium)");

  test("manifest válido com ícones 192/512/maskable, standalone e cor de tema", async ({ request }) => {
    const res = await request.get(site("manifest.webmanifest"));
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#0b0b0c");
    expect(m.background_color).toBe("#0b0b0c");
    expect(m.name).toContain("Barbearia");
    const sizes = m.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
    for (const icon of m.icons) expect((await request.get(icon.src)).ok()).toBe(true);
  });

  test("Chrome considera o site instalável (sem erros de instalabilidade)", async ({ page }) => {
    await page.goto(site());
    await waitForServiceWorker(page);
    const cdp = await page.context().newCDPSession(page);
    const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
    // Contextos de teste são sempre "anônimos" no headless novo; o Chrome não instala PWAs em janela anônima.
    // Esse código reflete o ambiente de teste, não o site, e por isso é ignorado.
    expect(installabilityErrors.filter((e) => e.errorId !== "in-incognito")).toEqual([]);
  });

  test("offline: home e serviços abrem do cache; horários avisam que precisa de conexão; páginas novas mostram /offline", async ({ page, context }) => {
    const barba = await serviceId("Barba");
    await page.goto(site());
    await waitForServiceWorker(page);
    // Visita as páginas para que fiquem em cache.
    await page.goto(site("servicos"));
    await expect(page.getByTestId("service-item").first()).toBeVisible();
    await page.goto(`${site("agendar")}?servicos=${barba}`);
    await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
    await page.goto(site());
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Com a emulação offline, o Chromium às vezes descarta a navegação (goto retorna null e a URL não muda).
    // Por isso cada navegação confere a URL e o título da página esperada, e é refeita se for descartada.
    async function gotoOffline(path: string, title: RegExp) {
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.goto(path).catch(() => null);
        if (new URL(page.url()).pathname === path.split("?")[0]) break;
        await page.waitForTimeout(500);
      }
      await expect(page).toHaveURL(new RegExp(path.split("?")[0].replace(/\//g, "\\/") + "(\\?|$)"));
      await expect(page).toHaveTitle(title);
    }

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    await gotoOffline(site("servicos"), /^Serviços/);
    await expect(page.getByRole("heading", { name: "Serviços", level: 1 })).toBeVisible();

    await gotoOffline(`${site("agendar")}?servicos=${barba}`, /^Agendar horário/);
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByRole("status")).toContainText("É preciso estar conectado para ver os horários livres");

    await gotoOffline("/pagina-nunca-visitada", /^Sem conexão/);
    await expect(page.getByRole("heading", { name: "Você está offline" })).toBeVisible();
    await context.setOffline(false);
  });
});

test.describe("dica de instalação no iOS", () => {
  test.skip(() => test.info().project.name !== "mobile", "roda uma vez");
  // Perfil do iPhone (tela, toque e user agent do Safari) sobre o Chromium do projeto.
  const { viewport, userAgent, deviceScaleFactor, isMobile, hasTouch } = devices["iPhone 13"];
  test.use({ viewport, userAgent, deviceScaleFactor, isMobile, hasTouch });

  test("aparece no Safari do iPhone, pode ser dispensada e é lembrada", async ({ page }) => {
    await page.goto(site());
    const hint = page.getByRole("region", { name: "Instalar o app" });
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Adicionar à Tela de Início");
    await hint.getByRole("button", { name: "Dispensar dica" }).click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hint).toHaveCount(0);
  });

  test("não aparece no Android", async ({ browser }) => {
    const ctx = await browser.newContext({ ...devices["Pixel 7"] });
    const page = await ctx.newPage();
    await page.goto(test.info().project.use.baseURL + "/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Instalar o app" })).toHaveCount(0);
    await ctx.close();
  });
});
