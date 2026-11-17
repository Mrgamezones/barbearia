import type { Metadata } from "next";
import { AlertSoundPicker } from "@/components/admin/AlertSoundPicker";
import { AlertsCard } from "@/components/admin/AlertsCard";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getPanelSession } from "@/lib/admin/auth";
import { formatPhone } from "@/lib/format";

export const metadata: Metadata = { title: "Configurações" };

export default async function SettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { shop: s } = await getPanelSession((await params).slug);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <p className="eyebrow mb-1">Barbearia</p>
        <h1 className="title-section">Configurações</h1>
        <p className="mt-1 text-sm text-muted">Avisos deste aparelho e dados exibidos no site e nas mensagens aos clientes.</p>
      </div>
      <AlertsCard slug={s.slug} />
      <AlertSoundPicker />
      <SettingsForm
        initial={{
          name: s.name,
          street: s.street,
          number: s.number,
          complement: s.complement,
          district: s.district,
          city: s.city,
          state: s.state,
          postal_code: s.postal_code ? `${s.postal_code.slice(0, 5)}-${s.postal_code.slice(5)}` : "",
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
