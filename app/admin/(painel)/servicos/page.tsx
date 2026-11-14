import type { Metadata } from "next";
import { ServiceEditor } from "@/components/admin/ServiceEditor";
import { getAdminSession } from "@/lib/admin/auth";
import type { Service } from "@/lib/types";

export const metadata: Metadata = { title: "Serviços" };

export default async function AdminServicesPage() {
  const { supabase } = await getAdminSession();
  const { data, error } = await supabase.from("services").select("*").order("sort_order").order("name");
  if (error) throw error;
  const services = data as Service[];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Catálogo</p>
        <h1 className="font-display text-3xl font-medium md:text-4xl">Serviços</h1>
        <p className="mt-1 text-sm text-muted">
          Mudanças de preço valem só para novos agendamentos. Serviços com agendamentos não podem ser excluídos — desative-os.
        </p>
      </div>
      <ServiceEditor />
      <ul className="flex flex-col gap-3">
        {services.map((s, i) => (
          <li key={s.id}>
            <ServiceEditor service={s} isFirst={i === 0} isLast={i === services.length - 1} />
          </li>
        ))}
      </ul>
    </div>
  );
}
