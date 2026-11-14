import type { Metadata } from "next";
import { CalendarCheck2, CalendarX2, MapPin, MessageCircle } from "lucide-react";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { CancelBookingButton } from "@/components/booking/CancelBookingButton";
import { EnableReminderButton } from "@/components/booking/EnableReminderButton";
import { getSettings } from "@/lib/data/public";
import { formatDateLong, formatDuration, formatPrice, formatTime, whatsappLink } from "@/lib/format";
import { createPublicClient } from "@/lib/supabase/public";
import type { AppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seu agendamento", robots: { index: false, follow: false } };

type Booking = {
  id: string;
  customer_name: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  total_cents: number;
  has_email: boolean;
  can_cancel: boolean;
  services: { name: string; price_cents: number; duration_min: number }[];
};

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmed: "Confirmado",
  completed: "Concluído",
  no_show: "Não compareceu",
  cancelled: "Cancelado",
};

export default async function ManageBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const [{ token: rawToken }, { novo }] = await Promise.all([params, searchParams]);
  const token = decodeURIComponent(rawToken);
  const [{ data }, settings] = await Promise.all([
    createPublicClient().rpc("get_booking_by_token", { p_token: token }),
    getSettings(),
  ]);
  const booking = data as Booking | null;

  if (!booking) {
    return (
      <section className="container-page flex flex-col items-start gap-4 py-16">
        <h1 className="font-display text-4xl font-medium">Agendamento não encontrado</h1>
        <p className="text-muted">Confira se o link está completo. Se precisar, fale com a barbearia.</p>
        <ButtonLink href="/agendar">Fazer um agendamento</ButtonLink>
      </section>
    );
  }

  const duration = booking.services.reduce((a, s) => a + s.duration_min, 0);
  const isNew = novo === "1" && booking.status === "confirmed";
  const isCancelled = booking.status === "cancelled";
  const tooLate = booking.status === "confirmed" && !booking.can_cancel;

  return (
    <section className="container-page flex max-w-2xl flex-col gap-6 py-12 md:py-16">
      <div className="flex flex-col gap-3">
        {isCancelled ? (
          <CalendarX2 className="size-10 text-muted" aria-hidden />
        ) : (
          <CalendarCheck2 className="size-10 text-gold" aria-hidden />
        )}
        <p className="eyebrow">{isNew ? "Tudo certo" : "Seu agendamento"}</p>
        <h1 className="font-display text-4xl font-medium md:text-5xl">
          {isNew ? "Agendamento confirmado!" : isCancelled ? "Agendamento cancelado" : `Olá, ${booking.customer_name.split(" ")[0]}`}
        </h1>
        {isNew ? (
          <p className="text-muted">
            Guarde este link: é por ele que você consulta ou cancela o seu horário.
            {booking.has_email ? " Também enviamos os detalhes para o seu e-mail." : ""}
          </p>
        ) : null}
      </div>

      <dl className="grid gap-4 rounded-md border border-border bg-surface p-5 text-sm sm:grid-cols-2" data-testid="booking-details">
        <div>
          <dt className="text-muted">Data</dt>
          <dd className="capitalize">{formatDateLong(booking.starts_at)}</dd>
        </div>
        <div>
          <dt className="text-muted">Horário</dt>
          <dd>
            {formatTime(booking.starts_at)} às {formatTime(booking.ends_at)} ({formatDuration(duration)})
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted">Serviços</dt>
          <dd>
            <ul>
              {booking.services.map((s) => (
                <li key={s.name} className="flex justify-between gap-3">
                  <span>{s.name}</span>
                  <span className="text-muted">{formatPrice(s.price_cents)}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Total</dt>
          <dd className="font-display text-2xl font-semibold text-gold">{formatPrice(booking.total_cents)}</dd>
        </div>
        <div>
          <dt className="text-muted">Status</dt>
          <dd data-testid="booking-status">{STATUS_LABEL[booking.status]}</dd>
        </div>
        {settings.address ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">Endereço</dt>
            <dd className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden /> {settings.address}
            </dd>
          </div>
        ) : null}
      </dl>

      {booking.status === "confirmed" && new Date(booking.starts_at).getTime() > Date.now() ? (
        <EnableReminderButton token={token} hasEmail={booking.has_email} />
      ) : null}

      {booking.can_cancel ? <CancelBookingButton token={token} /> : null}

      {tooLate ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4 text-sm" data-testid="too-late">
          <p>Faltam menos de 2 horas para o horário, por isso o cancelamento online não está disponível. Fale com a barbearia:</p>
          {settings.whatsapp ? (
            <a href={whatsappLink(settings.whatsapp, "Olá! Preciso falar sobre meu agendamento.")} className={buttonClasses("outline", "self-start")}>
              <MessageCircle className="size-4" aria-hidden /> Chamar no WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}

      {isCancelled ? <ButtonLink href="/agendar" className="self-start">Agendar novo horário</ButtonLink> : null}
    </section>
  );
}
