import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceList } from "@/components/site/ServiceList";
import { getActiveServices } from "@/lib/data/public";

export const metadata: Metadata = { title: "Serviços" };
export const revalidate = 300;

export default async function ServicesPage() {
  const services = await getActiveServices();
  return (
    <section className="container-page py-12 md:py-16">
      <p className="eyebrow mb-2">Preços e duração</p>
      <h1 className="mb-8 font-display text-4xl font-medium md:text-5xl">Serviços</h1>
      <ServiceList services={services} />
      <div className="mt-10">
        <ButtonLink href="/agendar">
          Agendar horário <CalendarDays aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    </section>
  );
}
