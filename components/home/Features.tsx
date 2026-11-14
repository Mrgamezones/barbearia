import { Armchair, Award, BellRing, CalendarClock } from "lucide-react";
import { FeatureItem } from "@/components/ui/FeatureItem";

const FEATURES = [
  { icon: CalendarClock, title: "Agendamento rápido", description: "Escolha serviço e horário em poucos toques." },
  { icon: Award, title: "Profissional experiente", description: "Técnica apurada em cortes clássicos e modernos." },
  { icon: Armchair, title: "Ambiente premium", description: "Conforto e cuidado do começo ao fim." },
  { icon: BellRing, title: "Lembretes automáticos", description: "Avisamos antes do horário para você não esquecer." },
];

/** Faixa de diferenciais: 4 itens com divisórias no desktop, grade 2×2 no celular. */
export function Features() {
  return (
    <section aria-labelledby="diferenciais-titulo" className="container-page pt-16 lg:pt-24">
      <h2 id="diferenciais-titulo" className="sr-only">
        Diferenciais
      </h2>
      <ul
        className="grid grid-cols-2 gap-x-4 gap-y-8 rounded-md border border-border bg-surface p-5 md:p-6 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-border lg:px-0 lg:py-8"
        data-testid="features"
      >
        {FEATURES.map((f) => (
          <li key={f.title} className="lg:px-8">
            <FeatureItem icon={f.icon} title={f.title} description={f.description} />
          </li>
        ))}
      </ul>
    </section>
  );
}
