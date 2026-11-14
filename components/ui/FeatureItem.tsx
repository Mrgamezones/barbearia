import type { LucideIcon } from "lucide-react";

/** Diferencial: ícone dourado em traço, título e uma linha de descrição. */
export function FeatureItem({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:gap-4">
      <Icon aria-hidden className="size-8 shrink-0 text-gold sm:size-9" strokeWidth={1.25} />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        <p className="text-sm text-muted">{description}</p>
      </div>
    </div>
  );
}
