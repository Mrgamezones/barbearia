"use client";
import { useState, useTransition } from "react";
import { saveHours } from "@/app/admin/(painel)/horarios/actions";
import { Button } from "@/components/ui/Button";
import { WEEKDAYS } from "@/lib/hours";

type Row = { weekday: number; is_open: boolean; open_time: string; close_time: string; break_start: string; break_end: string };

const timeInput = "min-h-11 w-full rounded-sm border border-border bg-surface px-2 text-sm text-text disabled:opacity-40";

export function HoursForm({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const update = (weekday: number, patch: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveHours(rows);
          if (r.ok) {
            setErrors({});
            setSaved(true);
          } else setErrors(r.errors);
        });
      }}
    >
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="p-3 font-medium">Dia</th>
              <th className="p-3 font-medium">Abre?</th>
              <th className="p-3 font-medium">Abertura</th>
              <th className="p-3 font-medium">Fechamento</th>
              <th className="p-3 font-medium">Intervalo início</th>
              <th className="p-3 font-medium">Intervalo fim</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.weekday} className="border-t border-border" data-testid={`hours-${r.weekday}`}>
                <th scope="row" className="p-3 font-medium">{WEEKDAYS[r.weekday]}</th>
                <td className="p-3">
                  <input
                    type="checkbox"
                    aria-label={`${WEEKDAYS[r.weekday]} aberto`}
                    checked={r.is_open}
                    onChange={(e) => update(r.weekday, { is_open: e.target.checked, open_time: r.open_time || "09:00", close_time: r.close_time || "19:00" })}
                    className="size-5 accent-[var(--color-gold)]"
                  />
                </td>
                {(["open_time", "close_time", "break_start", "break_end"] as const).map((f) => (
                  <td key={f} className="p-3">
                    <input
                      type="time"
                      step={900}
                      aria-label={`${WEEKDAYS[r.weekday]} ${{ open_time: "abertura", close_time: "fechamento", break_start: "início do intervalo", break_end: "fim do intervalo" }[f]}`}
                      disabled={!r.is_open}
                      value={r[f]}
                      onChange={(e) => update(r.weekday, { [f]: e.target.value })}
                      className={timeInput}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {Object.values(errors).length ? (
        <ul role="alert" className="text-sm text-danger">
          {Object.values(errors).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}
      {saved ? (
        <p role="status" className="text-sm text-success">
          Horários salvos.
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Salvando…" : "Salvar horários"}
      </Button>
    </form>
  );
}
