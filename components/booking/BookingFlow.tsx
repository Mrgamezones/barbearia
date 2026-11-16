"use client";

import { addDays, endOfMonth, format, parse } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { AlertCircle, ArrowLeft, CalendarDays, FileText, Lock, Scissors, UserRound, WifiOff, type LucideIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { createBooking } from "@/app/barbearia/[slug]/agendar/actions";
import { fetchAvailableDates, fetchSlots } from "@/lib/availability";
import { bookingPath, shopPath } from "@/lib/paths";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SelectableCard } from "@/components/ui/SelectableCard";
import { Stepper } from "@/components/ui/Stepper";
import { TextField } from "@/components/ui/TextField";
import { TimeChip } from "@/components/ui/TimeChip";
import { BOOKING_ERROR_MESSAGES, type BookingErrorCode } from "@/lib/booking-errors";
import { cn } from "@/lib/cn";
import { formatDateLong, formatDuration, formatPrice, formatTime } from "@/lib/format";
import type { Service } from "@/lib/types";
import { checkCustomer } from "@/lib/customer";
import { Calendar } from "./Calendar";
import { useOnline } from "./useOnline";

const TZ = "America/Sao_Paulo";
const STEPS = [
  { title: "Serviço", description: "Escolha o serviço" },
  { title: "Data e hora", description: "Selecione data e horário" },
  { title: "Seus dados", description: "Nome e WhatsApp" },
  { title: "Confirmar", description: "Revise e confirme" },
];
const DESKTOP_QUERY = "(min-width: 1024px)";

type Step = 1 | 2 | 3 | 4;
export type Barber = { name: string; bio: string; photoUrl: string | null };

/** true em telas ≥ 1024 px (quatro colunas lado a lado). No servidor, assume celular. */
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/** Etapa "ativa" derivada do preenchimento: sem serviço → 1; sem horário → 2; dados incompletos → 3; pronto → 4. */
export function deriveStep(hasServices: boolean, hasSlot: boolean, customerValid: boolean): Step {
  return !hasServices ? 1 : !hasSlot ? 2 : !customerValid ? 3 : 4;
}

type ColumnProps = {
  n: Step;
  current: Step;
  icon: LucideIcon;
  title: string;
  headingLevel: 2 | 3;
  onBack?: () => void;
  className?: string;
  id?: string;
  children: ReactNode;
};

/** Coluna do painel: no desktop todas aparecem; no celular só a etapa atual. */
function Column({ n, current, icon: Icon, title, headingLevel, onBack, className, id, children }: ColumnProps) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <section
      id={id}
      aria-labelledby={`etapa-${n}-titulo`}
      data-step={n}
      className={cn("min-w-0 scroll-mt-24 flex-col gap-4 lg:flex lg:p-5", n === current ? "flex" : "hidden", className)}
    >
      <div className="flex min-h-11 items-center gap-2">
        {onBack && n > 1 ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 flex size-11 items-center justify-center rounded-sm text-muted hover:bg-card hover:text-text lg:hidden"
            aria-label="Voltar para a etapa anterior"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
        ) : null}
        <Icon aria-hidden className="size-5 shrink-0 text-gold" strokeWidth={1.5} />
        <H id={`etapa-${n}-titulo`} tabIndex={-1} className="text-base font-semibold text-text outline-none focus-visible:underline focus-visible:decoration-gold">
          {title}
        </H>
      </div>
      {children}
    </section>
  );
}

