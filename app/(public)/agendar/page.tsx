import type { Metadata } from "next";
import { BookingPanel } from "@/components/booking/BookingPanel";
import { getActiveServices, getBusinessHours, getSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Agendar horário" };
export const revalidate = 300;

/** Mesmo painel da página inicial, como página própria. */
export default async function BookingPage() {
  const [settings, services, hours] = await Promise.all([getSettings(), getActiveServices(), getBusinessHours()]);
  return <BookingPanel services={services} settings={settings} hours={hours} headingLevel={1} className="py-8 md:py-12" />;
}
