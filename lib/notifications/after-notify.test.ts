// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

type Row = Record<string, unknown>;
const state = {
  appointment: null as Row | null,
  inserts: [] as { table: string; row: Row }[],
  updates: [] as { table: string; values: Row; id: unknown }[],
  claim: 1 as number | null,
  rpcCalls: [] as { fn: string; args: Row }[],
};

/** Supabase falso: só o que after-booking/after-cancel usam. */
function fakeDb() {
  return {
    from(table: string) {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: table === "appointments" ? state.appointment : null, error: null }),
        insert: async (row: Row) => {
          state.inserts.push({ table, row });
          return { error: null };
        },
        update: (values: Row) => ({
          eq: async (_col: string, id: unknown) => {
            state.updates.push({ table, values, id });
            return { error: null };
          },
        }),
      };
      return q;
    },
    rpc: async (fn: string, args: Row) => {
      state.rpcCalls.push({ fn, args });
      return { data: state.claim, error: null };
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeDb() }));
const sendEmail = vi.fn();
vi.mock("./email", () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
const sendWhatsAppTemplate = vi.fn();
vi.mock("./whatsapp", () => ({ sendWhatsAppTemplate: (...a: unknown[]) => sendWhatsAppTemplate(...a) }));

const { afterBookingCreated } = await import("./after-booking");
const { afterBookingCancelled } = await import("./after-cancel");

const baseAppointment = {
  customer_name: "Maria Silva",
  customer_email: "maria@ex.com",
  customer_phone: "+5511999998888",
  whatsapp_opt_in: true,
  starts_at: "2026-05-22T17:00:00Z",
  total_cents: 4500,
  appointment_services: [{ name_snapshot: "Corte de cabelo", price_cents_snapshot: 4500 }],
  shops: {
    slug: "barbearia-teste",
    name: "Barbearia Modelo",
    street: "Rua Exemplo",
    number: "100",
    complement: "",
    district: "",
    city: "",
    state: "",
    postal_code: "",
    notifications_enabled: true,
  },
};
const demoShop = { ...baseAppointment.shops, slug: "demonstracao", notifications_enabled: false };

beforeEach(() => {
  state.appointment = { ...baseAppointment };
  state.inserts = [];
  state.updates = [];
  state.rpcCalls = [];
  state.claim = 1;
  sendEmail.mockReset().mockResolvedValue({ ok: true, id: "email_1" });
  sendWhatsAppTemplate.mockReset().mockResolvedValue({ status: "sent", id: "wamid.1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("afterBookingCreated", () => {
  it("com consentimento envia e-mail e WhatsApp e registra os dois", async () => {
    await afterBookingCreated("ap-1", "tok");
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "+5511999998888", template: "agendamento_confirmado", params: expect.arrayContaining(["Maria", "14:00", "Corte de cabelo"]) }),
    );
    const logs = state.inserts.filter((i) => i.table === "notification_log").map((i) => i.row);
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: "email", kind: "confirmation", status: "sent" }),
        expect.objectContaining({ channel: "whatsapp", kind: "confirmation", status: "sent", detail: "wamid.1" }),
      ]),
    );
  });

  it("monta o link de gerenciamento com o endereço da barbearia", async () => {
    vi.stubEnv("SITE_URL", "https://agenda.exemplo");
    await afterBookingCreated("ap-1", "tok");
    expect(sendEmail.mock.calls[0][0].text).toContain("https://agenda.exemplo/barbearia/barbearia-teste/agendamento/tok");
    expect(sendEmail.mock.calls[0][0].text).toContain("Rua Exemplo, 100");
    vi.unstubAllEnvs();
  });

  it("demonstração: não envia nada e registra skipped", async () => {
    state.appointment = { ...baseAppointment, shops: demoShop };
    await afterBookingCreated("ap-1", "tok");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
    const logs = state.inserts.find((i) => i.table === "notification_log")?.row as unknown as Row[];
    expect(logs.map((l) => `${l.channel}/${l.status}`)).toEqual(["email/skipped", "whatsapp/skipped"]);
  });

  it("sem consentimento envia só o e-mail", async () => {
    state.appointment = { ...baseAppointment, whatsapp_opt_in: false };
    await afterBookingCreated("ap-1", "tok");
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it("WhatsApp falhando não impede o e-mail nem lança erro", async () => {
    sendWhatsAppTemplate.mockRejectedValue(new Error("boom"));
    await expect(afterBookingCreated("ap-1", "tok")).resolves.toBeUndefined();
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(state.inserts.some((i) => i.row.channel === "email")).toBe(true);
  });

  it("falha permanente do WhatsApp é registrada como failed", async () => {
    sendWhatsAppTemplate.mockResolvedValue({ status: "permanent", error: "131026: undeliverable" });
    await afterBookingCreated("ap-1", "tok");
    expect(state.inserts.find((i) => i.row.channel === "whatsapp")?.row).toMatchObject({ status: "failed", detail: "131026: undeliverable" });
  });
});

describe("afterBookingCancelled", () => {
  it("barbeiro cancela: reserva o aviso, envia o modelo da barbearia e atualiza o log", async () => {
    await afterBookingCancelled("ap-1", "admin");
    expect(state.rpcCalls).toEqual([{ fn: "claim_notification", args: { p_appointment_id: "ap-1", p_channel: "whatsapp", p_kind: "cancelled_admin" } }]);
    expect(sendWhatsAppTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ template: "agendamento_cancelado_barbearia", params: expect.arrayContaining(["Maria", "Barbearia Modelo", "14:00"]) }),
    );
    expect(state.updates).toEqual([{ table: "notification_log", values: { status: "sent", detail: "wamid.1" }, id: 1 }]);
  });

  it("cliente cancela: usa o modelo do cliente", async () => {
    await afterBookingCancelled("ap-1", "client");
    expect(state.rpcCalls[0].args.p_kind).toBe("cancelled_client");
    expect(sendWhatsAppTemplate.mock.calls[0][0].template).toBe("agendamento_cancelado_cliente");
  });

  it("aviso já reservado antes (claim nulo) não envia de novo", async () => {
    state.claim = null;
    await afterBookingCancelled("ap-1", "admin");
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it("demonstração: não reserva nem envia o aviso", async () => {
    state.appointment = { ...baseAppointment, shops: demoShop };
    await afterBookingCancelled("ap-1", "client");
    expect(state.rpcCalls).toHaveLength(0);
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it("link para agendar de novo aponta para a barbearia", async () => {
    vi.stubEnv("SITE_URL", "https://agenda.exemplo");
    await afterBookingCancelled("ap-1", "client");
    expect(sendWhatsAppTemplate.mock.calls[0][0].params).toContain("https://agenda.exemplo/barbearia/barbearia-teste/agendar");
    vi.unstubAllEnvs();
  });

  it("sem consentimento não reserva nem envia", async () => {
    state.appointment = { ...baseAppointment, whatsapp_opt_in: false };
    await afterBookingCancelled("ap-1", "admin");
    expect(state.rpcCalls).toHaveLength(0);
    expect(sendWhatsAppTemplate).not.toHaveBeenCalled();
  });

  it("falha no envio grava failed sem lançar erro", async () => {
    sendWhatsAppTemplate.mockResolvedValue({ status: "temporary", error: "500: Internal" });
    await expect(afterBookingCancelled("ap-1", "client")).resolves.toBeUndefined();
    expect(state.updates[0].values).toEqual({ status: "failed", detail: "500: Internal" });
  });
});
