"use client";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/Button";

/** Link "Agendar agora": rola até o painel (#agendar) e leva o foco para a primeira etapa. */
export function ScrollToBooking({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <a
      href="#agendar"
      className={buttonClasses("solid", className)}
      onClick={(e) => {
        const panel = document.getElementById("agendar");
        const firstStep = document.getElementById("etapa-1-titulo");
        if (!panel || !firstStep) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        panel.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        firstStep.focus({ preventScroll: true });
        window.history.replaceState(null, "", window.location.pathname + window.location.search + "#agendar");
      }}
    >
      {children}
    </a>
  );
}
