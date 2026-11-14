import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";

export function ServiceList({ services }: { services: Service[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {services.map((s) => (
        <li key={s.id} className="flex items-start justify-between gap-4 rounded-md border border-border bg-card p-4" data-testid="service-item">
          <div className="min-w-0">
            <h3 className="font-medium text-text">{s.name}</h3>
            {s.description ? <p className="mt-1 text-sm text-muted">{s.description}</p> : null}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-semibold text-gold">{formatPrice(s.price_cents)}</p>
            <p className="text-xs text-muted">{formatDuration(s.duration_min)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
