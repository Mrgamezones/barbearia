import { Suspense } from "react";
import { cn } from "@/lib/cn";
import type { BusinessHour, BusinessSettings, Service } from "@/lib/types";
import { BookingFlow } from "./BookingFlow";
import { HoursCard } from "./HoursCard";

type Props = {
  services: Service[];
  settings: BusinessSettings;
  hours: BusinessHour[];
  /** h1 na página /agendar; h2 na home (onde o h1 é o hero). */
  headingLevel?: 1 | 2;
  className?: string;
};

/** Painel "Agende seu horário": título com traço dourado, horário de atendimento e o fluxo em etapas. */
export function BookingPanel({ services, settings, hours, headingLevel = 2, className }: Props) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <section id="agendar" aria-labelledby="agendar-titulo" className={cn("container-page scroll-mt-20", className)}>
      <div className="flex flex-col gap-6 rounded-md border border-border bg-surface p-4 shadow-2xl shadow-black/50 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Heading id="agendar-titulo" className="title-section">
              Agende seu horário
            </Heading>
            <span aria-hidden className="mt-3 block h-0.5 w-12 bg-gold" />
          </div>
          <HoursCard hours={hours} />
        </div>
        <Suspense fallback={<p className="text-muted">Carregando…</p>}>
          <BookingFlow
            services={services}
            headingLevel={headingLevel === 1 ? 2 : 3}
            barber={settings.barber_name ? { name: settings.barber_name, bio: settings.barber_bio, photoUrl: settings.barber_photo_url || null } : null}
          />
        </Suspense>
      </div>
    </section>
  );
}
