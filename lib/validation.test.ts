// @vitest-environment node
import { describe, expect, it } from "vitest";
import { bookingSchema, customerSchema, fieldErrors, normalizeBrazilPhone } from "./validation";

describe("normalizeBrazilPhone", () => {
  it.each([
    ["(11) 99999-8888", "+5511999998888"],
    ["11999998888", "+5511999998888"],
    ["+55 11 99999-8888", "+5511999998888"],
    ["5521987654321", "+5521987654321"],
    ["(11) 3333-4444", "+551133334444"],
  ])("aceita %s", (input, expected) => {
    expect(normalizeBrazilPhone(input)).toBe(expected);
  });

  it.each(["1234", "", "(01) 99999-8888", "(11) 89999-8888", "11 9999-888", "(11) 1333-4444", "abc"])(
    "rejeita %s",
    (input) => {
      expect(normalizeBrazilPhone(input)).toBeNull();
    },
  );
});

describe("customerSchema", () => {
  it("rejeita o telefone 1234 com mensagem de telefone inválido", () => {
    const r = customerSchema.safeParse({ name: "João", phone: "1234" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).phone).toMatch(/WhatsApp inválido/);
  });

  it("valida nome entre 2 e 80 caracteres", () => {
    expect(customerSchema.safeParse({ name: "J", phone: "11999998888" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "x".repeat(81), phone: "11999998888" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "  Jo  ", phone: "11999998888" }).success).toBe(true);
  });

  it("e-mail é opcional, mas se informado precisa ser válido", () => {
    expect(customerSchema.parse({ name: "Ana", phone: "11999998888" }).email).toBeUndefined();
    expect(customerSchema.parse({ name: "Ana", phone: "11999998888", email: "" }).email).toBeUndefined();
    expect(customerSchema.parse({ name: "Ana", phone: "11999998888", email: "Ana@Ex.com " }).email).toBe("ana@ex.com");
    expect(customerSchema.safeParse({ name: "Ana", phone: "11999998888", email: "ana@" }).success).toBe(false);
  });

  it("normaliza o telefone na saída", () => {
    expect(customerSchema.parse({ name: "Ana", phone: "(21) 98765-4321" }).phone).toBe("+5521987654321");
  });
});

describe("bookingSchema", () => {
  const base = {
    name: "Ana",
    phone: "11999998888",
    serviceIds: ["7f1c2a7e-0b1a-4c8e-9a51-3f0b2b6f9d10"],
    startsAt: "2026-05-22T17:00:00.000Z",
  };
  it("exige ao menos um serviço", () => {
    const r = bookingSchema.safeParse({ ...base, serviceIds: [] });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).serviceIds).toBe("Escolha ao menos um serviço.");
  });
  it("aceita dados válidos", () => {
    expect(bookingSchema.safeParse(base).success).toBe(true);
  });
  it("consentimento de WhatsApp: ausente vira true, false é preservado", () => {
    expect(bookingSchema.parse(base).whatsappOptIn).toBe(true);
    expect(bookingSchema.parse({ ...base, whatsappOptIn: false }).whatsappOptIn).toBe(false);
    expect(bookingSchema.safeParse({ ...base, whatsappOptIn: "sim" }).success).toBe(false);
  });
});
