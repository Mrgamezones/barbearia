import { publicEnv } from "@/lib/env";

/** Saúde do app: consulta leve ao banco via PostgREST. Sem dados sensíveis na resposta. */
export async function checkHealth(timeoutMs = 3000): Promise<Response> {
  const headers = { "cache-control": "no-store" };
  try {
    const { url, anonKey } = publicEnv();
    const res = await fetch(`${url}/rest/v1/services?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return Response.json({ status: "error", database: "unavailable" }, { status: 503, headers });
    return Response.json({ status: "ok" }, { headers });
  } catch {
    return Response.json({ status: "error", database: "unavailable" }, { status: 503, headers });
  }
}
