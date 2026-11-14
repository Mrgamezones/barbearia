import { cn } from "@/lib/cn";

type Step = { title: string; description?: string };

/** Etapas numeradas; a etapa ativa fica com círculo dourado preenchido. */
export function Stepper({ steps, current }: { steps: Step[]; current: number }) {
  return (
    <ol className="flex w-full items-start gap-2 md:gap-4" aria-label="Etapas do agendamento">
      {steps.map((step, i) => {
        const index = i + 1;
        const state = index < current ? "done" : index === current ? "current" : "todo";
        return (
          <li key={step.title} className="flex min-w-0 flex-1 items-center gap-3" aria-current={state === "current" ? "step" : undefined}>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                state === "current" && "border-gold bg-gold text-on-gold",
                state === "done" && "border-gold text-gold",
                state === "todo" && "border-border text-muted",
              )}
            >
              {index}
            </span>
            <span className="hidden min-w-0 flex-col sm:flex">
              <span className={cn("truncate text-sm font-medium", state === "todo" ? "text-muted" : "text-text")}>{step.title}</span>
              {step.description ? <span className="truncate text-xs text-muted">{step.description}</span> : null}
            </span>
            {index < steps.length ? <span aria-hidden className="hidden h-px flex-1 bg-border lg:block" /> : null}
          </li>
        );
      })}
    </ol>
  );
}
