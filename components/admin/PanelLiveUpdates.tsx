"use client";
import { Volume2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { latestAlertId } from "@/app/painel/[slug]/config/alert-actions";
import { playAlertSound, readAlertSound, unlockAudio } from "@/lib/admin/alert-sounds";

/** Intervalo da consulta com a página visível (a spec pede no máximo 1 minuto). */
const POLL_MS = 30_000;

/**
 * Mantém o painel aberto em dia: consulta o último aviso da barbearia a cada 30 s (só com a página visível),
 * ao voltar para a página e ao receber a mensagem do service worker. Aviso novo → atualiza a tela e toca o toque.
 */
export function PanelLiveUpdates({ slug }: { slug: string }) {
  const router = useRouter();
  const lastSeen = useRef<number | null>(null);
  const checking = useRef(false);
  const [needsTap, setNeedsTap] = useState(false);

  const check = useCallback(async () => {
    if (checking.current || document.visibilityState !== "visible") return;
    checking.current = true;
    try {
      const latest = await latestAlertId(slug);
      // Primeira consulta só inicializa: avisos anteriores à abertura do painel não tocam.
      if (lastSeen.current !== null && latest > lastSeen.current) {
        router.refresh();
        const played = await playAlertSound(readAlertSound());
        if (!played) setNeedsTap(true);
      }
      if (lastSeen.current === null || latest > lastSeen.current) lastSeen.current = latest;
    } catch {
      // Sem conexão ou sessão expirada: tenta de novo na próxima rodada.
    } finally {
      checking.current = false;
    }
  }, [router, slug]);

  useEffect(() => {
    void check();
    const timer = window.setInterval(() => void check(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        void check();
      }
    };
    const onMessage = (e: MessageEvent) => {
      if ((e.data as { type?: string } | null)?.type === "shop-alert") void check();
    };
    // Destrava o áudio no primeiro toque (exigência dos navegadores, principalmente no iOS).
    const onTap = () => {
      void unlockAudio().then((ok) => ok && setNeedsTap(false));
    };
    document.addEventListener("visibilitychange", onVisible);
    navigator.serviceWorker?.addEventListener("message", onMessage);
    window.addEventListener("pointerdown", onTap);
    window.addEventListener("keydown", onTap);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      window.removeEventListener("pointerdown", onTap);
      window.removeEventListener("keydown", onTap);
    };
  }, [check, router]);

  if (!needsTap) return null;
  return (
    <button
      type="button"
      onClick={() => void unlockAudio().then((ok) => ok && setNeedsTap(false))}
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-sm items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg shadow-black/40"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      data-testid="enable-sound"
    >
      <Volume2 className="size-4 text-gold" aria-hidden /> Toque para ativar o som dos avisos
    </button>
  );
}
