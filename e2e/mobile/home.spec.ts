import { evidence, expect, expectNoHorizontalScroll, test } from "./helpers";

test.describe("home e serviços", () => {
  test("página inicial cabe na tela, sem rolagem horizontal", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /agendar/i }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await evidence(page, info, "home");
  });

  test("lista de serviços cabe na tela, sem rolagem horizontal", async ({ page }, info) => {
    await page.goto("/servicos");
    await expect(page.getByRole("heading", { name: "Serviços", level: 1 })).toBeVisible();
    await expect(page.getByTestId("service-item")).toHaveCount(10);
    await expect(page.getByTestId("service-item").filter({ hasText: "Corte + Barba" }).first()).toContainText("R$ 70,00");
    await expectNoHorizontalScroll(page);
    await evidence(page, info, "serviços");
  });
});
