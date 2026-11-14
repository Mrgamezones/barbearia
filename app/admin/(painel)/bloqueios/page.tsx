import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { BlockForm } from "@/components/admin/BlockForm";
import { DeleteBlockButton } from "@/components/admin/DeleteBlockButton";
import { getAdminSession } from "@/lib/admin/auth";
import { TIMEZONE } from "@/lib/env";
import { formatDateShort, formatTime } from "@/lib/format";

export const metadata: Metadata = { title: "Bloqueios" };

export default async function BlocksPage() {
  const { supabase } = await getAdminSession();
  const { data, error } = await supabase
    .from("schedule_blocks")
    .select("id,starts_at,ends_at,reason")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at");
  if (error) throw error;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-1">Agenda</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">Bloqueios</h1>
        <p className="mt-1 text-sm text-muted">Folgas, feriados ou períodos sem atendimento. Agendamentos existentes não são cancelados automaticamente.</p>
      </div>
      <BlockForm today={formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd")} />
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">Próximos bloqueios</h2>
        {data.length === 0 ? <p className="text-sm text-muted">Nenhum bloqueio programado.</p> : null}
        <ul className="flex flex-col gap-2">
          {data.map((b) => (
            <li key={b.id} data-testid="block-item" className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-3 text-sm">
              <span>
                {formatDateShort(b.starts_at)} {formatTime(b.starts_at)} → {formatDateShort(b.ends_at)} {formatTime(b.ends_at)}
                {b.reason ? <span className="ml-2 text-muted">· {b.reason}</span> : null}
              </span>
              <DeleteBlockButton id={b.id} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
