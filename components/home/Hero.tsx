import { CalendarDays } from "lucide-react";
import Image from "next/image";
import heroPhoto from "@/public/hero.webp";
import type { BusinessSettings } from "@/lib/types";
import { ScrollToBooking } from "./ScrollToBooking";

/** Hero: foto em sangria com gradiente escuro, eyebrow, título em duas linhas (2ª dourada), subtítulo e CTA. */
export function Hero({ settings }: { settings: BusinessSettings }) {
  const line1 = settings.hero_title_line1 || settings.name;
  const line2 = settings.hero_title_line2;
  return (
    <section id="inicio" className="relative isolate scroll-mt-24 overflow-hidden" data-testid="hero">
      <Image
        src={heroPhoto}
        alt="Barbeiro acertando o corte de um cliente com pente e máquina"
        fill
        priority
        fetchPriority="high"
        quality={60}
        sizes="100vw"
        placeholder="blur"
        className="-z-20 object-cover object-[70%_center] lg:object-right"
      />
      {/* Celular: escurece a foto inteira e reforça a base. Desktop: gradiente da esquerda para a direita. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-t from-bg from-10% via-bg/85 via-55% to-bg/60 lg:hidden" />
      <div aria-hidden className="absolute inset-0 -z-10 hidden bg-linear-to-r from-bg from-30% via-bg/85 via-50% to-transparent to-80% lg:block" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 hidden h-40 bg-linear-to-t from-bg to-transparent lg:block" />

      <div className="container-page flex min-h-[560px] flex-col justify-end gap-6 pt-40 pb-20 lg:min-h-[600px] lg:justify-center lg:pt-16 lg:pb-36" data-testid="hero-text">
        {settings.hero_eyebrow ? <p className="eyebrow">{settings.hero_eyebrow}</p> : null}
        <h1 className="title-display max-w-xl">
          <span className="block">{line1}</span> {line2 ? <span className="block text-gold">{line2}</span> : null}
        </h1>
        {settings.hero_subtitle ? <p className="max-w-md text-base text-text/90 md:text-lg">{settings.hero_subtitle}</p> : null}
        <ScrollToBooking className="self-start">
          Agendar agora <CalendarDays aria-hidden className="size-4" />
        </ScrollToBooking>
      </div>
    </section>
  );
}
