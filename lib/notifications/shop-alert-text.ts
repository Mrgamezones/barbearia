import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { TIMEZONE } from "@/lib/env";
import { panelPath } from "@/lib/paths";
import { formatTime, toLocalDateKey } from "@/lib/format";

export type ShopAlertKind = "booked" | "cancelled_by_client";

export type ShopAlertTextInput = {
  kind: ShopAlertKind;
  customerName: string;
  startsAt: string;
  services: string[];
  shopSlug: string;
  now?: Date;
};

/** "hoje", "amanhã" ou "sexta, 21/11" no fuso da barbearia. */
export function relativeDay(startsAt: string, now = new Date(), tz = TIMEZONE): string {
  const key = toLocalDateKey(startsAt, tz);
  if (key === toLocalDateKey(now, tz)) return "hoje";
  if (key === toLocalDateKey(addDays(now, 1), tz)) return "amanhã";
  return formatInTimeZone(startsAt, tz, "EEEE, dd/MM", { locale: ptBR }).replace("-feira", "");
}

/** Título, texto e destino do aviso ao dono. */
export function formatShopAlert(d: ShopAlertTextInput): { title: string; body: string; url: string } {
  const when = `${relativeDay(d.startsAt, d.now)}, ${formatTime(d.startsAt)}`;
  const url = `${panelPath(d.shopSlug)}?data=${toLocalDateKey(d.startsAt)}`;
  if (d.kind === "booked") {
    const services = d.services.length ? ` · ${d.services.join(", ")}` : "";
    return { title: "Novo agendamento", body: `${d.customerName} — ${when}${services}`, url };
  }
  return { title: "Agendamento cancelado", body: `${d.customerName} cancelou ${when}. O horário está livre.`, url };
}
