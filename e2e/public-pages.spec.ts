import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { adminDb } from "./helpers/db";

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
}

async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("guia de estilo e componentes base", () => {
  test("não tem violações de acessibilidade (axe)", async ({ page }) => {
    await page.goto("/estilo");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("alvos de toque têm pelo menos 44 px e foco é visível", async ({ page }) => {
    await page.goto("/estilo");
    for (const el of await page.locator("main button, main a, main input").all()) {
      const box = await el.boundingBox();
      if (!box) continue;
      expect(box.height, await el.evaluate((e) => e.outerHTML.slice(0, 80))).toBeGreaterThanOrEqual(44);
    }
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
  });
});

test.describe("páginas públicas", () => {
  test("home mostra hero, CTA para o painel, endereço e WhatsApp no rodapé", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Corte na medida, do seu jeito.");
    await expect(page.getByRole("link", { name: /agendar agora/i })).toHaveAttribute("href", "#agendar");
    await expect(page.locator("#contato")).toContainText("Rua Exemplo");
    await expect(page.locator("#contato")).toContainText("(11) 99999-9999");
    await expectNoAxeViolations(page);
  });

  test("/servicos lista serviços ativos com preço e duração", async ({ page }) => {
    await page.goto("/servicos");
    const items = page.getByTestId("service-item");
    await expect(items.first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Corte de cabelo", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("R$ 45,00").first()).toBeVisible();
    await expect(page.getByText("30 min").first()).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("rodapé mostra domingo fechado", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("footer-hours")).toContainText("Domingo — Fechado");
  });

  for (const path of ["/", "/servicos", "/agendar"]) {
    test(`sem rolagem horizontal em 320 px: ${path}`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto(path);
      await expectNoHorizontalScroll(page);
    });
  }
});

test.describe("serviço inativo", () => {
  const name = `Serviço inativo E2E ${Date.now()}`;
  test.beforeAll(async () => {
    const { error } = await adminDb().from("services").insert({ name, price_cents: 1000, duration_min: 30, active: false });
    expect(error).toBeNull();
  });
  test.afterAll(async () => {
    await adminDb().from("services").delete().eq("name", name);
  });

  test("não aparece na listagem pública", async ({ page }) => {
    await page.goto("/servicos");
    await expect(page.getByTestId("service-item").first()).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
  });
});
