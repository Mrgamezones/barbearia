// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

const sendMail = vi.fn();
const createTransport = vi.fn(() => ({ sendMail }));
vi.mock("nodemailer", () => ({ default: { createTransport } }));

const { sendEmail, emailTransport } = await import("./email");
const { confirmationEmail, reminderMessage } = await import("./templates");

describe("e-mail de confirmação", () => {
  const data = {
    businessName: "Barbearia Modelo",
    address: "Rua Exemplo, 100",
    customerName: "Maria Silva",
    startsAt: "2026-05-22T17:00:00Z", // 14:00 em São Paulo
    services: [
      { name: "Corte de cabelo", price_cents: 4500 },
      { name: "Bigode", price_cents: 1500 },
    ],
    totalCents: 6000,
    manageUrl: "https://barbearia.test/agendamento/abc<x>",
  };

  it("contém data, horário, serviços, total, endereço e link de gerenciamento", () => {
    const m = confirmationEmail(data);
    expect(m.subject).toContain("14:00");
    for (const part of ["Maria", "14:00", "Corte de cabelo", "Bigode", "R$ 60,00", "Rua Exemplo, 100"]) {
      expect(m.html).toContain(part);
      expect(m.text).toContain(part);
    }
    expect(m.html).toContain("sexta-feira, 22 de maio de 2026");
    expect(m.text).toContain("https://barbearia.test/agendamento/abc<x>");
    expect(m.html).toContain("abc&lt;x&gt;"); // escapado no HTML
  });

  it("mensagem de lembrete de 2 h", () => {
    const r = reminderMessage({ businessName: "Barbearia Modelo", address: "", customerName: "Maria Silva", startsAt: data.startsAt, services: "Corte de cabelo", kind: "h2" });
    expect(r.title).toBe("Daqui a 2 horas: 14:00 na Barbearia Modelo");
    expect(r.body).toContain("Corte de cabelo");
  });
});

describe("sendEmail", () => {
  beforeEach(() => send.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("sem chave do Resend apenas registra (dry-run)", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const r = await sendEmail({ to: "a@b.com", subject: "x", html: "<p>x</p>", text: "x" });
    expect(r).toEqual({ ok: true, dryRun: true });
    expect(send).not.toHaveBeenCalled();
  });

  it("com chave envia pelo provedor com remetente configurado", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Barbearia <ag@barbearia.test>");
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    const r = await sendEmail({ to: "a@b.com", subject: "Assunto", html: "<p>x</p>", text: "x" });
    expect(r).toEqual({ ok: true, id: "email_1" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: "Barbearia <ag@barbearia.test>", to: "a@b.com", subject: "Assunto" }));
  });

  it("erro do provedor vira resultado com falha", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    send.mockResolvedValue({ data: null, error: { message: "domínio não verificado" } });
    expect(await sendEmail({ to: "a@b.com", subject: "x", html: "", text: "" })).toEqual({ ok: false, error: "domínio não verificado" });
  });
});

describe("transporte de e-mail (EMAIL_TRANSPORT)", () => {
  const msg = { to: "cliente@teste.local", subject: "Confirmado", html: "<p>ok</p>", text: "ok" };
  beforeEach(() => {
    send.mockReset();
    sendMail.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sem EMAIL_TRANSPORT usa o Resend", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", undefined as unknown as string);
    expect(emailTransport()).toBe("resend");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    send.mockResolvedValue({ data: { id: "r1" }, error: null });
    expect(await sendEmail(msg)).toEqual({ ok: true, id: "r1" });
    expect(send).toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("EMAIL_TRANSPORT=resend usa o Resend", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "resend");
    expect(emailTransport()).toBe("resend");
  });

  it("EMAIL_TRANSPORT=smtp envia por SMTP (nodemailer) no host/porta configurados, sem passar pelo Resend", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "SMTP");
    vi.stubEnv("SMTP_HOST", "supabase_inbucket_barbearia");
    vi.stubEnv("SMTP_PORT", "1025");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Barbearia <ag@barbearia.local>");
    sendMail.mockResolvedValue({ messageId: "<m1@local>" });
    expect(await sendEmail(msg)).toEqual({ ok: true, id: "<m1@local>" });
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: "supabase_inbucket_barbearia", port: 1025, secure: false }));
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: "Barbearia <ag@barbearia.local>", to: msg.to, subject: "Confirmado" }));
    expect(send).not.toHaveBeenCalled();
  });

  it("falha do SMTP vira resultado com erro", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "smtp");
    vi.stubEnv("SMTP_HOST", "localhost");
    sendMail.mockRejectedValue(new Error("ECONNREFUSED"));
    expect(await sendEmail(msg)).toEqual({ ok: false, error: "ECONNREFUSED" });
  });

  it("valor inválido é rejeitado", async () => {
    vi.stubEnv("EMAIL_TRANSPORT", "carta");
    expect(() => emailTransport()).toThrow(/EMAIL_TRANSPORT inválido/);
    expect(await sendEmail(msg)).toMatchObject({ ok: false });
  });
});
