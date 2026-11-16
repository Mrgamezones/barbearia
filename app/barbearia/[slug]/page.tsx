import { BookingPanel } from "@/components/booking/BookingPanel";
import { Features } from "@/components/home/Features";
import { Gallery } from "@/components/home/Gallery";
import { Hero } from "@/components/home/Hero";
import { getActiveServices, getBusinessHours, requireShop } from "@/lib/data/public";

export const revalidate = 300;

/** Página inicial: hero, painel de agendamento sobreposto, diferenciais e galeria (cabeçalho e rodapé vêm do layout). */
export default async function HomePage({ params }: { params: Promise<{ slug: string }> }) {
  const shop = await requireShop((await params).slug);
  const [services, hours] = await Promise.all([getActiveServices(shop), getBusinessHours(shop)]);
  return (
    <>
      <Hero shop={shop} />
      <BookingPanel services={services} shop={shop} hours={hours} className="relative z-10 -mt-12 lg:-mt-24" />
      <Features />
      <Gallery />
    </>
  );
}
