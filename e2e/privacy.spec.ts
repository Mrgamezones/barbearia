import { expect, test } from "@playwright/test";
import { chooseDateAndTime, chooseServices } from "./helpers/booking";

test("política de privacidade está linkada no formulário de dados e no rodapé", async ({ page }) => {
  await page.goto("/agendar");
  await chooseServices(page, ["Bigode"]);
  await chooseDateAndTime(page);
  const link = page.getByRole("main").getByRole("link", { name: "política de privacidade" });
  await expect(link).toHaveAttribute("href", "/privacidade");
  await link.click();
  await expect(page.getByRole("heading", { name: "Política de privacidade", level: 1 })).toBeVisible();
  await expect(page.getByText("Lei nº 13.709/2018")).toBeVisible();
  // Uso do WhatsApp e como deixar de receber.
  await expect(page.getByRole("heading", { name: "Mensagens pelo WhatsApp" })).toBeVisible();
  await expect(page.getByText(/lembretes de 24 horas e\s+de 2 horas antes/)).toBeVisible();
  await expect(page.getByText(/Para deixar de receber, desmarque a opção ao agendar/)).toBeVisible();
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade");
});
