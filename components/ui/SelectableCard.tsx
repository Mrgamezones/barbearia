"use client";
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  selected: boolean;
  onToggle: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  disabled?: boolean;
  /** checkbox (vários) ou radio (um). */
  role?: "checkbox" | "radio";
};

/** Cartão selecionável com marcador dourado (check) quando selecionado. */
export function SelectableCard({ selected, onToggle, title, subtitle, aside, disabled, role = "checkbox" }: Props) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 rounded-sm border bg-card px-4 py-3 text-left transition-colors disabled:opacity-50",
        selected ? "border-gold" : "border-border hover:border-muted/60",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-text">{title}</span>
        {subtitle ? <span className="text-sm text-muted">{subtitle}</span> : null}
      </span>
      {aside}
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border",
          selected ? "border-gold bg-gold text-on-gold" : "border-muted/60",
        )}
      >
        {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
