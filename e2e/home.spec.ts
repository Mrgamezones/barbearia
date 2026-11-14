import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { contrast } from "../lib/contrast";
import { adminDb } from "./helpers/db";
import { chooseDateAndTime, chooseServices, fillCustomer, prettyPhone, randomIp } from "./helpers/booking";
import { cleanupByPhone, testPhone } from "./helpers/slots";

const isProject = (name: string) => test.info().project.name === name;

test.describe("cabeçalho", () => {
  test("ordem das seções e âncoras", async ({ page }) => {
    await page.goto("/");
    const top = async (id: string) => {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
      return page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    };
    const [inicio, agendar, galeria, contato] = [await top("inicio"), await top("agendar"), await top("galeria"), await top("contato")];
    await expect(page.locator("#servicos")).toHaveCount(1);
    expect(inicio).toBeLessThan(agendar);
    expect(agendar).toBeLessThan(galeria);
    expect(galeria).toBeLessThan(contato);
    await expect(page.getByTestId("features")).toBeVisible();
  });

  test("desktop: navegação por âncora rola até a galeria sem o cabeçalho cobrir o título", async ({ page }) => {
    test.skip(!isProject("desktop"), "menu horizontal só no desktop");
    await page.goto("/");
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Galeria" }).click();
    const title = page.getByRole("heading", { name: "Nosso trabalho" });
    await expect(title).toBeInViewport();
    await expect
      .poll(async () => {
        const header = await page.locator("header").first().boundingBox();
        const t = await title.boundingBox();
        return t!.y - (header!.y + header!.height);
      })
      .toBeGreaterThanOrEqual(0);
    // Fundo com blur depois de rolar.
    await expect(page.locator("header").first()).toHaveClass(/backdrop-blur/);
  });

  test("celular: menu em tela cheia com foco preso, Esc fecha e devolve o foco", async ({ page }) => {
    test.skip(!isProject("mobile"), "menu em tela cheia só abaixo de 1024 px");
    await page.goto("/");
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeHidden();
    await expect(page.getByRole("banner").getByRole("link", { name: /Agendar/ })).toBeVisible();
    const openButton = page.getByRole("button", { name: "Abrir menu" });
    await openButton.click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    const box = await menu.boundingBox();
    const viewport = page.viewportSize()!;
    expect(box!.width).toBe(viewport.width);
    expect(box!.height).toBeGreaterThanOrEqual(viewport.height - 1);

    // Foco começa dentro e fica preso: Tab várias vezes nunca sai do menu.
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      expect(await menu.evaluate((m) => m.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    expect(await menu.evaluate((m) => m.contains(document.activeElement))).toBe(true);

    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(openButton).toBeFocused();

    // Item do menu navega até a seção e fecha o menu.
    await openButton.click();
    await menu.getByRole("link", { name: "Galeria" }).click();
    await expect(menu).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Nosso trabalho" })).toBeInViewport();
  });
});

test.describe("hero", () => {
  test("'Agendar agora' rola até o painel e foca a primeira etapa", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Agendar agora/ }).click();
    const step1 = page.getByRole("heading", { name: "Escolha o serviço" });
    await expect(step1).toBeFocused();
    await expect(page.getByRole("heading", { name: "Agende seu horário" })).toBeInViewport();
    await expect(page).toHaveURL(/#agendar$/);
  });

  test("título e subtítulo com contraste AA sobre a foto", async ({ page }) => {
    await page.goto("/");
    const hero = page.getByTestId("hero");
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
    for (const selector of ["h1 span:first-child", "h1 span.text-gold", "p.eyebrow", "h1 + p"]) {
      const el = hero.locator(selector).first();
      const color = await el.evaluate((e) => getComputedStyle(e).color);
      const rgb = color.match(/\d+/g)!.slice(0, 3).map(Number) as [number, number, number];
      // Esconde só o texto para fotografar o fundo exatamente atrás dele (foto + gradiente).
      // Área ocupada pelas letras (não a caixa do bloco, que pode se estender sobre a foto sem texto).
      const box = await el.evaluate((e) => {
        const range = document.createRange();
        range.selectNodeContents(e);
        const r = range.getBoundingClientRect();
        return { x: r.x, y: r.y + window.scrollY, width: r.width, height: r.height };
      });
      await el.evaluate((e) => ((e as HTMLElement).style.color = "transparent"));
      const png = await page.screenshot({ clip: { ...box, y: box.y - (await page.evaluate(() => window.scrollY)) }, animations: "disabled" });
      await el.evaluate((e) => ((e as HTMLElement).style.color = ""));
      const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let worst = Infinity;
      for (let i = 0; i < data.length; i += info.channels) {
        worst = Math.min(worst, contrast(rgb, [data[i], data[i + 1], data[i + 2]]));
      }
      const fontSize = await el.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
      const minimum = fontSize >= 24 ? 3 : 4.5;
      expect(worst, `${selector} (${fontSize}px)`).toBeGreaterThanOrEqual(minimum);
    }
  });
});

