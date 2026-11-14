import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Brand } from "./Brand";

/** Tela de estado (offline, 404, erro) com a identidade: marca, ícone dourado, eyebrow e título serifado. */
export function StatusScreen({
  icon: Icon,
  eyebrow,
  title,
  brandName = "Barbearia",
  children,
  actions,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  brandName?: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center lg:h-[72px]">
        <Brand name={brandName} />
      </header>
      <main id="conteudo" className="container-page flex flex-1 flex-col items-start justify-center gap-5 pb-24">
        <span className="flex size-16 items-center justify-center rounded-full border border-gold/40 bg-card">
          <Icon className="size-8 text-gold" strokeWidth={1.25} aria-hidden />
        </span>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="title-display">{title}</h1>
        <div className="max-w-md text-muted">{children}</div>
        <div className="flex flex-wrap gap-3">{actions}</div>
      </main>
    </div>
  );
}
