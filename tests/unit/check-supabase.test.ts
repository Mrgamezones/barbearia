// @vitest-environment node
import { describe, expect, it } from "vitest";
import { probeSupabase, resolveSupabaseEnv } from "../../scripts/check-supabase.mjs";

describe("resolveSupabaseEnv", () => {
  it("usa as NEXT_PUBLIC_* quando não há variáveis do Docker", () => {
    expect(resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56321", NEXT_PUBLIC_SUPABASE_ANON_KEY: "pub" })).toEqual({
      url: "http://127.0.0.1:56321",
      anonKey: "pub",
    });
  });

  it("dá prioridade a SUPABASE_INTERNAL_URL e SUPABASE_ANON_KEY, como lib/env.ts", () => {
    expect(
      resolveSupabaseEnv({
        SUPABASE_INTERNAL_URL: "http://kong:8000",
        SUPABASE_ANON_KEY: "interna",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:56321",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "pub",
      }),
    ).toEqual({ url: "http://kong:8000", anonKey: "interna" });
  });

  it("remove a barra final da URL", () => {
    expect(resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co/", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" })?.url).toBe(
      "https://x.supabase.co",
    );
  });

  it("retorna null sem URL ou sem chave", () => {
    expect(resolveSupabaseEnv({})).toBeNull();
    expect(resolveSupabaseEnv({ NEXT_PUBLIC_SUPABASE_URL: "http://x" })).toBeNull();
  });
});

describe("probeSupabase", () => {
  const config = { url: "http://x", anonKey: "k" };
  const respond = (status: number) => async () => new Response(null, { status });

  it("considera acessível qualquer status abaixo de 500", async () => {
    expect(await probeSupabase(config, respond(200))).toBeNull();
    expect(await probeSupabase(config, respond(401))).toBeNull();
  });

  it("falha com 5xx", async () => {
    expect(await probeSupabase(config, respond(503))).toBe("respondeu HTTP 503");
  });

  it("falha com erro de conexão mostrando o código", async () => {
    const refused = async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNREFUSED" } });
    };
    expect(await probeSupabase(config, refused)).toBe("ECONNREFUSED");
  });
});
