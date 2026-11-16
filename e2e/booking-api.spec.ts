import { expect, test } from "@playwright/test";
import { adminDb, anonDb } from "./helpers/db";
import { cleanupByPhone, findFreeSlot, serviceId, testPhone } from "./helpers/slots";
import { SHOP } from "./helpers/shop";

// Testes de integração do banco via API (sem navegador). Rodam uma vez só.
test.describe("create_booking (integração)", () => {
  test.skip(() => test.info().project.name !== "desktop", "roda só no projeto desktop");
  const phones: string[] = [];
  test.afterAll(async () => cleanupByPhone(phones));

  test("duas chamadas simultâneas no mesmo horário: só uma é criada", async () => {
    const corte = await serviceId("Corte de cabelo");
    // Data distante e horário sorteado: evita disputar o mesmo horário com outros testes em paralelo.
    const { slot } = await findFreeSlot(30, { minOffsetDays: 24, pick: Math.floor(Math.random() * 12) });
    const [a, b] = [testPhone(), testPhone()];
    phones.push(a, b);

    const call = (phone: string) =>
      adminDb().rpc("create_booking", { p_shop_slug: SHOP, p_service_ids: [corte], p_starts_at: slot, p_name: "Concorrente", p_phone: phone });
    const c = testPhone();
    phones.push(c);
    const results = await Promise.all([call(a), call(b), call(c)]);
    const payloads = results.map((r) => {
      expect(r.error, JSON.stringify(r.error)).toBeNull();
      return r.data as { ok: boolean; error?: string };
    });

    expect(payloads.filter((p) => p.ok)).toHaveLength(1);
    expect(payloads.filter((p) => !p.ok).every((p) => p.error === "slot_taken")).toBe(true);

    const { count } = await adminDb()
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("starts_at", slot)
      .neq("status", "cancelled");
    expect(count).toBe(1);
  });

  test("consentimento de WhatsApp é gravado no agendamento", async () => {
    const barba = await serviceId("Barba");
    const { slot } = await findFreeSlot(30, { minOffsetDays: 20, pick: Math.floor(Math.random() * 12) });
    const [sim, nao] = [testPhone(), testPhone()];
    phones.push(sim, nao);
    const a = await adminDb().rpc("create_booking", { p_shop_slug: SHOP, p_service_ids: [barba], p_starts_at: slot, p_name: "Opt In", p_phone: sim, p_whatsapp_opt_in: true });
    expect((a.data as { ok: boolean }).ok, JSON.stringify(a)).toBe(true);
    const { slot: slot2 } = await findFreeSlot(30, { minOffsetDays: 21, pick: Math.floor(Math.random() * 12) });
    const b = await adminDb().rpc("create_booking", { p_shop_slug: SHOP, p_service_ids: [barba], p_starts_at: slot2, p_name: "Sem Param", p_phone: nao });
    expect((b.data as { ok: boolean }).ok, JSON.stringify(b)).toBe(true);

    const { data } = await adminDb().from("appointments").select("customer_phone,whatsapp_opt_in").in("customer_phone", [sim, nao]);
    expect(Object.fromEntries((data ?? []).map((r) => [r.customer_phone, r.whatsapp_opt_in]))).toEqual({ [sim]: true, [nao]: false });
  });

  test("chave pública não consegue chamar create_booking direto", async () => {
    const corte = await serviceId("Corte de cabelo");
    const { slot } = await findFreeSlot(30, { minOffsetDays: 5, pick: 8 });
    const r = await anonDb().rpc("create_booking", { p_shop_slug: SHOP, p_service_ids: [corte], p_starts_at: slot, p_name: "Anon", p_phone: testPhone() });
    expect(r.error?.code).toBe("42501");
  });
});