export function BookingFlow({
  shopSlug,
  services,
  barber = null,
  headingLevel = 2,
}: {
  shopSlug: string;
  services: Service[];
  barber?: Barber | null;
  headingLevel?: 2 | 3;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const online = useOnline();
  const isDesktop = useIsDesktop();

  // Estado do fluxo: lido da URL na entrada (link compartilhável) e espelhado nela a cada mudança.
  // Fica em memória para que a interface reaja na hora, sem esperar a atualização assíncrona da URL.
  const [flow, setFlow] = useState(() => ({
    servicos: params.get("servicos"),
    data: params.get("data"),
    hora: params.get("hora"),
    etapa: params.get("etapa"),
  }));
  const serviceIds = useMemo(
    () => (flow.servicos ?? "").split(",").filter((id) => services.some((s) => s.id === id)),
    [flow.servicos, services],
  );
  const date = flow.data;
  const slot = flow.hora;
  const rawStep = Number(flow.etapa ?? 1);

  // Dados pessoais ficam só na memória (não vão para a URL).
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [customerErrors, setCustomerErrors] = useState<Record<string, string>>({});
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const selected = services.filter((s) => serviceIds.includes(s.id));
  const totalMinutes = selected.reduce((a, s) => a + s.duration_min, 0);
  const totalCents = selected.reduce((a, s) => a + s.price_cents, 0);
  const customerValid = Object.keys(checkCustomer(customer)).length === 0;

  // Não deixa pular etapas pela URL.
  const maxStep = deriveStep(selected.length > 0, !!date && !!slot, customerValid);
  const step = Math.min(Math.max(rawStep, 1), maxStep) as Step;
  // No desktop as colunas ficam todas visíveis e o stepper acompanha o preenchimento.
  const activeStep = isDesktop ? maxStep : step;

  const setParams = useCallback((changes: Partial<Record<keyof typeof flow, string | null>>) => {
    setFlow((prev) => {
      const next = { ...prev, ...changes };
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
      // replaceState integra com useSearchParams no App Router e não recarrega dados do servidor.
      window.history.replaceState(null, "", `?${qs.toString()}${window.location.hash}`);
      return next;
    });
  }, []);

  // Celular: foco no título da etapa ao trocar de etapa.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!window.matchMedia(DESKTOP_QUERY).matches) document.getElementById(`etapa-${step}-titulo`)?.focus();
  }, [step]);

  function toggleService(id: string) {
    const next = serviceIds.includes(id) ? serviceIds.filter((x) => x !== id) : [...serviceIds, id];
    setServiceError(null);
    // A duração mudou: data/horário escolhidos podem não caber mais.
    setParams({ servicos: next.join(","), data: null, hora: null });
  }

  function goTo(s: Step) {
    setAlert(null);
    setParams({ etapa: String(s) });
  }

  function continueFromServices() {
    if (!selected.length) {
      setServiceError("Escolha ao menos um serviço para continuar.");
      return;
    }
    goTo(2);
  }

  function validateCustomer(): boolean {
    const errors = checkCustomer(customer);
    setCustomerErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function continueFromCustomer() {
    if (validateCustomer()) goTo(4);
  }

  // --- Data e horário ------------------------------------------------------
  const today = formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
  const maxDate = format(addDays(parse(today, "yyyy-MM-dd", new Date()), 30), "yyyy-MM-dd");
  const [month, setMonth] = useState(() => (date ?? today).slice(0, 8) + "01");
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [datesLoading, setDatesLoading] = useState(false);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [reload, setReload] = useState(0);

  // Datas e horários dependem só da duração total: carregam assim que há serviço escolhido
  // (no desktop o calendário fica sempre visível ao lado dos serviços).
  useEffect(() => {
    if (!totalMinutes || !online) return setAvailableDates(new Set());
    const from = month < today ? today : month;
    const monthEnd = format(endOfMonth(parse(month, "yyyy-MM-dd", new Date())), "yyyy-MM-dd");
    const to = monthEnd > maxDate ? maxDate : monthEnd;
    if (from > to) return setAvailableDates(new Set());
    const ctrl = new AbortController();
    setDatesLoading(true);
    fetchAvailableDates(shopSlug, from, to, totalMinutes, ctrl.signal)
      .then((d) => !ctrl.signal.aborted && setAvailableDates(new Set(d)))
      .catch(() => !ctrl.signal.aborted && setAlert(BOOKING_ERROR_MESSAGES.network))
      .finally(() => !ctrl.signal.aborted && setDatesLoading(false));
    return () => ctrl.abort();
  }, [shopSlug, month, totalMinutes, today, maxDate, online, reload]);

  useEffect(() => {
    if (!date || !totalMinutes || !online) return setSlots(null);
    const ctrl = new AbortController();
    setSlotsLoading(true);
    fetchSlots(shopSlug, date, totalMinutes, ctrl.signal)
      .then((s) => !ctrl.signal.aborted && setSlots(s))
      .catch(() => !ctrl.signal.aborted && setAlert(BOOKING_ERROR_MESSAGES.network))
      .finally(() => !ctrl.signal.aborted && setSlotsLoading(false));
    return () => ctrl.abort();
  }, [shopSlug, date, totalMinutes, online, reload]);

  // --- Confirmação ---------------------------------------------------------
  function confirm() {
    if (!selected.length) {
      setServiceError("Escolha ao menos um serviço para continuar.");
      return;
    }
    if (!slot) {
      setAlert("Escolha a data e o horário para continuar.");
      return;
    }
    if (!validateCustomer()) {
      if (!isDesktop) goTo(3);
      return;
    }
    setAlert(null);
    startSubmit(async () => {
      let result;
      try {
        result = await createBooking(shopSlug, {
          serviceIds,
          startsAt: slot,
          name: customer.name,
          phone: customer.phone,
          email: customer.email || undefined,
          whatsappOptIn,
        });
      } catch {
        setAlert(BOOKING_ERROR_MESSAGES.network);
        return;
      }
      if (result.ok) {
        router.push(`${bookingPath(shopSlug, result.token)}?novo=1`);
        return;
      }
      const code: BookingErrorCode = result.error;
      if (code === "slot_taken" || code === "slot_unavailable") {
        // Volta para a escolha de horário com a lista atualizada.
        setParams({ hora: null, etapa: "2" });
        setReload((n) => n + 1);
      } else if (code === "invalid_data" && result.fields) {
        setCustomerErrors(result.fields);
        setParams({ etapa: "3" });
      } else if (code === "invalid_services") {
        setParams({ etapa: "1" });
      }
      setAlert(BOOKING_ERROR_MESSAGES[code]);
    });
  }

  const back = () => goTo((step - 1) as Step);
  const servicesLabel = `${selected.length} ${selected.length === 1 ? "serviço" : "serviços"}`;

  // --- Render ----------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={STEPS} current={activeStep} />

      {alert ? (
        <p role="alert" className="flex items-start gap-2 rounded-sm border border-danger/50 bg-danger/10 p-3 text-sm text-text">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden /> {alert}
        </p>
      ) : null}

      <div
        className="grid lg:grid-cols-3 lg:rounded-md lg:border lg:border-border lg:bg-bg/40 wide:grid-cols-[minmax(0,1.1fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]"
        data-testid="booking-columns"
      >
        {/* 1. Serviço */}
        <Column n={1} current={step} icon={Scissors} title="Escolha o serviço" headingLevel={headingLevel} id="servicos">
          <div role="group" aria-label="Serviços" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {services.map((s) => (
              <SelectableCard
                key={s.id}
                selected={serviceIds.includes(s.id)}
                onToggle={() => toggleService(s.id)}
                title={s.name}
                subtitle={`${formatPrice(s.price_cents)} · ${formatDuration(s.duration_min)}`}
              />
            ))}
          </div>
          {serviceError ? (
            <p role="alert" className="text-sm text-danger">
              {serviceError}
            </p>
          ) : null}
          <p className="text-xs text-muted">Escolha um ou mais serviços. A duração total define os horários livres.</p>
          <Button onClick={continueFromServices} className="self-start lg:hidden">
            Continuar
          </Button>
        </Column>

        {/* 2. Data e hora */}
        <Column n={2} current={step} icon={CalendarDays} title="Escolha a data e o horário" headingLevel={headingLevel} onBack={back} className="lg:border-l lg:border-border">
          {!online ? (
            <p role="status" className="flex items-start gap-3 rounded-sm border border-border bg-card p-4 text-sm">
              <WifiOff className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
              Você está sem conexão. É preciso estar conectado para ver os horários livres.
            </p>
          ) : !selected.length ? (
            <p className="rounded-sm border border-dashed border-border p-4 text-sm text-muted">Escolha um serviço para ver os dias e horários livres.</p>
          ) : (
            <>
              <div className="rounded-sm border border-border bg-card p-2">
                <Calendar
                  month={month}
                  onMonthChange={setMonth}
                  minDate={today}
                  maxDate={maxDate}
                  available={availableDates}
                  selected={date}
                  loading={datesLoading}
                  onSelect={(d) => setParams({ data: d, hora: null })}
                />
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-sm font-medium">{date ? `Horários em ${formatDateLong(date + "T12:00:00-03:00")}` : "Escolha uma data"}</p>
                {slotsLoading ? <p className="text-sm text-muted">Carregando horários…</p> : null}
                {date && !slotsLoading && slots?.length === 0 ? <p className="text-sm text-muted">Não há horários livres nesta data. Escolha outra.</p> : null}
                {date && !slotsLoading && slots?.length ? (
                  <div role="group" aria-label="Horários disponíveis" className="grid grid-cols-3 gap-2">
                    {slots.map((s) => (
                      <TimeChip key={s} selected={s === slot} onClick={() => setParams({ hora: s })}>
                        {formatTime(s)}
                      </TimeChip>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          )}
          <Button onClick={() => goTo(3)} disabled={!slot} className="self-start lg:hidden">
            Continuar
          </Button>
        </Column>

        {/* 3. Seus dados */}
        <Column n={3} current={step} icon={UserRound} title="Seus dados" headingLevel={headingLevel} onBack={back} className="lg:border-l lg:border-border">
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              continueFromCustomer();
            }}
          >
            <TextField label="Nome" autoComplete="name" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} error={customerErrors.name} />
            <TextField
              label="WhatsApp"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 99999-8888"
              value={customer.phone}
              onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              error={customerErrors.phone}
            />
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="size-5 shrink-0 accent-[var(--color-gold)]"
              />
              Receber confirmação e lembretes pelo WhatsApp
            </label>
            <TextField
              label="E-mail (opcional)"
              type="email"
              autoComplete="email"
              hint="Para receber a confirmação e lembretes."
              value={customer.email}
              onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              error={customerErrors.email}
            />
            <p className="text-xs text-muted">
              Usamos seus dados apenas para este agendamento. Veja a{" "}
              <a href={shopPath(shopSlug, "privacidade")} className="text-gold underline underline-offset-2">
                política de privacidade
              </a>
              .
            </p>
            <Button type="submit" className="self-start lg:hidden">
              Continuar
            </Button>
          </form>
          {barber ? (
            <div className="mt-auto flex flex-col gap-3 rounded-sm border border-border bg-card p-4" data-testid="barber-card">
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-muted">Seu barbeiro</p>
              <div className="flex items-center gap-3">
                <Avatar name={barber.name} src={barber.photoUrl} size={48} />
                <p className="min-w-0 font-semibold text-text">{barber.name}</p>
              </div>
              {barber.bio ? <p className="text-sm text-muted">{barber.bio}</p> : null}
            </div>
          ) : null}
        </Column>

        {/* 4. Resumo e confirmação */}
        <Column
          n={4}
          current={step}
          icon={FileText}
          title="Resumo do agendamento"
          headingLevel={headingLevel}
          onBack={back}
          className="lg:col-span-3 lg:border-t lg:border-border wide:col-span-1 wide:border-t-0 wide:border-l"
        >
          <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4 lg:h-full">
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex flex-col gap-1">
                <dt className="text-xs text-muted">{selected.length > 1 ? "Serviços" : "Serviço"}</dt>
                {selected.length ? (
                  selected.map((s) => (
                    <dd key={s.id} className="flex justify-between gap-3">
                      <span>{s.name}</span>
                      <span className="text-muted">{formatPrice(s.price_cents)}</span>
                    </dd>
                  ))
                ) : (
                  <dd className="text-muted">Nenhum serviço escolhido</dd>
                )}
              </div>
              {barber ? (
                <div>
                  <dt className="text-xs text-muted">Barbeiro</dt>
                  <dd>{barber.name}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-muted">Data</dt>
                <dd className="first-letter:uppercase">{slot ? formatDateLong(slot) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Horário</dt>
                <dd>{slot ? formatTime(slot) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Duração</dt>
                <dd data-testid="summary-duration">{formatDuration(totalMinutes || 0)}</dd>
              </div>
              {customerValid ? (
                <div>
                  <dt className="text-xs text-muted">Cliente</dt>
                  <dd>
                    {customer.name} · {customer.phone}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="mt-auto flex items-baseline justify-between border-t border-border pt-4" data-testid="booking-summary">
              <span className="text-sm font-semibold">Total</span>
              <span className="font-display text-3xl font-semibold text-gold" data-testid="summary-total">
                {formatPrice(totalCents)}
              </span>
            </div>
            <Button onClick={confirm} disabled={submitting || !online || !selected.length || !slot} className="w-full">
              {submitting ? "Confirmando…" : "Confirmar agendamento"}
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted">
              <Lock className="size-3.5 shrink-0" aria-hidden /> Seus dados ficam protegidos e não são compartilhados.
            </p>
          </div>
        </Column>
      </div>

      {/* Celular: resumo fixo no rodapé da tela, acompanhando a seleção. */}
      {step < 4 ? (
        <div
          className="sticky bottom-0 z-30 -mx-4 -mb-4 flex items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:-mx-8 md:-mb-8 md:px-8 lg:hidden"
          data-testid="summary-bar"
          aria-label="Resumo da seleção"
          role="region"
        >
          <p className="text-sm text-muted">
            <span data-testid="bar-count">{servicesLabel}</span> · <span data-testid="bar-duration">{formatDuration(totalMinutes || 0)}</span>
          </p>
          <p className="font-display text-2xl font-semibold text-gold" data-testid="bar-total">
            {formatPrice(totalCents)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
