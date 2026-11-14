import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";

export type EmailMessage = { to: string; subject: string; html: string; text: string };
export type EmailResult = { ok: true; id?: string; dryRun?: boolean } | { ok: false; error: string };
export type EmailTransport = "resend" | "smtp";

/** Transporte escolhido por EMAIL_TRANSPORT (padrão: resend). No Docker, `smtp` aponta para a caixa de teste local. */
export function emailTransport(): EmailTransport {
  const t = (process.env.EMAIL_TRANSPORT ?? "resend").trim().toLowerCase();
  if (t === "resend" || t === "smtp") return t;
  throw new Error(`EMAIL_TRANSPORT inválido: "${t}" (use resend ou smtp)`);
}

const fromAddress = () => process.env.EMAIL_FROM ?? "Barbearia <onboarding@resend.dev>";
const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e));

let resend: Resend | null = null;
let smtp: Transporter | null = null;

async function sendWithResend(msg: EmailMessage): Promise<EmailResult> {
  const key = process.env.RESEND_API_KEY;
  // Sem chave (desenvolvimento): apenas registra no log.
  if (!key) {
    console.info(`[email:dry-run] para=${msg.to} assunto="${msg.subject}"`);
    return { ok: true, dryRun: true };
  }
  resend ??= new Resend(key);
  try {
    const { data, error } = await resend.emails.send({ from: fromAddress(), to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

async function sendWithSmtp(msg: EmailMessage): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  if (!host) return { ok: false, error: "Defina SMTP_HOST para EMAIL_TRANSPORT=smtp" };
  smtp ??= nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
  });
  try {
    const info = await smtp.sendMail({ from: fromAddress(), to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
    return { ok: true, id: info.messageId };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Envia e-mail pelo transporte configurado. */
export async function sendEmail(msg: EmailMessage): Promise<EmailResult> {
  let transport: EmailTransport;
  try {
    transport = emailTransport();
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
  return transport === "smtp" ? sendWithSmtp(msg) : sendWithResend(msg);
}
