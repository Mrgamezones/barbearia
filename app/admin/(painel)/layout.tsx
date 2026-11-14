import type { Metadata } from "next";
import { logout } from "@/app/admin/login/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { Brand } from "@/components/site/Brand";
import { Button } from "@/components/ui/Button";
import { getAdminSession } from "@/lib/admin/auth";
import { getSettings } from "@/lib/data/public";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ isAdmin, user }, settings] = await Promise.all([getAdminSession(), getSettings()]);

  if (!isAdmin) {
    return (
      <main className="container-page flex min-h-dvh flex-col items-start justify-center gap-4">
        <h1 className="font-display text-4xl font-medium">Acesso negado</h1>
        <p className="text-muted">A conta {user.email} não tem permissão para acessar o painel.</p>
        <form action={logout}>
          <Button type="submit" variant="outline">Sair</Button>
        </form>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <Brand name={settings.name} href="/admin" />
          <form action={logout}>
            <Button type="submit" variant="ghost">Sair</Button>
          </form>
        </div>
        <div className="container-page">
          <AdminNav />
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
    </div>
  );
}
