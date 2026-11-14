import { z } from "zod";
import { CUSTOMER_MESSAGES, normalizeBrazilPhone } from "./customer";

export { normalizeBrazilPhone };

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, CUSTOMER_MESSAGES.nameShort)
    .max(80, CUSTOMER_MESSAGES.nameLong),
  phone: z
    .string()
    .transform((v, ctx) => {
      const n = normalizeBrazilPhone(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: CUSTOMER_MESSAGES.phone });
        return z.NEVER;
      }
      return n;
    }),
  email: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .pipe(z.email(CUSTOMER_MESSAGES.email).optional()),
});

export type CustomerInput = z.input<typeof customerSchema>;
export type Customer = z.output<typeof customerSchema>;

export const bookingSchema = customerSchema.extend({
  serviceIds: z.array(z.uuid()).min(1, "Escolha ao menos um serviço."),
  startsAt: z.iso.datetime({ offset: true, message: "Horário inválido." }),
  /** Consentimento para confirmação, cancelamento e lembretes pelo WhatsApp (marcado por padrão no formulário). */
  whatsappOptIn: z.boolean().default(true),
});

export type BookingInput = z.input<typeof bookingSchema>;

/** Converte erros do zod em { campo: mensagem }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
