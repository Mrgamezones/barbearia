import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/painel/login/actions";
import { Button } from "@/components/ui/Button";
import { loginPath } from "@/lib/admin/auth";
import { panelPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel", robots: { index: false } };

/** Entrada geral do painel: leva à barbearia do usuário, ou lista as barbearias quando ele tem mais de uma. */
export default async function PanelHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginPath("/painel"));

  const { data } = await supabase.rpc("my_shops");
  const shops = (data ?? []) as { id: string; slug: string; name: string }[];
  if (shops.length === 1) redirect(panelPath(shops[0].slug));

  return (
    <main className="container-page flex min-h-dvh max-w-xl flex-col justify-center gap-6 py-12">
      <div className="flex flex-col gap-2">
        <p className="eyebrow">Painel</p>
        <h1 className="font-display text-4xl font-medium">{shops.length ? "Suas barbearias" : "Nenhuma barbearia"}</h1>
        {shops.length ? null : <p className="text-muted">A conta {user.email} ainda não está vinculada a nenhuma barbearia.</p>}
      </div>
      {shops.length ? (
        <ul className="flex flex-col gap-3" aria-label="Suas barbearias">
          {shops.map((s) => (
            <li key={s.id}>
              <Link href={panelPath(s.slug)} className="flex min-h-14 items-center rounded-md border border-border bg-surface px-4 hover:border-gold">
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <form action={logout}>
        <Button type="submit" variant="ghost">Sair</Button>
      </form>
    </main>
  );
}
