import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { Brand } from "@/components/site/Brand";
import { getShop } from "@/lib/data/public";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false } };

/** Barbearia de destino quando o login vem de /painel/<slug>; slugs já são públicos (site da barbearia). */
async function shopFromNext(next?: string) {
  const slug = next?.match(/^\/painel\/([a-z0-9-]+)(\/|\?|$)/)?.[1];
  if (!slug || slug === "login") return null;
  return getShop(slug);
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const shop = await shopFromNext(next);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Brand name={shop?.name ?? "Agendamento online"} href="/painel" />
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Painel</p>
          <h1 className="font-display text-4xl font-medium">{shop ? `Entrar no painel da ${shop.name}` : "Entrar"}</h1>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
