import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { dispatchDueReminders } from "@/lib/notifications/dispatch";
import { sendEmail } from "@/lib/notifications/email";
import { sendPush } from "@/lib/notifications/push";
import { sendWhatsAppTemplate } from "@/lib/notifications/whatsapp";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Disparo periódico dos lembretes (Vercel Cron usa GET; pg_net pode usar POST). */
async function handle(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const summary = await dispatchDueReminders(createAdminClient(), { sendPush, sendEmail, sendWhatsApp: sendWhatsAppTemplate });
  return NextResponse.json(summary);
}

export const GET = handle;
export const POST = handle;
