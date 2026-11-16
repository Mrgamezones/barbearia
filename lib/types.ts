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

/** Barbearia (tabela `shops`): dados públicos lidos pelo site e editados pelo dono no painel. */
export type Shop = {
  id: string;
  slug: string;
  is_demo: boolean;
  notifications_enabled: boolean;
  name: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  postal_code: string;
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

/** Partes do endereço estruturado (formatado por `formatAddress`). */
export type ShopAddress = Pick<Shop, "street" | "number" | "complement" | "district" | "city" | "state" | "postal_code">;

/** Colunas de `shops` lidas pelo site e pelo painel. */
export const SHOP_COLUMNS =
  "id,slug,is_demo,notifications_enabled,name,street,number,complement,district,city,state,postal_code,whatsapp,about,timezone," +
  "hero_eyebrow,hero_title_line1,hero_title_line2,hero_subtitle,barber_name,barber_bio,barber_photo_url,instagram_url,email";

export type BusinessHour = {
  weekday: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  break_start: string | null;
  break_end: string | null;
};

export type AppointmentStatus = "confirmed" | "completed" | "no_show" | "cancelled";
