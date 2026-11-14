// Validação dos dados do cliente sem dependências: roda no navegador sem trazer o zod para o
// bundle da página inicial. O servidor valida de novo com o schema zod (lib/validation.ts),
// que usa as mesmas regras e mensagens daqui.

export const CUSTOMER_MESSAGES = {
  nameShort: "Informe seu nome (mínimo de 2 letras).",
  nameLong: "O nome pode ter no máximo 80 caracteres.",
  phone: "WhatsApp inválido. Use DDD + número, ex.: (11) 99999-8888.",
  email: "E-mail inválido.",
} as const;

/**
 * Normaliza um WhatsApp brasileiro para E.164 (+55DDNNNNNNNNN).
 * Aceita com ou sem +55, parênteses, espaços e hífens. Retorna null se inválido.
 * Regras: DDD 11–99 (sem zero), celular com 9 dígitos começando por 9, ou fixo com 8 dígitos (2–5).
 */
export function normalizeBrazilPhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  else if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return null;

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (!/^[1-9][1-9]$/.test(ddd)) return null;
  const isMobile = number.length === 9 && number.startsWith("9");
  const isLandline = number.length === 8 && /^[2-5]/.test(number);
  if (!isMobile && !isLandline) return null;
  return `+55${ddd}${number}`;
}

// Mesmo formato aceito pelo z.email() (padrão do zod v4).
const EMAIL = /^(?:[A-Za-z0-9_'+\-]+\.)*[A-Za-z0-9_'+\-]*[A-Za-z0-9_+-]@(?:[A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

/** Erros por campo ({} quando tudo certo). */
export function checkCustomer(c: { name: string; phone: string; email?: string }): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = c.name.trim();
  if (name.length < 2) errors.name = CUSTOMER_MESSAGES.nameShort;
  else if (name.length > 80) errors.name = CUSTOMER_MESSAGES.nameLong;
  if (!normalizeBrazilPhone(c.phone)) errors.phone = CUSTOMER_MESSAGES.phone;
  const email = c.email?.trim().toLowerCase();
  if (email && !EMAIL.test(email)) errors.email = CUSTOMER_MESSAGES.email;
  return errors;
}
