import { addDays, format, parse, startOfWeek } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "@/lib/env";
import type { AppointmentStatus } from "@/lib/types";

export type AgendaView = "dia" | "semana";

export type AgendaItem = {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  total_cents: number;
  source: "web" | "admin";
  appointment_services: { name_snapshot: string }[];
};

/** Intervalo [início, fim) em UTC para o dia ou a semana (seg–dom) da data local informada. */
export function agendaRange(dateKey: string, view: AgendaView) {
  const day = parse(dateKey, "yyyy-MM-dd", new Date());
  const start = view === "semana" ? startOfWeek(day, { weekStartsOn: 1 }) : day;
  const end = addDays(start, view === "semana" ? 7 : 1);
  return {
    startKey: format(start, "yyyy-MM-dd"),
    endKey: format(end, "yyyy-MM-dd"),
    from: fromZonedTime(`${format(start, "yyyy-MM-dd")}T00:00:00`, TIMEZONE).toISOString(),
    to: fromZonedTime(`${format(end, "yyyy-MM-dd")}T00:00:00`, TIMEZONE).toISOString(),
  };
}

/** Total previsto: soma dos agendamentos não cancelados. */
export function expectedTotal(items: Pick<AgendaItem, "status" | "total_cents">[]): number {
  return items.filter((i) => i.status !== "cancelled").reduce((a, i) => a + i.total_cents, 0);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  no_show: "Não compareceu",
  cancelled: "Cancelado",
};
