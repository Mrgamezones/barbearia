import { api, devicePhone, deviceSlot, evidence, expect, expectNoHorizontalScroll, LOCAL_ADMIN, test, timeLabel } from "./helpers";

test("painel: login do admin local e agenda do dia com os agendamentos criados", async ({ page, baseURL }, info) => {
  // Agendamento próprio do aparelho (outro dia e telefone que o do cenário de agendamento): independe da ordem dos cenários.
  const slot = deviceSlot(info, "panel");
  const phone = devicePhone(info, 1);
  const name = `Painel ${info.project.name}`;
  await api(baseURL!, `/rest/v1/appointments?customer_phone=eq.${encodeURIComponent(phone)}`, undefined, { serviceRole: true, method: "DELETE" });
  const created = await api<{ ok: boolean }>(
    baseURL!,
    "/rest/v1/rpc/create_booking",
    { p_service_ids: [slot.serviceId], p_starts_at: slot.iso, p_name: name, p_phone: phone },
    { serviceRole: true },
  );
  expect(created.ok).toBe(true);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("E-mail").fill(LOCAL_ADMIN.email);
  await page.getByLabel("Senha").fill(LOCAL_ADMIN.password);
  await page.getByRole("button", { name: "Entrar" }).tap();
  await expect(page).not.toHaveURL(/\/admin\/login/);
  await evidence(page, info, "painel-agenda-hoje");

  // Sessão mantida entre navegações (cookie compartilhado navegador × Server Components)
  await page.goto(`/admin?data=${slot.date}`);
  const item = page.locator("li, article, tr").filter({ hasText: name }).first();
  await expect(item).toBeVisible();
  await expect(item).toContainText(timeLabel(slot.iso));
  await expectNoHorizontalScroll(page);
  await evidence(page, info, "painel-agenda-do-dia");
});
