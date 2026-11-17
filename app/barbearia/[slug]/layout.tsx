import { SiteFooter } from "@/components/site/SiteFooter";
import { IosInstallHint } from "@/components/site/IosInstallHint";
import { SiteHeader } from "@/components/site/SiteHeader";
import type { Metadata } from "next";
import { getActiveServices, getBusinessHours, getShop, requireShop } from "@/lib/data/public";
import { shopPath } from "@/lib/paths";

/**
 * Nenhuma barbearia é gerada no build: cada uma é renderizada no primeiro acesso e fica em cache (ISR),
 * então uma barbearia nova aparece sem novo deploy e o build não depende de quantas existem.
 */
export function generateStaticParams(): { slug: string }[] {
  return [];
}

/** Título, app instalado e manifesto com o nome e o endereço da barbearia. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const shop = await getShop((await params).slug);
  if (!shop) return {};
  return {
    // absolute: o template da raiz ("%s · Agendamento online") não se aplica ao título da barbearia.
    title: { absolute: `${shop.name} — Agendamento online`, template: `%s · ${shop.name}` },
    applicationName: shop.name,
    manifest: shopPath(shop.slug, "manifest.webmanifest"),
    appleWebApp: { capable: true, title: shop.name, statusBarStyle: "black-translucent" },
  };
}

export default async function ShopLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const shop = await requireShop((await params).slug);
  const [hours, services] = await Promise.all([getBusinessHours(shop), getActiveServices(shop)]);
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-gold focus:px-4 focus:py-2 focus:text-on-gold"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader name={shop.name} slug={shop.slug} />
      <main id="conteudo">{children}</main>
      <SiteFooter shop={shop} hours={hours} services={services} />
      <IosInstallHint />
    </>
  );
}
