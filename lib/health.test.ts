// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkHealth } from "./health";

const fetchMock = vi.fn();

describe("/api/health", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_INTERNAL_URL", "http://kong:8000");
    vi.stubEnv("SUPABASE_ANON_KEY", "anon");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("200 { status: 'ok' } com o banco acessível", async () => {
    fetchMock.mockResolvedValue(Response.json([{ id: 1 }]));
    const res = await checkHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock.mock.calls[0][0]).toBe("http://kong:8000/rest/v1/services?select=id&limit=1");
  });

  it("503 com o Supabase parado (conexão recusada)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await checkHealth();
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("error");
  });

  it("503 quando o PostgREST responde erro", async () => {
    fetchMock.mockResolvedValue(new Response("bad gateway", { status: 502 }));
    expect((await checkHealth()).status).toBe(503);
  });
});
