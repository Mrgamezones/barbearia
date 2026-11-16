import { evidence, expect, gotoStable, readPlan, test, waitForServiceWorker } from "./helpers";
import { site } from "../helpers/shop";

test("offline: home continua exibida e a etapa de horários avisa que precisa de conexão", async ({ page, context }, info) => {
  await page.goto(site());
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  // Com o service worker controlando a página, a home também recarrega do cache.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await evidence(page, info, "home-offline");
  await context.setOffline(false);

  await gotoStable(page, `${site("agendar")}?servicos=${readPlan().booking.serviceId}`);
  await expect(page.getByRole("heading", { name: "Escolha o serviço" })).toBeVisible();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Continuar" }).tap();
  await expect(page.getByRole("status").filter({ hasText: "sem conexão" })).toContainText("É preciso estar conectado para ver os horários livres");
  await evidence(page, info, "horários-offline");
  await context.setOffline(false);
});
