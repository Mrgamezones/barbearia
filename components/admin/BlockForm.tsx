"use client";
import { useState, useTransition } from "react";
import { createBlock, type AffectedAppointment } from "@/app/painel/[slug]/bloqueios/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { formatDateShort, formatTime } from "@/lib/format";
import { usePanelSlug } from "./usePanelSlug";

export function BlockForm({ today }: { today: string }) {
  const slug = usePanelSlug();
  const [form, setForm] = useState({ date: today, endDate: "", fullDay: true, startTime: "13:00", endTime: "19:00", reason: "" });
  const [affected, setAffected] = useState<AffectedAppointment[] | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(confirmed: boolean) {
    setMessage(null);
    start(async () => {
      const r = await createBlock(slug, form, confirmed);
      if (r.ok) {
        setAffected(null);
        setMessage({ type: "ok", text: "Bloqueio salvo." });
      } else if ("needsConfirmation" in r) {
        setAffected(r.affected);
      } else {
        setMessage({ type: "error", text: r.error });
      }
    });
  }

  return (
    <form
      aria-label="Novo bloqueio"
      className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Data" type="date" min={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        {form.fullDay ? (
          <TextField
            label="Até (opcional)"
            type="date"
            min={form.date}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            hint="Para bloquear vários dias seguidos."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Início" type="time" step={900} value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            <TextField label="Fim" type="time" step={900} value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
        )}
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" checked={form.fullDay} onChange={(e) => setForm({ ...form, fullDay: e.target.checked })} className="size-4 accent-[var(--color-gold)]" />
        Dia inteiro
      </label>
      <TextField label="Motivo (opcional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex.: feriado" />

      {affected ? (
        <div role="alertdialog" aria-label="Agendamentos no período" className="flex flex-col gap-3 rounded-sm border border-gold/60 bg-card p-4 text-sm">
          <p>
            Existem <strong>{affected.length}</strong> agendamento(s) neste período. Eles continuarão confirmados — avise os clientes se necessário.
          </p>
          <ul className="list-inside list-disc text-muted" data-testid="affected-list">
            {affected.map((a) => (
              <li key={a.id}>
                {formatDateShort(a.starts_at)} {formatTime(a.starts_at)} — {a.customer_name}
              </li>
            ))}
          </ul>
          <div className="flex gap-3">
            <Button onClick={() => submit(true)} disabled={pending}>
              Confirmar bloqueio
            </Button>
            <Button variant="ghost" onClick={() => setAffected(null)}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Salvando…" : "Bloquear"}
        </Button>
      )}

      {message ? (
        <p role={message.type === "error" ? "alert" : "status"} className={message.type === "error" ? "text-sm text-danger" : "text-sm text-success"}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
