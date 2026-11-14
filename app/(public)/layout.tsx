import { SiteFooter } from "@/components/site/SiteFooter";
import { IosInstallHint } from "@/components/site/IosInstallHint";
import { SiteHeader } from "@/components/site/SiteHeader";
import { getActiveServices, getBusinessHours, getSettings } from "@/lib/data/public";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [settings, hours, services] = await Promise.all([getSettings(), getBusinessHours(), getActiveServices()]);
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-gold focus:px-4 focus:py-2 focus:text-on-gold"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader name={settings.name} />
      <main id="conteudo">{children}</main>
      <SiteFooter settings={settings} hours={hours} services={services} />
      <IosInstallHint />
    </>
  );
}
