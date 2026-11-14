import { publicEnv } from "@/lib/env";

/**
 * Proxy do Supabase no mesmo endereço do site: o navegador chama `${origin}/supabase/...`
 * e o servidor repassa para a URL interna lida em tempo de execução (no Docker: o Kong da rede do Supabase).
 */

/** Headers que não devem ser repassados entre as conexões. */
const HOP_BY_HOP = ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "te", "trailer", "host"];

export async function proxySupabase(request: Request): Promise<Response> {
  const incoming = new URL(request.url);
  const target = `${publicEnv().url}${incoming.pathname.replace(/^\/supabase/, "")}${incoming.search}`;

  const headers = new Headers(request.headers);
  for (const h of [...HOP_BY_HOP, "content-length", "accept-encoding"]) headers.delete(h);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      // Corpo em streaming (necessário no Node para ReadableStream).
      ...(hasBody ? { duplex: "half" } : {}),
      redirect: "manual",
      cache: "no-store",
    } as RequestInit);
  } catch {
    return Response.json({ error: "Supabase indisponível" }, { status: 502 });
  }

  const out = new Headers(upstream.headers);
  // O fetch já descomprimiu o corpo; tamanho/codificação originais não valem mais.
  for (const h of [...HOP_BY_HOP, "content-encoding", "content-length"]) out.delete(h);

  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: out });
}

