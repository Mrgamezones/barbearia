"use client";
import { CalendarDays, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { Brand } from "./Brand";
import { NAV_ITEMS } from "./nav";


/** Cabeçalho fixo: marca, navegação (menu em tela cheia abaixo de 1024 px) e botão "Agendar". */
export function SiteHeader({ name }: { name: string }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  // Na home o painel de agendamento está na própria página.
  const bookingHref = pathname === "/" ? "/#agendar" : "/agendar";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menu aberto: trava a rolagem do fundo e leva o foco para dentro.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Fecha ao navegar para outra página.
  useEffect(() => setOpen(false), [pathname]);

  function close() {
    setOpen(false);
    menuButton.current?.focus();
  }

  // Foco preso no menu: Tab no último volta ao primeiro (e vice-versa); Esc fecha.
  function onDialogKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      return close();
    }
    if (e.key !== "Tab" || !dialog.current) return;
    const items = [...dialog.current.querySelectorAll<HTMLElement>("a, button")];
    const first = items[0];
    const last = items.at(-1)!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-colors duration-300",
        scrolled ? "border-border/60 bg-bg/80 backdrop-blur-md" : "border-transparent bg-bg",
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-2 lg:h-[72px]">
        <Brand name={name} />
        <nav aria-label="Principal" className="hidden items-center gap-10 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="py-3 text-xs font-medium uppercase tracking-[0.15em] text-muted transition-colors hover:text-text">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href={bookingHref} className={buttonClasses("outline", "max-[379px]:px-3 max-[379px]:text-xs")}>
            Agendar <CalendarDays aria-hidden className="hidden size-4 min-[380px]:block" />
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen(true)}
            className="-mr-2 flex size-11 items-center justify-center rounded-sm text-text hover:bg-card lg:hidden"
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="menu-principal"
          >
            <Menu className="size-6" aria-hidden />
          </button>
        </div>
      </div>

      {/* Portal: o backdrop-filter do cabeçalho faria o "fixed" do menu ficar preso a ele. */}
      {open ? createPortal(
        <div
          ref={dialog}
          id="menu-principal"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onKeyDown={onDialogKeyDown}
          className="fixed inset-0 z-50 flex h-dvh flex-col bg-bg lg:hidden"
        >
          <div className="container-page flex h-16 items-center justify-between">
            <Brand name={name} />
            <button type="button" onClick={close} className="-mr-2 flex size-11 items-center justify-center rounded-sm text-text hover:bg-card" aria-label="Fechar menu">
              <X className="size-6" aria-hidden />
            </button>
          </div>
          <nav aria-label="Menu principal" className="container-page flex flex-1 flex-col justify-center gap-2 pb-16">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="title-section py-3 text-text hover:text-gold">
                {item.label}
              </Link>
            ))}
            <Link href={bookingHref} onClick={() => setOpen(false)} className={buttonClasses("solid", "mt-8 self-start")}>
              Agendar horário <CalendarDays aria-hidden className="size-4" />
            </Link>
          </nav>
        </div>,
        document.body,
      ) : null}
    </header>
  );
}
