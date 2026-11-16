import type { Metadata } from "next";
import { HoursForm } from "@/components/admin/HoursForm";
import { getPanelSession } from "@/lib/admin/auth";
import type { BusinessHour } from "@/lib/types";

export const metadata: Metadata = { title: "Horário de funcionamento" };

export default async function HoursPage({ params }: { params: Promise<{ slug: string }> }) {
  const { supabase, shop } = await getPanelSession((await params).slug);
  const { data, error } = await supabase.from("business_hours").select("*").eq("shop_id", shop.id).order("weekday");
  if (error) throw error;
  const byDay = new Map((data as BusinessHour[]).map((h) => [h.weekday, h]));
  const rows = Array.from({ length: 7 }, (_, weekday) => {
    const h = byDay.get(weekday);
    return {
      weekday,
      is_open: h?.is_open ?? false,
      open_time: h?.open_time?.slice(0, 5) ?? "",
      close_time: h?.close_time?.slice(0, 5) ?? "",
      break_start: h?.break_start?.slice(0, 5) ?? "",
      break_end: h?.break_end?.slice(0, 5) ?? "",
    };
  });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Agenda</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">Horário de funcionamento</h1>
        <p className="mt-1 text-sm text-muted">Defina os dias de atendimento e um intervalo opcional (ex.: almoço).</p>
      </div>
      <HoursForm initial={rows} />
    </div>
  );
}
