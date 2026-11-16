import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { ServiceList } from "@/components/site/ServiceList";
import { getActiveServices, requireShop } from "@/lib/data/public";
import { shopPath } from "@/lib/paths";

export const metadata: Metadata = { title: "Serviços" };
export const revalidate = 300;

export default async function ServicesPage({ params }: { params: Promise<{ slug: string }> }) {
  const shop = await requireShop((await params).slug);
  const services = await getActiveServices(shop);
  return (
    <section className="container-page py-12 md:py-16">
      <p className="eyebrow mb-2">Preços e duração</p>
      <h1 className="mb-8 font-display text-4xl font-medium md:text-5xl">Serviços</h1>
      <ServiceList services={services} />
      <div className="mt-10">
        <ButtonLink href={shopPath(shop.slug, "agendar")}>
          Agendar horário <CalendarDays aria-hidden className="size-4" />
        </ButtonLink>
      </div>
    </section>
  );
}
