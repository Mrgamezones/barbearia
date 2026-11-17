"use client";
import { BellRing, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ALERTS_CHANGED_EVENT, detectAlertsState } from "@/components/admin/AlertsCard";
import { panelPath } from "@/lib/paths";

const key = (slug: string) => `lembrete-avisos-dispensado:${slug}`;

/** Lembrete discreto na agenda enquanto este aparelho não recebe os avisos. Dispensável e lembrado. */
export function AlertsReminder({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(key(slug)) === "1";
    } catch {
      // Armazenamento bloqueado: mostra normalmente.
    }
    if (dismissed) return;
    const update = () =>
      detectAlertsState(slug)
        .then((s) => setShow(s === "idle" || s === "ios-install"))
        .catch(() => setShow(false));
    void update();
    window.addEventListener(ALERTS_CHANGED_EVENT, update);
    return () => window.removeEventListener(ALERTS_CHANGED_EVENT, update);
  }, [slug]);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(key(slug), "1");
    } catch {}
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm" data-testid="alerts-reminder">
      <BellRing className="size-4 shrink-0 text-gold" aria-hidden />
      <p className="flex-1">
        Ative os avisos para saber na hora quando um cliente marcar ou cancelar.{" "}
        <Link href={panelPath(slug, "config")} className="font-medium text-gold underline-offset-4 hover:underline">
          Ativar avisos
        </Link>
      </p>
      <button type="button" onClick={dismiss} className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-sm text-muted hover:text-text" aria-label="Dispensar lembrete">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}
