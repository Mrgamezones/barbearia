import "server-only";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import { SHOP_COLUMNS, type BusinessHour, type Service, type Shop } from "@/lib/types";

/** Tag de cache de uma barbearia, invalidada pelo painel dela quando serviços, horários ou dados mudam. */
export function shopTag(slug: string) {
  return `shop:${slug}`;
}

/** Barbearia identificada pela URL: só precisa de id (consultas) e slug (cache). */
export type ShopRef = Pick<Shop, "id" | "slug">;

const SHOP_NOT_FOUND = "shop_not_found";

/**
 * Barbearia ativa pelo slug, ou null se não existir.
 * "Não encontrada" não fica em cache (lança dentro do cache), para que uma barbearia recém-cadastrada apareça na hora.
 */
export const getShop = cache(async (slug: string): Promise<Shop | null> => {
  try {
    return await unstable_cache(
      async (): Promise<Shop> => {
        const { data, error } = await createPublicClient().from("shops").select(SHOP_COLUMNS).eq("slug", slug).eq("active", true).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error(SHOP_NOT_FOUND);
        return data as unknown as Shop;
      },
      ["shop", slug],
      { tags: [shopTag(slug)], revalidate: 300 },
    )();
  } catch (err) {
    if (err instanceof Error && err.message === SHOP_NOT_FOUND) return null;
    throw err;
  }
});

/** Barbearia da URL; responde 404 quando o slug não existe ou está inativo. */
export async function requireShop(slug: string): Promise<Shop> {
  const shop = await getShop(slug);
  if (!shop) notFound();
  return shop;
}

export const getActiveServices = cache((shop: ShopRef): Promise<Service[]> =>
  unstable_cache(
    async (): Promise<Service[]> => {
      const { data, error } = await createPublicClient()
        .from("services")
        .select("id,name,description,price_cents,duration_min,sort_order,active,is_combo")
        .eq("shop_id", shop.id)
        .eq("active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data;
    },
    ["active-services", shop.slug],
    { tags: [shopTag(shop.slug)], revalidate: 300 },
  )(),
);

export const getBusinessHours = cache((shop: ShopRef): Promise<BusinessHour[]> =>
  unstable_cache(
    async (): Promise<BusinessHour[]> => {
      const { data, error } = await createPublicClient()
        .from("business_hours")
        .select("weekday,is_open,open_time,close_time,break_start,break_end")
        .eq("shop_id", shop.id)
        .order("weekday");
      if (error) throw error;
      return data;
    },
    ["business-hours", shop.slug],
    { tags: [shopTag(shop.slug)], revalidate: 300 },
  )(),
);