test.describe("diferenciais", () => {
  test("quatro itens: em linha com divisórias em 1280 px e grade 2×2 em 360 px", async ({ page }) => {
    test.skip(!isProject("desktop"), "controla a largura manualmente");
    const items = () => page.getByTestId("features").getByRole("listitem");
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await expect(items()).toHaveCount(4);
    await expect(items()).toHaveText([/Agendamento rápido/, /Profissional experiente/, /Ambiente premium/, /Lembretes automáticos/]);
    const tops = await items().evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
    // Divisórias verticais entre os itens (o último não tem).
    expect(await items().evaluateAll((els) => els.map((e) => getComputedStyle(e).borderRightWidth))).toEqual(["1px", "1px", "1px", "0px"]);

    await page.setViewportSize({ width: 360, height: 800 });
    const boxes = await items().evaluateAll((els) => els.map((e) => ({ top: Math.round(e.getBoundingClientRect().top), left: Math.round(e.getBoundingClientRect().left) })));
    expect(new Set(boxes.map((b) => b.top)).size).toBe(2);
    expect(new Set(boxes.map((b) => b.left)).size).toBe(2);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("galeria", () => {
  test("abre, navega e fecha pelo teclado; fotos com lazy loading e texto alternativo", async ({ page }) => {
    await page.goto("/");
    const gallery = page.getByTestId("gallery");
    const thumbs = gallery.getByRole("button");
    await expect(thumbs).toHaveCount(8);
    expect(await gallery.locator("img").first().getAttribute("loading")).toBe("lazy");

    await thumbs.nth(0).scrollIntoViewIfNeeded();
    await thumbs.nth(0).focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "Foto ampliada" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("1 / 8");
    const alt0 = await dialog.locator("figure img").getAttribute("alt");
    expect(alt0).toBeTruthy();

    await page.keyboard.press("ArrowRight");
    await expect(dialog).toContainText("2 / 8");
    expect(await dialog.locator("figure img").getAttribute("alt")).not.toBe(alt0);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(dialog).toContainText("8 / 8");
    await dialog.getByRole("button", { name: "Próxima foto" }).click();
    await expect(dialog).toContainText("1 / 8");

    const axe = await new AxeBuilder({ page }).include("dialog").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => v.id)).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(thumbs.nth(0)).toBeFocused();
  });

  test("gesto de deslizar troca a foto", async ({ page }) => {
    test.skip(!isProject("mobile"), "gesto de toque no celular");
    await page.goto("/");
    await page.getByTestId("gallery").getByRole("button").nth(2).click();
    const dialog = page.getByRole("dialog", { name: "Foto ampliada" });
    await expect(dialog).toContainText("3 / 8");
    const box = (await dialog.locator("figure").boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.8, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.2, y, { steps: 5 });
    await page.mouse.up();
    await expect(dialog).toContainText("4 / 8");
  });
});

test.describe("painel de agendamento", () => {
  test("horário de atendimento e cartão do barbeiro vindos das configurações", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("hours-card")).toHaveText("Atendimento — TER–SÁB: 09h às 19h");
    // No celular o cartão fica na etapa 3 ("Seus dados"); chega até ela.
    if (isProject("mobile")) {
      await page.getByRole("checkbox", { name: /^Barba/ }).click();
      await page.getByRole("button", { name: "Continuar" }).click();
      await page.locator("button[data-day]:enabled").first().click();
      await page.getByRole("group", { name: "Horários disponíveis" }).getByRole("button").first().click();
      await page.getByRole("button", { name: "Continuar" }).click();
    }
    await expect(page.getByTestId("barber-card")).toContainText("Rafael Moreira");
    await expect(page.getByTestId("barber-card").getByRole("img", { name: "Iniciais de Rafael Moreira" })).toHaveText("RM");
  });

  test("desktop: quatro colunas lado a lado em 1280 px e 3 + 1 em 1100 px", async ({ page }) => {
    test.skip(!isProject("desktop"), "layout desktop");
    const columns = page.getByTestId("booking-columns").locator(":scope > section");
    const tops = () => columns.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/agendar");
    await expect(columns).toHaveCount(4);
    expect(new Set(await tops()).size).toBe(1);
    await page.setViewportSize({ width: 1100, height: 900 });
    const t = await tops();
    expect(t[0]).toBe(t[1]);
    expect(t[1]).toBe(t[2]);
    expect(t[3]).toBeGreaterThan(t[0]);
    // Um único botão dourado sólido (confirmar).
    const solid = await page.locator("main button:visible, main a:visible").evaluateAll((els) => els.filter((e) => e.className.includes("bg-gold ") || e.className.endsWith("bg-gold")).length);
    expect(solid).toBe(1);
  });

  test("celular 390 px: só a etapa atual aparece e o resumo fixo acompanha a seleção", async ({ page }) => {
    test.skip(!isProject("mobile"), "layout celular");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/agendar");
    const visibleSteps = () => page.locator("[data-step]:visible").evaluateAll((els) => els.map((e) => e.getAttribute("data-step")));
    expect(await visibleSteps()).toEqual(["1"]);
    const bar = page.getByTestId("summary-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("0 serviços");
    await page.getByRole("checkbox", { name: /^Corte de cabelo/ }).click();
    await expect(page.getByTestId("bar-count")).toHaveText("1 serviço");
    await page.getByRole("checkbox", { name: /^Bigode/ }).click();
    await expect(page.getByTestId("bar-count")).toHaveText("2 serviços");
    await expect(page.getByTestId("bar-duration")).toHaveText("40 min");
    await expect(page.getByTestId("bar-total")).toHaveText("R$ 60,00");
    // Fixo no rodapé da tela enquanto rola a lista.
    const barBox = (await bar.boundingBox())!;
    expect(Math.round(barBox.y + barBox.height)).toBeLessThanOrEqual(844);
    expect(barBox.y + barBox.height).toBeGreaterThan(844 - 4);
    await page.getByRole("button", { name: "Continuar" }).click();
    expect(await visibleSteps()).toEqual(["2"]);
    await expect(page.getByRole("heading", { name: "Escolha a data e o horário" })).toBeFocused();
  });
});

test.describe("agendar pela home e por /agendar dá o mesmo resultado", () => {
  test.skip(() => test.info().project.name !== "desktop", "roda uma vez");
  const phones: string[] = [];
  test.afterAll(async () => cleanupByPhone(phones));

  async function book(page: Page, path: string, phone: string) {
    await page.goto(path);
    await chooseServices(page, ["Barba"]);
    const time = await chooseDateAndTime(page);
    await fillCustomer(page, prettyPhone(phone), "Mesmo Fluxo");
    await page.getByRole("button", { name: "Confirmar agendamento" }).click();
    await expect(page.getByRole("heading", { name: "Agendamento confirmado!" })).toBeVisible();
    return time;
  }

  test("mesmo serviço pela home e por /agendar gera agendamentos equivalentes", async ({ browser }) => {
    const results = [];
    for (const path of ["/", "/agendar"]) {
      const ctx = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": randomIp() } });
      const page = await ctx.newPage();
      const phone = testPhone();
      phones.push(phone);
      await book(page, path, phone);
      const { data } = await adminDb()
        .from("appointments")
        .select("status,total_cents,source,customer_name,starts_at,ends_at,appointment_services(name_snapshot,price_cents_snapshot,duration_min_snapshot)")
        .eq("customer_phone", phone)
        .single();
      const minutes = (new Date(data!.ends_at).getTime() - new Date(data!.starts_at).getTime()) / 60_000;
      results.push({ status: data!.status, total: data!.total_cents, source: data!.source, name: data!.customer_name, minutes, services: data!.appointment_services });
      await ctx.close();
    }
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toMatchObject({ status: "confirmed", total: 3500, source: "web", minutes: 30 });
  });
});
