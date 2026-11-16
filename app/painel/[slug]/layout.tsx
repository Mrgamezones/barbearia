import type { Metadata } from "next";
import { logout } from "@/app/painel/login/actions";
import { AdminNav } from "@/components/admin/AdminNav";
import { Brand } from "@/components/site/Brand";
import { Button, ButtonLink } from "@/components/ui/Button";
import { getPanelSession } from "@/lib/admin/auth";
import { panelPath, shopPath } from "@/lib/paths";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Painel", template: "%s · Painel" }, robots: { index: false } };

export default async function PanelLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isAdmin, user, shop } = await getPanelSession(slug);

  if (!isAdmin) {
    // Logado, mas sem vínculo com esta barbearia: nenhum dado dela é mostrado.
    return (
      <main className="container-page flex min-h-dvh flex-col items-start justify-center gap-4">
        <h1 className="font-display text-4xl font-medium">Acesso negado</h1>
        <p className="text-muted">A conta {user.email} não tem permissão para acessar o painel desta barbearia.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/painel" variant="outline">Ir para o meu painel</ButtonLink>
          <form action={logout}>
            <Button type="submit" variant="ghost">Sair</Button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <Brand name={shop.name} href={panelPath(shop.slug)} />
          <div className="flex items-center gap-1">
            <a href={shopPath(shop.slug)} className="inline-flex min-h-11 items-center px-3 text-sm text-muted hover:text-text" target="_blank" rel="noreferrer">
              Ver site
            </a>
            <form action={logout}>
              <Button type="submit" variant="ghost">Sair</Button>
            </form>
          </div>
        </div>
        <div className="container-page">
          <AdminNav slug={shop.slug} />
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
    </div>
  );
}
