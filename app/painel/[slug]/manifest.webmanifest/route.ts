import type { MetadataRoute } from "next";
import { NextResponse } from "next/server";
import { getShop } from "@/lib/data/public";
import { panelPath } from "@/lib/paths";

export const revalidate = 300;

/**
 * Manifesto do app do painel de cada barbearia: separado do app do cliente (id próprio),
 * abre na agenda e cobre todas as páginas do painel, inclusive o login (escopo /painel/).
 * Público e sem dados privados: o navegador busca o manifesto sem cookies.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const shop = await getShop((await params).slug);
  if (!shop) return new NextResponse(null, { status: 404 });
  const name = `Painel ${shop.name}`;
  const manifest: MetadataRoute.Manifest = {
    id: `${panelPath(shop.slug)}/`,
    name,
    short_name: name.length > 12 ? "Painel" : name,
    description: `Agenda e avisos de agendamento da ${shop.name}.`,
    start_url: `${panelPath(shop.slug)}?origem=pwa`,
    scope: "/painel/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0c",
    theme_color: "#0b0b0c",
    lang: "pt-BR",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return NextResponse.json(manifest, { headers: { "content-type": "application/manifest+json" } });
}
