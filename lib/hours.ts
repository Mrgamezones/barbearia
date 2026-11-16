import type { BusinessHour } from "@/lib/types";

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
const SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"] as const;

/** "09:00:00" -> "9h"; "12:30:00" -> "12h30" (sem zero à esquerda, como no padrão oficial brasileiro). */
export function shortTime(t: string): string {
  const [h, m] = t.split(":");
  const hour = String(Number(h));
  return m === "00" ? `${hour}h` : `${hour}h${m}`;
}

/** Linha por dia: "Terça — 9h às 19h" ou "Domingo — Fechado". */
export function hoursByDay(hours: BusinessHour[]) {
  return WEEKDAYS.map((label, weekday) => {
    const h = hours.find((x) => x.weekday === weekday);
    const text = h?.is_open && h.open_time && h.close_time ? `${shortTime(h.open_time)} às ${shortTime(h.close_time)}` : "Fechado";
    return { weekday, label, text };
  });
}

/**
 * Resumo compacto dos dias abertos, agrupando dias seguidos com o mesmo horário.
 * Ex.: "TER–SÁB: 9h às 19h" ou "SEG, QUA: 9h às 18h · SÁB: 8h às 12h".
 */
export function hoursSummary(hours: BusinessHour[]): string {
  const open = hoursByDay(hours).filter((d) => d.text !== "Fechado");
  if (!open.length) return "Fechado";
  const groups: { days: number[]; text: string }[] = [];
  for (const d of open) {
    const last = groups.at(-1);
    if (last && last.text === d.text && last.days.at(-1) === d.weekday - 1) last.days.push(d.weekday);
    else groups.push({ days: [d.weekday], text: d.text });
  }
  // Rótulo de cada sequência; depois junta sequências com o mesmo horário.
  const byText = new Map<string, string[]>();
  for (const g of groups) {
    const label = g.days.length >= 3 ? `${SHORT[g.days[0]]}–${SHORT[g.days.at(-1)!]}` : g.days.map((x) => SHORT[x]).join(", ");
    byText.set(g.text, [...(byText.get(g.text) ?? []), label]);
  }
  return [...byText].map(([text, labels]) => `${labels.join(", ")}: ${text}`).join(" · ");
}
