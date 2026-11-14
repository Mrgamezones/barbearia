import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & { selected: boolean };

/** Chip de horário: neutro, dourado quando selecionado; o anel de foco é distinto da seleção. */
export function TimeChip({ selected, className, ...props }: Props) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "min-h-11 rounded-sm border text-sm tabular-nums transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text",
        "disabled:cursor-not-allowed disabled:opacity-40",
        selected ? "border-gold bg-gold font-semibold text-on-gold" : "border-border bg-card text-text hover:border-gold/60",
        className,
      )}
      {...props}
    />
  );
}
