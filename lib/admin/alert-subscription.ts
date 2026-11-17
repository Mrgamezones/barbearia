import { z } from "zod";

/** Inscrição de push enviada pelo navegador do dono (PushSubscription.toJSON()). */
export const alertSubscriptionSchema = z.object({
  endpoint: z.url().startsWith("https://").max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export type AlertSubscriptionInput = z.input<typeof alertSubscriptionSchema>;

export const alertEndpointSchema = z.url().startsWith("https://").max(2000);

/** Navegador e sistema do aparelho, só para o dono reconhecer as inscrições (truncado). */
export function shortUserAgent(ua: string | null | undefined): string | null {
  return ua ? ua.slice(0, 500) : null;
}
