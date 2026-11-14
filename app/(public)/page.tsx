import { BookingPanel } from "@/components/booking/BookingPanel";
import { Features } from "@/components/home/Features";
import { Gallery } from "@/components/home/Gallery";
import { Hero } from "@/components/home/Hero";
import { getActiveServices, getBusinessHours, getSettings } from "@/lib/data/public";

export const revalidate = 300;

/** Página inicial: hero, painel de agendamento sobreposto, diferenciais e galeria (cabeçalho e rodapé vêm do layout). */
export default async function HomePage() {
  const [settings, services, hours] = await Promise.all([getSettings(), getActiveServices(), getBusinessHours()]);
  return (
    <>
      <Hero settings={settings} />
      <BookingPanel services={services} settings={settings} hours={hours} className="relative z-10 -mt-12 lg:-mt-24" />
      <Features />
      <Gallery />
    </>
  );
}
