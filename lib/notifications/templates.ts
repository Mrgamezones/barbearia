import { formatDateLong, formatPrice, formatTime } from "@/lib/format";

export type ConfirmationData = {
  businessName: string;
  address: string;
  customerName: string;
  startsAt: string;
  services: { name: string; price_cents: number }[];
  totalCents: number;
  manageUrl: string;
};

export type ReminderData = {
  businessName: string;
  address: string;
  customerName: string;
  startsAt: string;
  services: string;
  kind: "h24" | "h2";
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#0b0b0c;color:#f4f1ea;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#141416;border:1px solid #2a2a2e;border-radius:12px">
<tr><td style="padding:28px">
<p style="margin:0 0 8px;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c8a165">${esc(title)}</p>
${body}
</td></tr></table></td></tr></table></body></html>`;
}

export function confirmationEmail(d: ConfirmationData) {
  const first = d.customerName.split(" ")[0];
  const when = `${formatDateLong(d.startsAt)}, às ${formatTime(d.startsAt)}`;
  const subject = `Agendamento confirmado — ${formatTime(d.startsAt)} de ${formatDateLong(d.startsAt).split(",")[1]?.trim() ?? ""}`.trim();
  const rows = d.services.map((s) => `<tr><td style="padding:4px 0">${esc(s.name)}</td><td align="right" style="color:#a39f97">${formatPrice(s.price_cents)}</td></tr>`).join("");
  const html = layout(
    d.businessName,
    `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:500;font-size:28px">Tudo certo, ${esc(first)}!</h1>
<p style="margin:0 0 16px;color:#a39f97">Seu horário está confirmado:</p>
<p style="margin:0 0 16px;font-size:18px;text-transform:capitalize">${esc(when)}</p>
<table role="presentation" width="100%" style="font-size:14px;border-top:1px solid #2a2a2e;border-bottom:1px solid #2a2a2e;padding:8px 0;margin-bottom:12px">${rows}
<tr><td style="padding-top:8px">Total</td><td align="right" style="padding-top:8px;color:#c8a165;font-size:18px">${formatPrice(d.totalCents)}</td></tr></table>
${d.address ? `<p style="margin:0 0 20px;color:#a39f97">📍 ${esc(d.address)}</p>` : ""}
<p style="margin:0 0 24px"><a href="${esc(d.manageUrl)}" style="display:inline-block;background:#c8a165;color:#0b0b0c;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:8px">Ver ou cancelar agendamento</a></p>
<p style="margin:0;font-size:12px;color:#a39f97">Cancelamentos pelo link até 2 horas antes do horário.</p>`,
  );
  const text = [
    `${d.businessName} — agendamento confirmado`,
    ``,
    `Olá, ${first}! Seu horário: ${when}.`,
    ...d.services.map((s) => `- ${s.name}: ${formatPrice(s.price_cents)}`),
    `Total: ${formatPrice(d.totalCents)}`,
    d.address ? `Endereço: ${d.address}` : "",
    ``,
    `Ver ou cancelar: ${d.manageUrl}`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");
  return { subject, html, text };
}

export function reminderMessage(d: ReminderData) {
  const time = formatTime(d.startsAt);
  const title = d.kind === "h24" ? `Amanhã às ${time} na ${d.businessName}` : `Daqui a 2 horas: ${time} na ${d.businessName}`;
  const body = `${d.services}. Até logo, ${d.customerName.split(" ")[0]}!`;
  return { title, body };
}

// --- WhatsApp: parâmetros dos modelos aprovados na Meta (ordem = {{1}}, {{2}}, ...) ---
// O texto de cada modelo está em docs/whatsapp-templates.md. Nenhum parâmetro pode ser vazio.

const orDash = (s: string | null | undefined) => (s && s.trim() ? s.trim() : "—");
const firstName = (name: string) => orDash(name.trim().split(/\s+/)[0]);

export type WhatsAppCancelData = { businessName: string; customerName: string; startsAt: string; bookUrl: string };

/** agendamento_confirmado: nome, barbearia, data, hora, serviços, total, endereço, link de gerenciamento */
export function whatsappConfirmationParams(d: ConfirmationData): string[] {
  return [
    firstName(d.customerName),
    orDash(d.businessName),
    formatDateLong(d.startsAt),
    formatTime(d.startsAt),
    orDash(d.services.map((s) => s.name).join(" + ")),
    formatPrice(d.totalCents),
    orDash(d.address),
    d.manageUrl,
  ];
}

/** agendamento_cancelado_barbearia: nome, barbearia, data, hora, link para agendar */
export function whatsappCancelledByAdminParams(d: WhatsAppCancelData): string[] {
  return [firstName(d.customerName), orDash(d.businessName), formatDateLong(d.startsAt), formatTime(d.startsAt), d.bookUrl];
}

/** agendamento_cancelado_cliente: nome, data, hora, link para agendar */
export function whatsappCancelledByClientParams(d: WhatsAppCancelData): string[] {
  return [firstName(d.customerName), formatDateLong(d.startsAt), formatTime(d.startsAt), d.bookUrl];
}

/** lembrete_agendamento: nome, "amanhã" | "daqui a 2 horas", hora, barbearia, serviços */
export function whatsappReminderParams(d: ReminderData): string[] {
  return [
    firstName(d.customerName),
    d.kind === "h24" ? "amanhã" : "daqui a 2 horas",
    formatTime(d.startsAt),
    orDash(d.businessName),
    orDash(d.services),
  ];
}

export function reminderEmail(d: ReminderData) {
  const { title, body } = reminderMessage(d);
  const html = layout(
    "Lembrete",
    `<h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:500;font-size:26px">${esc(title)}</h1>
<p style="margin:0 0 12px">${esc(body)}</p>
${d.address ? `<p style="margin:0 0 12px;color:#a39f97">📍 ${esc(d.address)}</p>` : ""}
<p style="margin:0;font-size:12px;color:#a39f97">Precisa cancelar? Use o link do e-mail de confirmação.</p>`,
  );
  return { subject: title, html, text: `${title}\n${body}\n${d.address}` };
}
