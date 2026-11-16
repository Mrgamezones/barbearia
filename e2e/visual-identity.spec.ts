import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { site } from "./helpers/shop";

test.describe("identidade visual (/estilo)", () => {
  test.skip(() => test.info().project.name !== "desktop", "roda uma vez");

  test("escala tipográfica: serifada nos títulos, Inter no texto, eyebrow em caixa alta dourada", async ({ page }) => {
    await page.goto(site("estilo"));
    const style = (id: string) =>
      page.getByTestId(id).evaluate((el) => {
        const s = getComputedStyle(el);
        return { family: s.fontFamily, size: parseFloat(s.fontSize), transform: s.textTransform, spacing: s.letterSpacing, color: s.color };
      });
    const display = await style("type-display");
    expect(display.family).toMatch(/Cormorant/i);
    expect(display.size).toBeGreaterThanOrEqual(56);
    const h2 = await style("type-h2");
    expect(h2.family).toMatch(/Cormorant/i);
    expect(h2.size).toBe(36);
    const h3 = await style("type-h3");
    expect(h3.family).toMatch(/Inter/i);
    expect(h3.size).toBe(20);
    expect((await style("type-body")).size).toBe(16);
    expect((await style("type-small")).size).toBe(14);
    const eyebrow = await style("type-eyebrow");
    expect(eyebrow.family).toMatch(/Inter/i);
    expect(eyebrow.size).toBe(12);
    expect(eyebrow.transform).toBe("uppercase");
    expect(parseFloat(eyebrow.spacing)).toBeGreaterThan(2);
    expect(eyebrow.color).toBe("rgb(200, 161, 101)");
  });

  test("nenhuma serifada abaixo de 24 px no site", async ({ page }) => {
    for (const path of ["/", site("agendar"), site("servicos"), site("estilo")]) {
      await page.goto(path);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
          .filter((el) => /Cormorant/i.test(getComputedStyle(el).fontFamily) && parseFloat(getComputedStyle(el).fontSize) < 24)
          .map((el) => `${el.tagName} "${el.textContent!.trim().slice(0, 30)}" ${getComputedStyle(el).fontSize}`),
      );
      expect(small, path).toEqual([]);
    }
  });

  test("fontes lentas: texto visível na hora com fallback (font-display: swap)", async ({ page }) => {
    // Simula rede lenta só para as fontes: seguram 8 s antes de responder.
    await page.route(/\.woff2$/, async (route) => {
      await new Promise((r) => setTimeout(r, 8_000));
      await route.continue().catch(() => {});
    });
    await page.goto(site("estilo"), { waitUntil: "domcontentloaded" });
    const display = page.getByTestId("type-display");
    await expect(display).toBeVisible({ timeout: 2_000 });
    // As fontes ainda não chegaram, mas o texto já tem largura (está sendo desenhado com o fallback).
    const state = await page.evaluate(() => ({
      loaded: [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family),
      width: document.querySelector("[data-testid=type-display]")!.getBoundingClientRect().width,
      swap: [...document.styleSheets].flatMap((s) => {
        try {
          // Só as fontes web (com url); as de fallback usam local() e não baixam nada.
          return [...s.cssRules]
            .filter((r) => r instanceof CSSFontFaceRule && /url\(/.test(r.style.getPropertyValue("src")))
            .map((r) => (r as CSSFontFaceRule).style.getPropertyValue("font-display"));
        } catch {
          return [];
        }
      }),
    }));
    expect(state.loaded.filter((f) => /Cormorant|Inter/i.test(f) && !/Fallback/i.test(f))).toEqual([]);
    expect(state.width).toBeGreaterThan(100);
    expect(state.swap.length).toBeGreaterThan(0);
    expect(new Set(state.swap)).toEqual(new Set(["swap"]));
  });

  test("componentes base sem violações de acessibilidade e com foco distinto da seleção", async ({ page }) => {
    await page.goto(site("estilo"));
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);

    const chips = page.getByRole("group", { name: "Exemplo de horários" }).getByRole("button");
    await expect(chips.nth(1)).toHaveAttribute("aria-pressed", "true");
    await chips.nth(1).focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(chips.nth(1)).toBeFocused();
    const style = () => chips.nth(1).evaluate((el) => {
      const s = getComputedStyle(el);
      return { outline: s.outlineStyle, outlineColor: s.outlineColor, bg: s.backgroundColor };
    });
    // Espera a transição de cor terminar e confere o anel claro, diferente do dourado da seleção.
    await expect.poll(async () => (await style()).outlineColor).toBe("rgb(244, 241, 234)");
    const focused = await style();
    expect(focused.outline).not.toBe("none");
    expect(focused.outlineColor).not.toBe(focused.bg);
  });
});

test.describe("identidade nas páginas de estado", () => {
  test.skip(() => test.info().project.name !== "mobile", "roda uma vez, no celular");

  async function expectIdentity(page: import("@playwright/test").Page) {
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(11, 11, 12)");
    const h1 = page.getByRole("heading", { level: 1 });
    expect(await h1.evaluate((e) => getComputedStyle(e).fontFamily)).toMatch(/Cormorant/i);
    await expect(page.getByRole("link", { name: /— início$/ }).first()).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }

  test("404 com a identidade", async ({ page }) => {
    const res = await page.goto("/pagina-que-nao-existe");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
    await expectIdentity(page);
  });

  test("offline com a identidade", async ({ page }) => {
    await page.goto("/offline");
    await expect(page.getByRole("heading", { name: "Você está offline" })).toBeVisible();
    await expectIdentity(page);
  });

  test("link de gerenciamento inválido com a identidade", async ({ page }) => {
    await page.goto(site() + "/agendamento/token-que-nao-existe-1234567890");
    await expect(page.getByRole("heading", { name: "Agendamento não encontrado" })).toBeVisible();
    await expectIdentity(page);
  });
});
