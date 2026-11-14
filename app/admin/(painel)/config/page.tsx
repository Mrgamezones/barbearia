import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getAdminSession } from "@/lib/admin/auth";
import { formatPhone } from "@/lib/format";
import { SETTINGS_COLUMNS, type BusinessSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage() {
  const { supabase } = await getAdminSession();
  const { data, error } = await supabase.from("business_settings").select(SETTINGS_COLUMNS).eq("id", 1).single();
  if (error) throw error;
  const s = data as BusinessSettings;
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Barbearia</p>
        <h1 className="title-section">Configurações</h1>
        <p className="mt-1 text-sm text-muted">Dados exibidos no site e nas mensagens aos clientes.</p>
      </div>
      <SettingsForm
        initial={{
          name: s.name,
          address: s.address,
          whatsapp: s.whatsapp ? formatPhone(s.whatsapp) : "",
          email: s.email,
          instagram_url: s.instagram_url,
          about: s.about,
          hero_eyebrow: s.hero_eyebrow,
          hero_title_line1: s.hero_title_line1,
          hero_title_line2: s.hero_title_line2,
          hero_subtitle: s.hero_subtitle,
          barber_name: s.barber_name,
          barber_bio: s.barber_bio,
          barber_photo_url: s.barber_photo_url,
        }}
      />
    </div>
  );
}
