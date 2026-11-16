import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { STATUS_LABEL, type AgendaItem } from "@/lib/admin/agenda";
import { getPanelSession } from "@/lib/admin/auth";
import { formatDateShort, formatPhone, formatPrice, formatTime, whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Histórico do cliente" };

export default async function ClientHistoryPage({ params }: { params: Promise<{ slug: string; phone: string }> }) {
  const { slug, phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);
  const { supabase, shop } = await getPanelSession(slug);
  const { data, error } = await supabase
    .from("appointments")
    .select("id,customer_name,customer_phone,customer_email,starts_at,ends_at,status,total_cents,source,appointment_services(name_snapshot)")
    .eq("shop_id", shop.id)
    .eq("customer_phone", phone)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const items = data as AgendaItem[];
  const counts = {
    completed: items.filter((i) => i.status === "completed").length,
    no_show: items.filter((i) => i.status === "no_show").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Histórico do cliente</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">{items[0]?.customer_name ?? formatPhone(phone)}</h1>
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
          <a href={whatsappLink(phone)} className="inline-flex items-center gap-1.5 text-text hover:text-gold">
            <MessageCircle className="size-4 text-gold" aria-hidden /> {formatPhone(phone)}
          </a>
          <span>{counts.completed} concluído(s)</span>
          <span data-testid="no-show-count">{counts.no_show} falta(s)</span>
        </p>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-muted">
          <tr className="border-b border-border">
            <th className="py-2 font-medium">Data</th>
            <th className="py-2 font-medium">Serviços</th>
            <th className="py-2 font-medium">Total</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => (
            <tr key={a.id} className="border-b border-border/60" data-testid="history-row">
              <td className="py-2">
                {formatDateShort(a.starts_at)} {formatTime(a.starts_at)}
              </td>
              <td className="py-2">{a.appointment_services.map((s) => s.name_snapshot).join(" + ")}</td>
              <td className="py-2">{formatPrice(a.total_cents)}</td>
              <td className="py-2">{STATUS_LABEL[a.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
