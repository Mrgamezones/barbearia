import { describe, expect, it } from "vitest";
import { alertEndpointSchema, alertSubscriptionSchema, shortUserAgent } from "./alert-subscription";

const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "chave", auth: "segredo" } };

describe("inscrição de avisos do dono", () => {
  it("aceita a inscrição do navegador", () => {
    expect(alertSubscriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("recusa endpoint sem https, chaves vazias e campos faltando", () => {
    expect(alertSubscriptionSchema.safeParse({ ...valid, endpoint: "http://push.example/x" }).success).toBe(false);
    expect(alertSubscriptionSchema.safeParse({ ...valid, keys: { p256dh: "", auth: "a" } }).success).toBe(false);
    expect(alertSubscriptionSchema.safeParse({ endpoint: valid.endpoint }).success).toBe(false);
    expect(alertSubscriptionSchema.safeParse(null).success).toBe(false);
  });

  it("recusa endpoint longo demais", () => {
    expect(alertEndpointSchema.safeParse(`https://push.example/${"a".repeat(2000)}`).success).toBe(false);
  });

  it("trunca o user agent", () => {
    expect(shortUserAgent("x".repeat(600))).toHaveLength(500);
    expect(shortUserAgent(null)).toBeNull();
  });
});
