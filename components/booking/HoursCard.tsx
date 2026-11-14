import { Clock } from "lucide-react";
import { hoursSummary } from "@/lib/hours";
import type { BusinessHour } from "@/lib/types";

/** Horário de atendimento resumido (ex.: "TER–SÁB: 09h às 19h"), com ícone de relógio. */
export function HoursCard({ hours }: { hours: BusinessHour[] }) {
  return (
    <p className="flex items-center gap-3" data-testid="hours-card">
      <Clock aria-hidden className="size-8 shrink-0 text-gold" strokeWidth={1.25} />
      <span className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted">Atendimento</span>
        <span className="sr-only"> — </span>
        <span className="text-sm font-semibold text-text">{hoursSummary(hours)}</span>
      </span>
    </p>
  );
}
