import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { getShop } from "@/lib/data/public";
import { shopPath } from "@/lib/paths";

export const revalidate = 300;

/** Manifesto do app instalado de cada barbearia: abre e fica restrito a /barbearia/<slug>/. */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const shop = await getShop((await params).slug);
  if (!shop) return new NextResponse(null, { status: 404 });
  const home = `${shopPath(shop.slug)}/`;
  const manifest: MetadataRoute.Manifest = {
    id: home,
    name: `${shop.name} — Agendamento`,
    short_name: shop.name.length > 12 ? "Agendar" : shop.name,
    description: "Agende seu corte de cabelo, barba e bigode em poucos toques.",
    start_url: `${home}?origem=pwa`,
    scope: home,
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    lang: "pt-BR",
    categories: ["lifestyle", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Agendar horário", url: shopPath(shop.slug, "agendar"), icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
  return NextResponse.json(manifest, { headers: { "content-type": "application/manifest+json" } });
}
