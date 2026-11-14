import type { Metadata } from "next";
import { formatInTimeZone } from "date-fns-tz";
import { ManualBookingForm } from "@/components/admin/ManualBookingForm";
import { getAdminSession } from "@/lib/admin/auth";
import { TIMEZONE } from "@/lib/env";
import type { Service } from "@/lib/types";

export const metadata: Metadata = { title: "Novo agendamento" };

export default async function NewBookingPage() {
  const { supabase } = await getAdminSession();
  const { data } = await supabase.from("services").select("*").eq("active", true).order("sort_order");
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Agenda</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">Novo agendamento</h1>
        <p className="mt-1 text-sm text-muted">Para clientes que ligaram ou passaram na barbearia. Sem antecedência mínima nem limite por cliente.</p>
      </div>
      <ManualBookingForm services={(data ?? []) as Service[]} today={formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd")} />
    </div>
  );
}
