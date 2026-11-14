import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

const body = z.object({
  token: z.string().min(20).max(200),
  subscription: z.object({
    endpoint: z.url().startsWith("https://").max(2000),
    keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  }),
});

/** Associa uma inscrição de push ao agendamento do link (token) e agenda os lembretes. */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const { token, subscription } = parsed.data;
  const { data, error } = await createPublicClient().rpc("add_push_subscription", {
    p_token: token,
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.keys.p256dh,
    p_auth: subscription.keys.auth,
  });
  if (error) return NextResponse.json({ ok: false, error: "unknown" }, { status: 500 });
  const r = data as { ok: boolean; error?: string; appointment_id?: string };
  if (!r.ok) return NextResponse.json(r, { status: r.error === "not_found" ? 404 : 422 });
  return NextResponse.json(r);
}
