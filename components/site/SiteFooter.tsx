import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { PhotoSocialIcon } from "@/components/ui/icons";
import { formatPhone, whatsappLink } from "@/lib/format";
import { hoursByDay } from "@/lib/hours";
import type { BusinessHour, BusinessSettings, Service } from "@/lib/types";
import { Brand } from "./Brand";
import { NAV_ITEMS } from "./nav";

const MAX_SERVICES = 5;

function ColumnTitle({ children }: { children: string }) {
  return <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.15em] text-text">{children}</h2>;
}

const linkClass = "inline-flex min-h-11 items-center gap-2 text-muted transition-colors hover:text-text lg:min-h-9";

/** Rodapé em colunas: marca e redes, navegação, serviços, contato e horário por dia. */
export function SiteFooter({ settings, hours, services }: { settings: BusinessSettings; hours: BusinessHour[]; services: Service[] }) {
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`;
  return (
    <footer id="contato" className="scroll-mt-24 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.1fr_1.4fr_1.3fr] lg:gap-8">
        <div className="flex flex-col gap-4">
          <Brand name={settings.name} />
          {settings.about ? <p className="max-w-xs text-muted">{settings.about}</p> : null}
          <div className="flex gap-2">
            {settings.instagram_url ? (
              <a href={settings.instagram_url} className="flex size-11 items-center justify-center rounded-full border border-border text-text hover:border-gold hover:text-gold" aria-label="Instagram" rel="noopener" target="_blank">
                <PhotoSocialIcon aria-hidden className="size-5" />
              </a>
            ) : null}
            {settings.whatsapp ? (
              <a href={whatsappLink(settings.whatsapp)} className="flex size-11 items-center justify-center rounded-full border border-border text-text hover:border-gold hover:text-gold" aria-label="Conversar pelo WhatsApp">
                <MessageCircle aria-hidden className="size-5" strokeWidth={1.5} />
              </a>
            ) : null}
          </div>
        </div>

        <nav aria-label="Rodapé">
          <ColumnTitle>Navegação</ColumnTitle>
          <ul className="flex flex-col">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <ColumnTitle>Serviços</ColumnTitle>
          <ul className="flex flex-col" data-testid="footer-services">
            {services.slice(0, MAX_SERVICES).map((s) => (
              <li key={s.id}>
                <Link href={`/agendar?servicos=${s.id}`} className={linkClass}>
                  {s.name}
                </Link>
              </li>
            ))}
            {services.length > MAX_SERVICES ? (
              <li>
                <Link href="/servicos" className={linkClass}>
                  Outros serviços
                </Link>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <ColumnTitle>Contato</ColumnTitle>
          <ul className="flex flex-col">
            {settings.whatsapp ? (
              <li>
                <a href={whatsappLink(settings.whatsapp)} className={linkClass}>
                  <Phone aria-hidden className="size-4 shrink-0 text-gold" strokeWidth={1.5} /> {formatPhone(settings.whatsapp)}
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <a href={`mailto:${settings.email}`} className={`${linkClass} break-all`}>
                  <Mail aria-hidden className="size-4 shrink-0 text-gold" strokeWidth={1.5} /> {settings.email}
                </a>
              </li>
            ) : null}
            {settings.address ? (
              <li>
                <a href={mapUrl} className={`${linkClass} items-start py-2`} target="_blank" rel="noopener" aria-label={`${settings.address} (abrir no mapa)`}>
                  <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-gold" strokeWidth={1.5} /> {settings.address}
                </a>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <ColumnTitle>Horário de funcionamento</ColumnTitle>
          <ul className="flex flex-col gap-1.5 text-muted" data-testid="footer-hours">
            {hoursByDay(hours).map((d) => (
              <li key={d.weekday}>
                <span className="text-text">{d.label}</span> — {d.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-1 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {settings.name}. Todos os direitos reservados.
          </span>
          <Link href="/privacidade" className="inline-flex min-h-11 items-center hover:text-text">
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
