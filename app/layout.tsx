import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

// display: swap + fallback com métricas ajustadas: o texto aparece na hora, sem "texto invisível".
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap", adjustFontFallback: true });
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  adjustFontFallback: true,
});

/** Metadados gerais; o nome de cada barbearia entra pelo layout de /barbearia/[slug]. */
export const metadata: Metadata = {
  title: { default: "Agendamento online", template: "%s · Agendamento online" },
  description: "Agende seu corte de cabelo, barba e bigode em poucos toques.",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0c",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
