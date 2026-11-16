// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// unstable_cache sem cache: registra chaves e tags e executa a função.
const cacheCalls: { keys: string[]; tags: string[] }[] = [];
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => unknown, keys: string[], opts: { tags: string[] }) => {
    cacheCalls.push({ keys, tags: opts.tags });
    return fn;
  },
}));

// Supabase simulado: registra os filtros e devolve o resultado configurado por tabela.
type Result = { data: unknown; error: unknown };
const results: Record<string, Result> = {};
const filters: Record<string, [string, unknown][]> = {};
function query(table: string) {
  filters[table] = [];
  const q = {
    select: () => q,
    eq: (col: string, val: unknown) => (filters[table].push([col, val]), q),
    order: () => q,
    maybeSingle: () => Promise.resolve(results[table]),
    then: (ok: (r: Result) => unknown) => Promise.resolve(results[table]).then(ok),
  };
  return q;
}
vi.mock("@/lib/supabase/public", () => ({ createPublicClient: () => ({ from: query }) }));

const { getShop, getActiveServices, getBusinessHours, shopTag } = await import("./public");

beforeEach(() => {
  cacheCalls.length = 0;
});

describe("getShop", () => {
  it("busca a barbearia ativa pelo slug, com cache por slug", async () => {
    results.shops = { data: { id: "s1", slug: "demir-barbershop", name: "Demir Barbershop" }, error: null };
    const shop = await getShop("demir-barbershop");
    expect(shop?.name).toBe("Demir Barbershop");
    expect(filters.shops).toEqual([["slug", "demir-barbershop"], ["active", true]]);
    expect(cacheCalls[0]).toEqual({ keys: ["shop", "demir-barbershop"], tags: ["shop:demir-barbershop"] });
  });

  it("retorna null quando o slug não existe", async () => {
    results.shops = { data: null, error: null };
    expect(await getShop("nao-existe")).toBeNull();
  });

  it("propaga erros do banco", async () => {
    results.shops = { data: null, error: new Error("fora do ar") };
    await expect(getShop("erro-banco")).rejects.toThrow("fora do ar");
  });
});

describe("serviços e horários", () => {
  const shop = { id: "s1", slug: "demir-barbershop" };

  it("serviços ativos só da barbearia", async () => {
    results.services = { data: [{ id: "x", name: "Corte de cabelo" }], error: null };
    expect(await getActiveServices(shop)).toHaveLength(1);
    expect(filters.services).toEqual([["shop_id", "s1"], ["active", true]]);
    expect(cacheCalls[0].tags).toEqual([shopTag("demir-barbershop")]);
  });

  it("horários só da barbearia", async () => {
    results.business_hours = { data: [], error: null };
    await getBusinessHours(shop);
    expect(filters.business_hours).toEqual([["shop_id", "s1"]]);
    expect(cacheCalls[0].keys).toEqual(["business-hours", "demir-barbershop"]);
  });
});
