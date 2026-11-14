// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchDueReminders, type Senders } from "./dispatch";

type Row = Record<string, unknown>;

function fakeDb(due: Row[], subs: Row[] = []) {
  const logs: Row[] = [];
  const released: string[] = [];
  const deleted: unknown[] = [];
  const db = {
    rpc: async (fn: string, args: Row) => {
      if (fn === "claim_due_reminders") return { data: due, error: null };
      if (fn === "release_reminder") released.push(args.p_reminder_id as string);
      return { data: null, error: null };
    },
    from(table: string) {
      const q = {
        select: () => q,
        eq: async () => ({ data: subs, error: null }),
        single: async () => ({ data: { name: "Barbearia Modelo", address: "Rua Exemplo, 100" }, error: null }),
        insert: async (row: Row) => {
          logs.push(row);
          return { error: null };
        },
        delete: () => ({
          eq: async (_c: string, id: unknown) => {
            deleted.push(id);
            return { error: null };
          },
        }),
      };
      if (table === "business_settings") return { select: () => ({ eq: () => ({ single: q.single }) }) };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, logs, released, deleted };
}

const reminder = (over: Row = {}): Row => ({
  reminder_id: "r1",
  appointment_id: "a1",
  kind: "h24",
  channel: "whatsapp",
  starts_at: "2026-05-22T17:00:00Z",
  customer_name: "Maria Silva",
  customer_email: "maria@ex.com",
  services: "Corte de cabelo",
  customer_phone: "+5511999998888",
  whatsapp_opt_in: true,
  ...over,
});

let senders: Senders & { sendWhatsApp: ReturnType<typeof vi.fn> };
beforeEach(() => {
  senders = {
    sendPush: vi.fn(async () => "sent" as const),
    sendEmail: vi.fn(async () => ({ ok: true })),
    sendWhatsApp: vi.fn(async () => ({ status: "sent" as const, id: "wamid.9" })),
  };
});

describe("dispatchDueReminders — WhatsApp", () => {
  it("envia o modelo de lembrete e registra o wamid", async () => {
    const { db, logs, released } = fakeDb([reminder()]);
    const s = await dispatchDueReminders(db, senders);
    expect(senders.sendWhatsApp).toHaveBeenCalledWith({
      to: "+5511999998888",
      template: "lembrete_agendamento",
      params: ["Maria", "amanhã", "14:00", "Barbearia Modelo", "Corte de cabelo"],
    });
    expect(logs).toEqual([expect.objectContaining({ channel: "whatsapp", kind: "h24", status: "sent", detail: "wamid.9" })]);
    expect(released).toEqual([]);
    expect(s).toMatchObject({ claimed: 1, sent: 1, failed: 0 });
  });

  it("falha temporária devolve o lembrete à fila", async () => {
    senders.sendWhatsApp.mockResolvedValue({ status: "temporary", error: "429: rate" });
    const { db, logs, released } = fakeDb([reminder()]);
    const s = await dispatchDueReminders(db, senders);
    expect(released).toEqual(["r1"]);
    expect(logs[0]).toMatchObject({ status: "failed", detail: "429: rate" });
    expect(s).toMatchObject({ failed: 1, released: 1 });
  });

  it("falha permanente fica como undeliverable e não volta à fila", async () => {
    senders.sendWhatsApp.mockResolvedValue({ status: "permanent", error: "131026: undeliverable" });
    const { db, logs, released } = fakeDb([reminder()]);
    await dispatchDueReminders(db, senders);
    expect(released).toEqual([]);
    expect(logs[0]).toMatchObject({ status: "undeliverable", detail: "131026: undeliverable" });
  });

  it("sem consentimento ou sem telefone: no_target, sem envio", async () => {
    const { db, logs } = fakeDb([reminder({ whatsapp_opt_in: false }), reminder({ reminder_id: "r2", customer_phone: null })]);
    await dispatchDueReminders(db, senders);
    expect(senders.sendWhatsApp).not.toHaveBeenCalled();
    expect(logs.map((l) => l.status)).toEqual(["no_target", "no_target"]);
  });

  it("dry-run é contado como enviado", async () => {
    senders.sendWhatsApp.mockResolvedValue({ status: "dry_run" });
    const { db, logs } = fakeDb([reminder({ kind: "h2" })]);
    const s = await dispatchDueReminders(db, senders);
    expect(senders.sendWhatsApp.mock.calls[0][0].params[1]).toBe("daqui a 2 horas");
    expect(logs[0]).toMatchObject({ status: "dry_run" });
    expect(s.sent).toBe(1);
  });
});

describe("dispatchDueReminders — canais existentes continuam iguais", () => {
  it("e-mail é enviado normalmente", async () => {
    const { db, logs } = fakeDb([reminder({ channel: "email" })]);
    await dispatchDueReminders(db, senders);
    expect(senders.sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "maria@ex.com" }));
    expect(senders.sendWhatsApp).not.toHaveBeenCalled();
    expect(logs[0]).toMatchObject({ channel: "email", status: "sent" });
  });

  it("push expirado remove a inscrição", async () => {
    senders.sendPush = vi.fn(async () => "gone" as const);
    const { db, logs, deleted } = fakeDb([reminder({ channel: "push" })], [{ id: "s1", endpoint: "https://p", p256dh: "k", auth: "a" }]);
    const s = await dispatchDueReminders(db, senders);
    expect(deleted).toEqual(["s1"]);
    expect(s.removedSubscriptions).toBe(1);
    expect(logs[0]).toMatchObject({ channel: "push", status: "no_target" });
  });
});
