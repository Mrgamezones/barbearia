import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIMEZONE } from "@/lib/env";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 4500 -> "R$ 45,00" (espaço normal, sem NBSP). */
export function formatPrice(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** 30 -> "30 min"; 75 -> "1h 15min"; 60 -> "1h". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

type DateInput = Date | string | number;

/** "terça-feira, 22 de maio de 2026" */
export function formatDateLong(date: DateInput, tz = TIMEZONE): string {
  return formatInTimeZone(date, tz, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/** "22/05/2026" */
export function formatDateShort(date: DateInput, tz = TIMEZONE): string {
  return formatInTimeZone(date, tz, "dd/MM/yyyy", { locale: ptBR });
}

/** "14:30" */
export function formatTime(date: DateInput, tz = TIMEZONE): string {
  return formatInTimeZone(date, tz, "HH:mm", { locale: ptBR });
}

/** Data local (YYYY-MM-DD) no fuso da barbearia. */
export function toLocalDateKey(date: DateInput, tz = TIMEZONE): string {
  return formatInTimeZone(date, tz, "yyyy-MM-dd");
}

/** "+5511999998888" -> "(11) 99999-8888" */
export function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, "").replace(/^55/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return e164;
}

/** Link wa.me para um telefone E.164. */
export function whatsappLink(e164: string, text?: string): string {
  const base = `https://wa.me/${e164.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
