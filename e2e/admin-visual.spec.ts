import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ensureTestUsers, login } from "./helpers/admin";
import { panel } from "./helpers/shop";

async function axeViolations(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test.describe("painel com a identidade visual", () => {
  test.beforeAll(async () => ensureTestUsers());

  test("login sem violações de acessibilidade e com o fundo escuro da identidade", async ({ page }) => {
    await page.goto("/painel/login");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(11, 11, 12)");
    expect(await axeViolations(page)).toEqual([]);
  });

  const pages = [
    [panel(), "Agenda"],
    [panel("novo"), "Novo agendamento"],
    [panel("servicos"), "Serviços"],
    [panel("horarios"), "Horários"],
    [panel("bloqueios"), "Bloqueios"],
    [panel("config"), "Configurações"],
  ] as const;

  test("todas as telas do painel sem violações (axe)", async ({ page }) => {
    await login(page);
    for (const [path] of pages) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await axeViolations(page), path).toEqual([]);
    }
  });

  test("navegação do painel por teclado, com foco visível", async ({ page }) => {
    await login(page);
    await page.goto(panel());
    const nav = page.getByRole("navigation", { name: "Painel" });
    // Tab até o primeiro item do menu do painel.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      if (await nav.getByRole("link", { name: "Agenda", exact: true }).evaluate((el) => el === document.activeElement)) break;
    }
    await expect(nav.getByRole("link", { name: "Agenda", exact: true })).toBeFocused();
    for (const [path, label] of pages.slice(1)) {
      await page.keyboard.press("Tab");
      const link = nav.getByRole("link", { name: label, exact: true });
      await expect(link).toBeFocused();
      expect(await link.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
      if (path === panel("config")) {
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/painel\/barbearia-teste\/config$/);
        await expect(page.getByRole("heading", { name: "Configurações", level: 1 })).toBeVisible();
        await expect(nav.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
      }
    }
  });
});
