import "server-only";
import * as webpush from "web-push";
import { vapidPublicKey } from "@/lib/env";
import type { PushPayload, PushSendResult, PushSubscriptionRow } from "./dispatch";

let configured = false;

function configure() {
  if (configured) return;
  const pub = vapidPublicKey();
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Defina VAPID_PUBLIC_KEY (ou NEXT_PUBLIC_VAPID_PUBLIC_KEY) e VAPID_PRIVATE_KEY");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contato@barbearia.local", pub, priv);
  configured = true;
}

/** Envia uma notificação Web Push. 404/410 indicam inscrição expirada. */
export async function sendPush(sub: PushSubscriptionRow, payload: PushPayload): Promise<PushSendResult> {
  configure();
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), {
      TTL: 60 * 60 * 2,
      urgency: "high",
    });
    return "sent";
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) return "gone";
    console.error("[push] falha no envio", code, (e as Error).message);
    return "error";
  }
}
