"use client";
import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";

const KEY = "dica-instalar-ios-dispensada";

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS se apresenta como Mac, mas tem toque.
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/** Dica discreta no Safari do iOS: "Compartilhar → Adicionar à Tela de Início". Dispensável e lembrada. */
export function IosInstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(KEY) === "1";
    } catch {
      // Armazenamento bloqueado: mostra a dica normalmente.
    }
    if (isIos() && !isStandalone() && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  return (
    <div
      role="region"
      aria-label="Instalar o app"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-md border border-border bg-card p-4 text-sm shadow-lg shadow-black/40"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <p className="flex-1">
        Instale o app: toque em <Share className="inline size-4 align-text-bottom text-gold" aria-label="Compartilhar" /> e depois em{" "}
        <strong>Adicionar à Tela de Início</strong>.
      </p>
      <button type="button" onClick={dismiss} className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-sm text-muted hover:text-text" aria-label="Dispensar dica">
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}
