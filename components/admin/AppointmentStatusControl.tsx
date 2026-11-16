"use client";
import { useState, useTransition } from "react";
import { updateAppointmentStatus } from "@/app/painel/[slug]/actions";
import { STATUS_LABEL } from "@/lib/admin/agenda";
import type { AppointmentStatus } from "@/lib/types";
import { usePanelSlug } from "./usePanelSlug";

/** Seletor de status do agendamento no painel. */
export function AppointmentStatusControl({ id, status }: { id: string; status: AppointmentStatus }) {
  const slug = usePanelSlug();
  const [value, setValue] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-1 md:items-end">
      <label className="sr-only" htmlFor={`status-${id}`}>
        Status
      </label>
      <select
        id={`status-${id}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as AppointmentStatus;
          const prev = value;
          if (next === "cancelled" && !window.confirm("Cancelar este agendamento? O horário ficará livre.")) return;
          setValue(next);
          setError(null);
          start(async () => {
            const r = await updateAppointmentStatus(slug, id, next);
            if (!r.ok) {
              setValue(prev);
              setError(r.error ?? "Erro ao atualizar.");
            }
          });
        }}
        className="min-h-11 rounded-sm border border-border bg-card px-3 text-sm text-text"
      >
        {(Object.keys(STATUS_LABEL) as AppointmentStatus[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
