import type { Metadata } from "next";
import { addDays, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, MessageCircle, Plus } from "lucide-react";
import Link from "next/link";
import { AppointmentStatusControl } from "@/components/admin/AppointmentStatusControl";
import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { agendaRange, expectedTotal, STATUS_LABEL, type AgendaItem, type AgendaView } from "@/lib/admin/agenda";
import { getPanelSession } from "@/lib/admin/auth";
import { panelPath } from "@/lib/paths";
import { TIMEZONE } from "@/lib/env";
import { cn } from "@/lib/cn";
import { formatPhone, formatPrice, formatTime, toLocalDateKey, whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Agenda" };

export default async function AgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ data?: string; visao?: string }>;
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const today = formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd");
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(sp.data ?? "") ? sp.data! : today;
  const view: AgendaView = sp.visao === "semana" ? "semana" : "dia";
  const range = agendaRange(dateKey, view);

  const { supabase, shop } = await getPanelSession(slug);
  const { data, error } = await supabase
    .from("appointments")
    .select("id,customer_name,customer_phone,customer_email,starts_at,ends_at,status,total_cents,source,appointment_services(name_snapshot)")
    .eq("shop_id", shop.id)
    .gte("starts_at", range.from)
    .lt("starts_at", range.to)
    .order("starts_at");
  if (error) throw error;
  const items = data as AgendaItem[];

  const step = view === "semana" ? 7 : 1;
  const shift = (n: number) => format(addDays(parse(dateKey, "yyyy-MM-dd", new Date()), n), "yyyy-MM-dd");
  const href = (d: string, v: AgendaView = view) => `${panelPath(slug)}?data=${d}${v === "semana" ? "&visao=semana" : ""}`;
  const title =
    view === "dia"
      ? format(parse(dateKey, "yyyy-MM-dd", new Date()), "EEEE, d 'de' MMMM", { locale: ptBR })
      : `Semana de ${format(parse(range.startKey, "yyyy-MM-dd", new Date()), "d/MM")} a ${format(addDays(parse(range.endKey, "yyyy-MM-dd", new Date()), -1), "d/MM")}`;

  // Agrupa por dia (visão semanal).
  const groups = new Map<string, AgendaItem[]>();
  for (const i of items) {
    const k = toLocalDateKey(i.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-1">Agenda</p>
          <h1 className="font-display text-3xl font-medium capitalize md:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted" data-testid="agenda-total">
            {items.filter((i) => i.status !== "cancelled").length} agendamento(s) · Total previsto{" "}
            <span className="font-semibold text-gold">{formatPrice(expectedTotal(items))}</span>
          </p>
        </div>
        <ButtonLink href={panelPath(slug, "novo")}>
          <Plus className="size-4" aria-hidden /> Novo agendamento
        </ButtonLink>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={href(shift(-step))} className={buttonClasses("ghost", "px-3")} aria-label={view === "dia" ? "Dia anterior" : "Semana anterior"}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <Link href={href(today)} className={buttonClasses("ghost")}>Hoje</Link>
        <Link href={href(shift(step))} className={buttonClasses("ghost", "px-3")} aria-label={view === "dia" ? "Próximo dia" : "Próxima semana"}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
        <div className="ml-auto flex rounded-sm border border-border p-1" role="group" aria-label="Visão">
          {(["dia", "semana"] as const).map((v) => (
            <Link
              key={v}
              href={href(dateKey, v)}
              aria-current={v === view ? "page" : undefined}
              className={cn("flex min-h-9 items-center rounded-sm px-3 text-sm capitalize", v === view ? "bg-card text-text" : "text-muted hover:text-text")}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-border bg-surface p-6 text-muted">Nenhum agendamento neste período.</p>
      ) : (
        [...groups].map(([day, list]) => (
          <section key={day} className="flex flex-col gap-3" aria-label={day}>
            {view === "semana" ? (
              <h2 className="text-sm font-semibold capitalize text-muted">
                {format(parse(day, "yyyy-MM-dd", new Date()), "EEEE, d/MM", { locale: ptBR })}
              </h2>
            ) : null}
            <ul className="flex flex-col gap-3">
              {list.map((a) => (
                <li
                  key={a.id}
                  data-testid="agenda-item"
                  className={cn("grid gap-3 rounded-md border border-border bg-surface p-4 md:grid-cols-[90px_1fr_auto]", a.status === "cancelled" && "opacity-60")}
                >
                  <div className="font-display text-2xl font-semibold text-gold">{formatTime(a.starts_at)}</div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="font-medium">
                      <Link href={panelPath(slug, `clientes/${encodeURIComponent(a.customer_phone)}`)} className="hover:text-gold">
                        {a.customer_name}
                      </Link>
                      <span className="ml-2 text-xs text-muted">{STATUS_LABEL[a.status]}</span>
                    </p>
                    <p className="text-sm text-muted">{a.appointment_services.map((s) => s.name_snapshot).join(" + ")}</p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <a href={whatsappLink(a.customer_phone)} className="inline-flex min-h-11 items-center gap-1.5 text-text hover:text-gold" target="_blank" rel="noreferrer">
                        <MessageCircle className="size-4 text-gold" aria-hidden /> {formatPhone(a.customer_phone)}
                      </a>
                      <span className="text-muted">
                        até {formatTime(a.ends_at)} · {formatPrice(a.total_cents)}
                      </span>
                    </p>
                  </div>
                  <AppointmentStatusControl id={a.id} status={a.status} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
