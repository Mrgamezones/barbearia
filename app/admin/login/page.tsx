import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { Brand } from "@/components/site/Brand";
import { getSettings } from "@/lib/data/public";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <Brand name={settings.name} />
        <div className="flex flex-col gap-2">
          <p className="eyebrow">Painel</p>
          <h1 className="font-display text-4xl font-medium">Entrar</h1>
        </div>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
