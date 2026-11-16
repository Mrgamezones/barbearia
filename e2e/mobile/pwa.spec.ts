import { evidence, expect, test, waitForServiceWorker } from "./helpers";
import { site } from "../helpers/shop";

// Android = Chromium, iOS = WebKit (ver devices.ts).

test.describe("PWA no Android", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "somente perfis Android");

  test("manifest válido", async ({ request }) => {
    const res = await request.get(site("manifest.webmanifest"));
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m.name).toBeTruthy();
    expect(m.start_url).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.theme_color).toBe("#0b0b0c");
    const sizes = m.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? "any"}`);
    expect(sizes).toEqual(expect.arrayContaining(["192x192:any", "512x512:any", "512x512:maskable"]));
    for (const icon of m.icons) expect((await request.get(icon.src)).ok(), icon.src).toBe(true);
  });

  test("service worker ativo controlando a página", async ({ page }, info) => {
    await page.goto(site());
    await waitForServiceWorker(page);
    const sw = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      return { state: reg.active?.state, scope: new URL(reg.scope).pathname, controlled: !!navigator.serviceWorker.controller };
    });
    expect(sw).toEqual({ state: "activated", scope: "/", controlled: true });
    await evidence(page, info, "pwa-android");
  });
});

test.describe("app web no iOS", () => {
  test.skip(({ browserName }) => browserName !== "webkit", "somente perfis iOS");

  test("meta tags de app web: ícone Apple, título e status bar", async ({ page, request }) => {
    await page.goto(site());
    const icon = page.locator('link[rel="apple-touch-icon"]');
    await expect(icon).toHaveCount(1);
    const href = (await icon.getAttribute("href"))!;
    const res = await request.get(href);
    expect(res.ok(), href).toBe(true);
    expect(res.headers()["content-type"]).toContain("image/png");
    await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute("content", /\S/);
    await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveAttribute("content", "black-translucent");
  });

  test("dica de instalação aparece, pode ser dispensada e é lembrada", async ({ page }, info) => {
    await page.goto(site());
    const hint = page.getByRole("region", { name: "Instalar o app" });
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("Adicionar à Tela de Início");
    await evidence(page, info, "dica-instalação-ios");
    await hint.getByRole("button", { name: "Dispensar dica" }).tap();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(hint).toHaveCount(0);
  });
});
