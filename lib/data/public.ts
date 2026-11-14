import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { SETTINGS_COLUMNS, type BusinessHour, type BusinessSettings, type Service } from "@/lib/types";

/** Tag de cache invalidada pelo painel quando serviços/configurações mudam. */
export const PUBLIC_DATA_TAG = "public-data";

export const getActiveServices = unstable_cache(
  async (): Promise<Service[]> => {
    const { data, error } = await createPublicClient()
      .from("services")
      .select("id,name,description,price_cents,duration_min,sort_order,active,is_combo")
      .eq("active", true)
      .order("sort_order")
      .order("name");
    if (error) throw error;
    return data;
  },
  ["active-services"],
  { tags: [PUBLIC_DATA_TAG], revalidate: 300 },
);

export const getSettings = unstable_cache(
  async (): Promise<BusinessSettings> => {
    const { data, error } = await createPublicClient()
      .from("business_settings")
      .select(SETTINGS_COLUMNS)
      .eq("id", 1)
      .single();
    if (error) throw error;
    return data;
  },
  ["business-settings"],
  { tags: [PUBLIC_DATA_TAG], revalidate: 300 },
);

export const getBusinessHours = unstable_cache(
  async (): Promise<BusinessHour[]> => {
    const { data, error } = await createPublicClient().from("business_hours").select("*").order("weekday");
    if (error) throw error;
    return data;
  },
  ["business-hours"],
  { tags: [PUBLIC_DATA_TAG], revalidate: 300 },
);
