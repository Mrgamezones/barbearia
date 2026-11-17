// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));
vi.mock("./push", () => ({ sendPush: vi.fn() }));

const { notifyShopAdminsWith } = await import("./shop-alert");
const { formatShopAlert, relativeDay } = await import("./shop-alert-text");

type Row = Record<string, unknown>;
type Sub = { id: string; endpoint: string; p256dh: string; auth: string; shop_id: string };

const SHOP_A = "shop-a";
const SHOP_B = "shop-b";

const state = {
  appointment: null as Row | null,
  alerts: [] as Row[],
  subs: [] as Sub[],
  deleted: [] as unknown[],
  failInsert: false,
};

/** Supabase falso: só o que shop-alert usa. */
function fakeDb() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (col: string, v: unknown) => {
          filters[col] = v;
          return q;
        },
        single: async () => ({ data: table === "appointments" ? state.appointment : null, error: null }),
        insert: (row: Row) => ({
          select: () => ({
            single: async () => {
              if (state.failInsert) return { data: null, error: new Error("falha no insert") };
              state.alerts.push(row);
              return { data: { id: state.alerts.length }, error: null };
            },
          }),
        }),
        delete: () => ({
          eq: async (_c: string, id: unknown) => {
            state.deleted.push(id);
            return { error: null };
          },
        }),
        then: (resolve: (v: unknown) => void) =>
          resolve({ data: state.subs.filter((s) => s.shop_id === filters.shop_id), error: null }),
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

const NOW = new Date("2026-11-17T15:00:00Z"); // 12:00 em São Paulo

function appointment(over: Row = {}): Row {
  return {
    shop_id: SHOP_A,
    customer_name: "João Silva",
    starts_at: "2026-11-18T17:00:00Z", // amanhã 14:00
    appointment_services: [{ name_snapshot: "Corte" }, { name_snapshot: "Barba" }],
    shops: { slug: "demir-barbershop", notifications_enabled: true },
    ...over,
  };
}

beforeEach(() => {
  state.appointment = appointment();
  state.alerts = [];
  state.subs = [
    { id: "s1", endpoint: "https://push.example/1", p256dh: "k", auth: "a", shop_id: SHOP_A },
    { id: "s2", endpoint: "https://push.example/2", p256dh: "k", auth: "a", shop_id: SHOP_A },
    { id: "s3", endpoint: "https://push.example/outra", p256dh: "k", auth: "a", shop_id: SHOP_B },
  ];
  state.deleted = [];
  state.failInsert = false;
});

describe("textos do aviso", () => {
  it("agendamento novo: cliente, dia relativo, horário e serviços; abre a agenda do dia", () => {
    const t = formatShopAlert({ kind: "booked", customerName: "João", startsAt: "2026-11-18T17:00:00Z", services: ["Corte"], shopSlug: "demir", now: NOW });
    expect(t).toEqual({ title: "Novo agendamento", body: "João — amanhã, 14:00 · Corte", url: "/painel/demir?data=2026-11-18" });
  });

  it("cancelamento: informa que o horário ficou livre", () => {
    const t = formatShopAlert({ kind: "cancelled_by_client", customerName: "João", startsAt: "2026-11-21T13:00:00Z", services: [], shopSlug: "demir", now: NOW });
    expect(t.title).toBe("Agendamento cancelado");
    expect(t.body).toBe("João cancelou sábado, 21/11, 10:00. O horário está livre.");
  });

  it("dia relativo: hoje, amanhã e dia da semana", () => {
    expect(relativeDay("2026-11-17T20:00:00Z", NOW)).toBe("hoje");
    expect(relativeDay("2026-11-18T12:00:00Z", NOW)).toBe("amanhã");
    expect(relativeDay("2026-11-24T12:00:00Z", NOW)).toBe("terça, 24/11");
  });
});

describe("notifyShopAdminsWith", () => {
  it("registra o alerta e envia a todos os aparelhos da barbearia, e só dela", async () => {
    const sendPush = vi.fn().mockResolvedValue("sent");
    const r = await notifyShopAdminsWith({ db: fakeDb(), sendPush, now: NOW }, "ap1", "booked");
    expect(state.alerts).toEqual([{ shop_id: SHOP_A, kind: "booked", appointment_id: "ap1" }]);
    expect(sendPush.mock.calls.map((c) => c[0].id)).toEqual(["s1", "s2"]);
    expect(sendPush.mock.calls[0][1]).toMatchObject({
      title: "Novo agendamento",
      body: "João Silva — amanhã, 14:00 · Corte, Barba",
      url: "/painel/demir-barbershop?data=2026-11-18",
      alertId: 1,
      tag: "alerta-1",
    });
    expect(r).toEqual({ alertId: 1, sent: 2, failed: 0, removed: 0 });
  });

  it("demonstração: registra o alerta, mas não envia", async () => {
    state.appointment = appointment({ shops: { slug: "demonstracao", notifications_enabled: false } });
    const sendPush = vi.fn();
    const r = await notifyShopAdminsWith({ db: fakeDb(), sendPush, now: NOW }, "ap1", "booked");
    expect(state.alerts).toHaveLength(1);
    expect(sendPush).not.toHaveBeenCalled();
    expect(r.sent).toBe(0);
  });

  it("remove a inscrição expirada e continua enviando às demais", async () => {
    const sendPush = vi.fn().mockImplementation(async (sub: Sub) => (sub.id === "s1" ? "gone" : "sent"));
    const r = await notifyShopAdminsWith({ db: fakeDb(), sendPush, now: NOW }, "ap1", "cancelled_by_client");
    expect(state.deleted).toEqual(["s1"]);
    expect(r).toMatchObject({ sent: 1, removed: 1 });
  });

  it("falhas não lançam erro", async () => {
    const sendPush = vi.fn().mockRejectedValueOnce(new Error("rede")).mockResolvedValue("error");
    await expect(notifyShopAdminsWith({ db: fakeDb(), sendPush, now: NOW }, "ap1", "booked")).resolves.toBeDefined();
    state.failInsert = true;
    await expect(notifyShopAdminsWith({ db: fakeDb(), sendPush, now: NOW }, "ap1", "booked")).resolves.toMatchObject({ alertId: null });
  });

  it("agendamento inexistente: nada acontece", async () => {
    state.appointment = null;
    const sendPush = vi.fn();
    const r = await notifyShopAdminsWith({ db: fakeDb(), sendPush, now: NOW }, "x", "booked");
    expect(state.alerts).toHaveLength(0);
    expect(r.alertId).toBeNull();
  });
});
