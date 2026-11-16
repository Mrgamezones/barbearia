"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { panelPath } from "@/lib/paths";

const ITEMS = [
  { sub: "", label: "Agenda" },
  { sub: "novo", label: "Novo agendamento" },
  { sub: "servicos", label: "Serviços" },
  { sub: "horarios", label: "Horários" },
  { sub: "bloqueios", label: "Bloqueios" },
  { sub: "config", label: "Configurações" },
];

export function AdminNav({ slug }: { slug: string }) {
  const path = usePathname();
  const home = panelPath(slug);
  return (
    <nav aria-label="Painel" className="-mb-px flex gap-1 overflow-x-auto">
      {ITEMS.map((i) => {
        const href = panelPath(slug, i.sub);
        const active = i.sub === "" ? path === home || path.startsWith(`${home}/clientes`) : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm whitespace-nowrap",
              active ? "border-gold text-text" : "border-transparent text-muted hover:text-text",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
