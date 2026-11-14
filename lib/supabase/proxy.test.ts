// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { proxySupabase } from "./proxy";

const fetchMock = vi.fn();

describe("proxy /supabase", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_INTERNAL_URL", "http://kong:8000/");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("GET /supabase/rest/v1/services repassa para a URL interna lida em runtime e devolve os serviços", async () => {
    const services = [{ id: 1, name: "Corte de cabelo" }];
    fetchMock.mockResolvedValue(Response.json(services, { headers: { "content-encoding": "gzip", "x-total": "1" } }));

    const res = await proxySupabase(
      new Request("http://localhost:3000/supabase/rest/v1/services?select=id,name&active=eq.true", { headers: { apikey: "anon", host: "localhost:3000" } }),
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://kong:8000/rest/v1/services?select=id,name&active=eq.true");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect((init.headers as Headers).get("apikey")).toBe("anon");
    expect((init.headers as Headers).has("host")).toBe(false);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-total")).toBe("1");
    expect(res.headers.has("content-encoding")).toBe(false);
    expect(await res.json()).toEqual(services);
  });

  it("repassa método e corpo em streaming (POST de RPC/login)", async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => new Response(await new Response(init.body).text(), { status: 201 }));
    const res = await proxySupabase(
      new Request("http://localhost:3000/supabase/auth/v1/token?grant_type=password", { method: "POST", body: '{"email":"a@b.c"}', headers: { "content-type": "application/json" } }),
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://kong:8000/auth/v1/token?grant_type=password");
    expect(init.method).toBe("POST");
    expect(init.duplex).toBe("half");
    expect(res.status).toBe(201);
    expect(await res.text()).toBe('{"email":"a@b.c"}');
  });

  it("Supabase fora do ar vira 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await proxySupabase(new Request("http://localhost:3000/supabase/rest/v1/services"));
    expect(res.status).toBe(502);
  });
});
