"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/novo", label: "Novo agendamento" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/horarios", label: "Horários" },
  { href: "/admin/bloqueios", label: "Bloqueios" },
  { href: "/admin/config", label: "Configurações" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="Painel" className="-mb-px flex gap-1 overflow-x-auto">
      {ITEMS.map((i) => {
        const active = i.href === "/admin" ? path === "/admin" || path.startsWith("/admin/clientes") : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
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
