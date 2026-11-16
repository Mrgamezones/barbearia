import { expect, test, type Page } from "@playwright/test";
import { site } from "./helpers/shop";

// Regressão visual da identidade: home e painel de agendamento em 360, 768 e 1280 px.
// As imagens de referência ficam em e2e/visual.spec.ts-snapshots/ (geradas no Chromium local).
// Atualizar depois de uma mudança visual intencional: npx playwright test e2e/visual.spec.ts --update-snapshots
test.describe("regressão visual", () => {
  test.skip(() => test.info().project.name !== "desktop", "controla a largura manualmente; roda uma vez");
  // As referências são do Chromium no Windows; o CI (Linux) renderiza fontes de outro jeito.
  test.skip(!!process.env.CI, "referências geradas localmente");

  const widths = [360, 768, 1280];

  async function settle(page: Page) {
    await page.evaluate(async () => {
      // Rola até o fim para carregar as fotos com lazy loading e volta ao topo.
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 30));
      }
      window.scrollTo(0, 0);
      await document.fonts.ready;
    });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0));
    await page.waitForTimeout(300);
  }

  for (const width of widths) {
    test(`home em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(site());
      await settle(page);
      await expect(page).toHaveScreenshot(`home-${width}.png`, {
        fullPage: true,
        animations: "disabled",
        // Ano do copyright muda; o restante é estável (painel no estado inicial, sem calendário).
        mask: [page.getByText(/^© \d{4}/)],
        maxDiffPixelRatio: 0.002,
      });
    });

    test(`painel de agendamento em ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(site("agendar"));
      await settle(page);
      await expect(page.locator("#agendar")).toHaveScreenshot(`painel-${width}.png`, { animations: "disabled", maxDiffPixelRatio: 0.002 });
    });
  }
});
