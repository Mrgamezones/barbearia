"use client";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteService, moveService, saveService, setServiceActive, type ActionResult } from "@/app/admin/(painel)/servicos/actions";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";
import { centsToInput } from "@/lib/money";
import type { Service } from "@/lib/types";

type Props = { service?: Service; isFirst?: boolean; isLast?: boolean };

/** Sem `service`: formulário de novo serviço. Com `service`: linha editável. */
export function ServiceEditor({ service, isFirst, isLast }: Props) {
  const isNew = !service;
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => ({
    name: service?.name ?? "",
    description: service?.description ?? "",
    price: service ? centsToInput(service.price_cents) : "",
    duration: service ? String(service.duration_min) : "30",
    is_combo: service?.is_combo ?? false,
  }));
  const [fields, setFields] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<ActionResult>, onOk?: () => void) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setFields({});
        onOk?.();
      } else {
        setFields(r.fields ?? {});
        setMessage(r.error);
      }
    });
  }

  if (isNew && !editing) {
    return (
      <Button variant="outline" className="self-start" onClick={() => setEditing(true)}>
        <Plus className="size-4" aria-hidden /> Novo serviço
      </Button>
    );
  }

  if (editing) {
    return (
      <form
        aria-label={isNew ? "Novo serviço" : `Editar ${service!.name}`}
        className="flex flex-col gap-4 rounded-md border border-gold/60 bg-surface p-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(
            () => saveService({ ...form, id: service?.id }),
            () => {
              setEditing(false);
              if (isNew) setForm({ name: "", description: "", price: "", duration: "30", is_combo: false });
            },
          );
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fields.name} />
          <TextField label="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} error={fields.description} />
          <TextField label="Preço (R$)" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} error={fields.price} placeholder="45,00" />
          <TextField
            label="Duração (min)"
            type="number"
            step={5}
            min={5}
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
            error={fields.duration}
          />
        </div>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_combo} onChange={(e) => setForm({ ...form, is_combo: e.target.checked })} className="size-4 accent-[var(--color-gold)]" />
          É um combo
        </label>
        {message ? (
          <p role="alert" className="text-sm text-danger">
            {message}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
        </div>
      </form>
    );
  }

  const s = service!;
  return (
    <div data-testid="admin-service" className={cn("flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center", !s.active && "opacity-60")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="font-medium">
          {s.name} {s.is_combo ? <span className="ml-1 text-xs text-gold">combo</span> : null}
          {!s.active ? <span className="ml-2 text-xs text-muted">inativo</span> : null}
        </p>
        <p className="text-sm text-muted">
          {formatPrice(s.price_cents)} · {formatDuration(s.duration_min)}
        </p>
        {message ? (
          <p role="alert" className="mt-1 text-sm text-danger">
            {message}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Button variant="ghost" className="px-3" aria-label={`Subir ${s.name}`} disabled={pending || isFirst} onClick={() => run(() => moveService(s.id, "up"))}>
          <ArrowUp className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" className="px-3" aria-label={`Descer ${s.name}`} disabled={pending || isLast} onClick={() => run(() => moveService(s.id, "down"))}>
          <ArrowDown className="size-4" aria-hidden />
        </Button>
        <Button variant="ghost" onClick={() => setEditing(true)} disabled={pending}>
          Editar
        </Button>
        <Button variant="ghost" onClick={() => run(() => setServiceActive(s.id, !s.active))} disabled={pending}>
          {s.active ? "Desativar" : "Ativar"}
        </Button>
        <Button
          variant="ghost"
          className="px-3"
          aria-label={`Excluir ${s.name}`}
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Excluir "${s.name}"?`)) run(() => deleteService(s.id));
          }}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
