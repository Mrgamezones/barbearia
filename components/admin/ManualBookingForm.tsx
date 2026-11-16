"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { adminCreateBooking, adminFetchSlots } from "@/app/painel/[slug]/novo/actions";
import { Button } from "@/components/ui/Button";
import { SelectableCard } from "@/components/ui/SelectableCard";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice, formatTime } from "@/lib/format";
import type { Service } from "@/lib/types";
import { usePanelSlug } from "./usePanelSlug";
import { panelPath } from "@/lib/paths";

export function ManualBookingForm({ services, today }: { services: Service[]; today: string }) {
  const slug = usePanelSlug();
  const router = useRouter();
  const [ids, setIds] = useState<string[]>([]);
  const [date, setDate] = useState(today);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "" });
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = services.filter((s) => ids.includes(s.id));
  const minutes = selected.reduce((a, s) => a + s.duration_min, 0);
  const total = selected.reduce((a, s) => a + s.price_cents, 0);

  useEffect(() => {
    setSlot(null);
    if (!minutes || !date) return setSlots(null);
    let cancelled = false;
    adminFetchSlots(slug, date, minutes).then((s) => !cancelled && setSlots(s));
    return () => {
      cancelled = true;
    };
  }, [slug, date, minutes]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!slot) return setMessage("Escolha serviço(s), data e horário.");
    start(async () => {
      const r = await adminCreateBooking(slug, { serviceIds: ids, startsAt: slot, ...customer, email: customer.email || undefined, whatsappOptIn });
      if (r.ok) {
        router.push(`${panelPath(slug)}?data=${date}`);
      } else {
        setErrors(r.fields ?? {});
        setMessage(r.message);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6" noValidate>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">Serviços</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <SelectableCard
              key={s.id}
              selected={ids.includes(s.id)}
              onToggle={() => setIds((x) => (x.includes(s.id) ? x.filter((i) => i !== s.id) : [...x, s.id]))}
              title={s.name}
              subtitle={`${formatPrice(s.price_cents)} · ${formatDuration(s.duration_min)}`}
            />
          ))}
        </div>
        {selected.length ? (
          <p className="text-sm text-muted">
            {formatDuration(minutes)} · <span className="text-gold">{formatPrice(total)}</span>
          </p>
        ) : null}
      </fieldset>

      <div className="flex flex-col gap-3">
        <TextField label="Data" type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
        {slots ? (
          slots.length ? (
            <div role="group" aria-label="Horários disponíveis" className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={s === slot}
                  onClick={() => setSlot(s)}
                  className={cn(
                    "min-h-11 rounded-sm border text-sm",
                    s === slot ? "border-gold bg-gold font-semibold text-on-gold" : "border-border bg-card hover:border-muted/60",
                  )}
                >
                  {formatTime(s)}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Sem horários livres nesta data.</p>
          )
        ) : (
          <p className="text-sm text-muted">Escolha os serviços para ver os horários.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Nome do cliente" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} error={errors.name} />
        <TextField
          label="WhatsApp"
          type="tel"
          value={customer.phone}
          onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
          error={errors.phone}
          placeholder="(11) 99999-8888"
        />
        <TextField label="E-mail (opcional)" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} error={errors.email} />
      </div>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={whatsappOptIn}
          onChange={(e) => setWhatsappOptIn(e.target.checked)}
          className="size-5 shrink-0 accent-[var(--color-gold)]"
        />
        Cliente aceitou receber mensagens no WhatsApp
      </label>

      {message ? (
        <p role="alert" className="text-sm text-danger">
          {message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Criar agendamento"}
      </Button>
    </form>
  );
}
