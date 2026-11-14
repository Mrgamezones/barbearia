/**
 * Cliente mínimo da WhatsApp Cloud API (Meta) para mensagens por modelo aprovado.
 * Sem WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID os envios são apenas simulados (dry-run).
 */

export type WhatsAppTemplateName =
  | "agendamento_confirmado"
  | "agendamento_cancelado_barbearia"
  | "agendamento_cancelado_cliente"
  | "lembrete_agendamento";

export type WhatsAppMessage = { to: string; template: WhatsAppTemplateName; params: string[] };

/**
 * - `sent`: aceito pela Meta (`id` = wamid)
 * - `dry_run`: credenciais ausentes, nada enviado
 * - `temporary`: limite de envio, indisponibilidade ou rede; pode ser tentado de novo
 * - `permanent`: número sem WhatsApp, modelo inválido, credencial recusada; não adianta repetir
 */
export type WhatsAppResult =
  | { status: "sent"; id: string | null }
  | { status: "dry_run" }
  | { status: "temporary"; error: string }
  | { status: "permanent"; error: string };

const DEFAULT_API_VERSION = "v23.0";
const DEFAULT_LANG = "pt_BR";
const TIMEOUT_MS = 8000;

/** Códigos de erro da Meta que indicam limite de envio (temporários). */
const RATE_LIMIT_CODES = new Set([4, 80007, 130429, 131048, 131056]);

/** Mostra só os 4 últimos dígitos do número, para logs. */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 4 ? `…${digits.slice(-4)}` : "…";
}

export function whatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** A Meta rejeita parâmetros vazios e com quebra de linha/tab ou mais de 4 espaços seguidos. */
function cleanParam(p: string): string {
  const v = p.replace(/[\n\r\t]+/g, " ").replace(/ {4,}/g, "   ").trim();
  return v || "—";
}

type GraphError = { error?: { code?: number; message?: string; error_data?: { details?: string } } };

export async function sendWhatsAppTemplate(msg: WhatsAppMessage): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    console.info(`[whatsapp:dry-run] para=${maskPhone(msg.to)} modelo=${msg.template}`);
    return { status: "dry_run" };
  }

  const version = process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || DEFAULT_LANG;
  const body = {
    messaging_product: "whatsapp",
    to: msg.to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: msg.template,
      language: { code: lang },
      components: [{ type: "body", parameters: msg.params.map((p) => ({ type: "text", text: cleanParam(p) })) }],
    },
  };

  let res: Response;
  try {
    res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    console.error(`[whatsapp] falha de rede para=${maskPhone(msg.to)} modelo=${msg.template}`, error);
    return { status: "temporary", error };
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // corpo vazio ou não-JSON: decide só pelo status HTTP
  }

  if (res.ok) {
    const id = (json as { messages?: { id?: string }[] } | null)?.messages?.[0]?.id ?? null;
    return { status: "sent", id };
  }

  const err = (json as GraphError | null)?.error;
  const code = err?.code;
  const error = `${code ?? res.status}: ${err?.error_data?.details ?? err?.message ?? res.statusText}`;
  const temporary = res.status === 429 || res.status >= 500 || (code !== undefined && RATE_LIMIT_CODES.has(code));
  console.error(`[whatsapp] envio recusado para=${maskPhone(msg.to)} modelo=${msg.template} http=${res.status} erro=${error}`);
  return temporary ? { status: "temporary", error } : { status: "permanent", error };
}
