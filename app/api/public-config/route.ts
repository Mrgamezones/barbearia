import { publicEnv, vapidPublicKey } from "@/lib/env";

// Configuração pública do navegador lida em tempo de execução (a mesma imagem serve para qualquer ambiente).
// Só contém valores públicos por natureza: anon key (protegida por RLS) e chave pública VAPID.
export const dynamic = "force-dynamic";

export function GET() {
  const { anonKey } = publicEnv();
  return Response.json({ anonKey, vapidPublicKey: vapidPublicKey() }, { headers: { "cache-control": "no-store" } });
}
