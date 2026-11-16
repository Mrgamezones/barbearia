import type { Metadata } from "next";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { getActiveServices, getBusinessHours, requireShop } from "@/lib/data/public";

export const metadata: Metadata = { title: "Agendar horário" };
export const revalidate = 300;

/** Mesmo painel da página inicial, como página própria. */
export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const shop = await requireShop((await params).slug);
  const [services, hours] = await Promise.all([getActiveServices(shop), getBusinessHours(shop)]);
  return <BookingPanel services={services} shop={shop} hours={hours} headingLevel={1} className="py-8 md:py-12" />;
}
