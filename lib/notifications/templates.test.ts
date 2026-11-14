// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  whatsappCancelledByAdminParams,
  whatsappCancelledByClientParams,
  whatsappConfirmationParams,
  whatsappReminderParams,
} from "./templates";

const startsAt = "2026-05-22T17:00:00Z"; // sexta, 14:00 em São Paulo

describe("parâmetros dos modelos de WhatsApp", () => {
  it("agendamento_confirmado: 8 parâmetros na ordem do modelo", () => {
    const p = whatsappConfirmationParams({
      businessName: "Barbearia Modelo",
      address: "Rua Exemplo, 100",
      customerName: "Maria  Silva",
      startsAt,
      services: [
        { name: "Corte de cabelo", price_cents: 4500 },
        { name: "Bigode", price_cents: 1500 },
      ],
      totalCents: 6000,
      manageUrl: "https://barbearia.test/agendamento/abc",
    });
    expect(p).toEqual([
      "Maria",
      "Barbearia Modelo",
      "sexta-feira, 22 de maio de 2026",
      "14:00",
      "Corte de cabelo + Bigode",
      "R$ 60,00",
      "Rua Exemplo, 100",
      "https://barbearia.test/agendamento/abc",
    ]);
  });

  it("endereço vazio vira travessão (a Meta recusa parâmetro vazio)", () => {
    const p = whatsappConfirmationParams({
      businessName: "B",
      address: "  ",
      customerName: "Ana",
      startsAt,
      services: [{ name: "Barba", price_cents: 3000 }],
      totalCents: 3000,
      manageUrl: "https://x/y",
    });
    expect(p[6]).toBe("—");
    expect(p.every((x) => x.length > 0)).toBe(true);
  });

  it("agendamento_cancelado_barbearia: 5 parâmetros", () => {
    const d = { businessName: "Barbearia Modelo", customerName: "João Souza", startsAt, bookUrl: "https://barbearia.test/agendar" };
    expect(whatsappCancelledByAdminParams(d)).toEqual(["João", "Barbearia Modelo", "sexta-feira, 22 de maio de 2026", "14:00", "https://barbearia.test/agendar"]);
  });

  it("agendamento_cancelado_cliente: 4 parâmetros", () => {
    const d = { businessName: "Barbearia Modelo", customerName: "João", startsAt, bookUrl: "https://barbearia.test/agendar" };
    expect(whatsappCancelledByClientParams(d)).toEqual(["João", "sexta-feira, 22 de maio de 2026", "14:00", "https://barbearia.test/agendar"]);
  });

  it("lembrete_agendamento: 'amanhã' para 24 h e 'daqui a 2 horas' para 2 h", () => {
    const base = { businessName: "Barbearia Modelo", address: "", customerName: "Maria Silva", startsAt, services: "Corte de cabelo" };
    expect(whatsappReminderParams({ ...base, kind: "h24" })).toEqual(["Maria", "amanhã", "14:00", "Barbearia Modelo", "Corte de cabelo"]);
    expect(whatsappReminderParams({ ...base, kind: "h2" })[1]).toBe("daqui a 2 horas");
    expect(whatsappReminderParams({ ...base, services: "", kind: "h2" })[4]).toBe("—");
  });
});
