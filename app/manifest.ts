import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data/public";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings().catch(() => ({ name: "Barbearia" }));
  return {
    id: "/",
    name: `${settings.name} — Agendamento`,
    short_name: settings.name.length > 12 ? "Agendar" : settings.name,
    description: "Agende seu corte de cabelo, barba e bigode em poucos toques.",
    start_url: "/?origem=pwa",
    scope: "/",
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
    shortcuts: [{ name: "Agendar horário", url: "/agendar", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] }],
  };
}
