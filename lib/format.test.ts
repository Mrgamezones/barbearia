// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatDateLong, formatDateShort, formatDuration, formatPhone, formatPrice, formatTime, toLocalDateKey, whatsappLink } from "./format";

describe("formatPrice", () => {
  it("formata centavos em BRL", () => {
    expect(formatPrice(4500)).toBe("R$ 45,00");
    expect(formatPrice(0)).toBe("R$ 0,00");
    expect(formatPrice(123456)).toBe("R$ 1.234,56");
  });
});

describe("formatDuration", () => {
  it("formata minutos", () => {
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(75)).toBe("1h 15min");
  });
});

describe("datas no fuso America/Sao_Paulo", () => {
  // 2026-05-22T02:30Z = 21/05 23:30 em São Paulo (UTC-3): vira o dia corretamente.
  const d = new Date("2026-05-22T02:30:00Z");
  it("usa o fuso da barbearia, não o do servidor", () => {
    expect(formatTime(d)).toBe("23:30");
    expect(formatDateShort(d)).toBe("21/05/2026");
    expect(toLocalDateKey(d)).toBe("2026-05-21");
  });
  it("data por extenso em pt-BR", () => {
    expect(formatDateLong(new Date("2026-05-22T15:00:00Z"))).toBe("sexta-feira, 22 de maio de 2026");
  });
});

describe("telefone", () => {
  it("formata E.164 brasileiro", () => {
    expect(formatPhone("+5511999998888")).toBe("(11) 99999-8888");
    expect(formatPhone("+551133334444")).toBe("(11) 3333-4444");
  });
  it("gera link do WhatsApp", () => {
    expect(whatsappLink("+5511999998888", "Olá")).toBe("https://wa.me/5511999998888?text=Ol%C3%A1");
  });
});
