"use client";
import { addDays, addMonths, endOfMonth, format, getDay, parse, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

const WEEK = [
  ["DOM", "domingo"],
  ["SEG", "segunda-feira"],
  ["TER", "terça-feira"],
  ["QUA", "quarta-feira"],
  ["QUI", "quinta-feira"],
  ["SEX", "sexta-feira"],
  ["SÁB", "sábado"],
] as const;
const toKey = (d: Date) => format(d, "yyyy-MM-dd");
const fromKey = (k: string) => parse(k, "yyyy-MM-dd", new Date());

type Props = {
  month: string; // yyyy-MM-01
  onMonthChange: (month: string) => void;
  minDate: string;
  maxDate: string;
  available: Set<string>;
  selected: string | null;
  onSelect: (date: string) => void;
  loading?: boolean;
};

/**
 * Calendário mensal (domingo primeiro) no padrão ARIA "grid": uma única parada de Tab
 * e setas para andar entre os dias disponíveis. Indisponíveis ficam esmaecidos e desabilitados.
 */
export function Calendar({ month, onMonthChange, minDate, maxDate, available, selected, onSelect, loading }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const first = startOfMonth(fromKey(month));
  const last = endOfMonth(first);
  const cells: (string | null)[] = [...Array(getDay(first)).fill(null)];
  for (let d = first; d <= last; d = addDays(d, 1)) cells.push(toKey(d));
  while (cells.length % 7) cells.push(null);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));

  const isEnabled = (key: string) => key >= minDate && key <= maxDate && available.has(key);
  const enabledKeys = cells.filter((k): k is string => !!k && isEnabled(k));
  // Dia que recebe o Tab: o focado por último, o selecionado ou o primeiro disponível do mês.
  const tabKey = [focusKey, selected, enabledKeys[0]].find((k) => k && enabledKeys.includes(k)) ?? null;

  const prevMonth = toKey(addMonths(first, -1));
  const nextMonth = toKey(addMonths(first, 1));
  // Só navega para meses que tenham algum dia dentro da janela [minDate, maxDate].
  const showPrev = prevMonth.slice(0, 7) >= minDate.slice(0, 7);
  const showNext = nextMonth.slice(0, 7) <= maxDate.slice(0, 7);

  function focusDay(key: string) {
    setFocusKey(key);
    grid.current?.querySelector<HTMLButtonElement>(`button[data-day="${key}"]`)?.focus();
  }

  // Setas: dia anterior/seguinte (←/→) e semana anterior/seguinte (↑/↓), pulando indisponíveis.
  // Home/End: primeiro/último dia disponível do mês.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = (document.activeElement as HTMLElement | null)?.dataset.day;
    if (!current) return;
    if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      const target = e.key === "Home" ? enabledKeys[0] : enabledKeys.at(-1);
      if (target) focusDay(target);
      return;
    }
    const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const i = cells.indexOf(current);
    for (let j = i + delta; j >= 0 && j < cells.length; j += delta) {
      const k = cells[j];
      if (k && isEnabled(k)) return focusDay(k);
    }
  }

  return (
    <div className="flex flex-col gap-2" aria-busy={loading}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(prevMonth)}
          disabled={!showPrev}
          className="flex size-11 items-center justify-center rounded-sm text-text hover:bg-surface disabled:invisible"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <p id={`mes-${month}`} className="text-sm font-medium capitalize" aria-live="polite">
          {format(first, "MMMM yyyy", { locale: ptBR })}
        </p>
        <button
          type="button"
          onClick={() => onMonthChange(nextMonth)}
          disabled={!showNext}
          className="flex size-11 items-center justify-center rounded-sm text-text hover:bg-surface disabled:invisible"
          aria-label="Próximo mês"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
      <div ref={grid} role="grid" aria-label="Escolha a data" aria-describedby={`mes-${month}`} onKeyDown={onKeyDown} className="flex flex-col gap-1">
        <div role="row" className="grid grid-cols-7 text-center">
          {WEEK.map(([abbr, full]) => (
            <span key={abbr} role="columnheader" aria-label={full} className="py-1 text-xs font-medium text-muted">
              {abbr}
            </span>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div role="row" key={w} className="grid grid-cols-7 text-center">
            {week.map((key, i) => {
              if (!key) return <span role="gridcell" key={`vazio-${w}-${i}`} />;
              const enabled = isEnabled(key);
              const isSelected = key === selected;
              return (
                <span role="gridcell" key={key} aria-selected={isSelected}>
                  <button
                    type="button"
                    data-day={key}
                    disabled={!enabled}
                    tabIndex={key === tabKey ? 0 : -1}
                    onClick={() => onSelect(key)}
                    onFocus={() => setFocusKey(key)}
                    aria-pressed={isSelected}
                    aria-label={format(fromKey(key), "EEEE, d 'de' MMMM", { locale: ptBR }) + (enabled ? "" : " — indisponível")}
                    className={cn(
                      "mx-auto flex size-11 items-center justify-center rounded-full text-sm tabular-nums transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-text",
                      isSelected && "bg-gold font-semibold text-on-gold",
                      !isSelected && enabled && "text-text hover:bg-surface",
                      !enabled && "cursor-not-allowed text-muted/40",
                    )}
                  >
                    {Number(key.slice(8))}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
