export type Service = {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  duration_min: number;
  sort_order: number;
  active: boolean;
  is_combo: boolean;
};

export type BusinessSettings = {
  name: string;
  address: string;
  whatsapp: string;
  about: string;
  timezone: string;
  hero_eyebrow: string;
  hero_title_line1: string;
  hero_title_line2: string;
  hero_subtitle: string;
  barber_name: string;
  barber_bio: string;
  barber_photo_url: string;
  instagram_url: string;
  email: string;
};

/** Colunas de business_settings lidas pelo site e pelo painel. */
export const SETTINGS_COLUMNS =
  "name,address,whatsapp,about,timezone,hero_eyebrow,hero_title_line1,hero_title_line2,hero_subtitle,barber_name,barber_bio,barber_photo_url,instagram_url,email";

export type BusinessHour = {
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
};

export type AppointmentStatus = "confirmed" | "completed" | "no_show" | "cancelled";
