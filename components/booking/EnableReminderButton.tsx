"use client";
import { BellRing, Check, Info } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getPublicConfig } from "@/lib/public-config";
import { bookingPath } from "@/lib/paths";

type State = "checking" | "unsupported" | "idle" | "working" | "enabled" | "denied" | "error";

/** Cache lido pelo service worker para abrir o link certo ao tocar na notificação. */
const LINKS_CACHE = "lembretes-links";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function EnableReminderButton({ shopSlug, token, hasEmail }: { shopSlug: string; token: string; hasEmail: boolean }) {
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    if (!pushSupported()) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    setState("idle");
  }, []);

  async function enable() {
    setState("working");
    try {
      // A permissão só é pedida aqui, após o clique.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "idle");
      const { vapidPublicKey } = await getPublicConfig();
      if (!vapidPublicKey) return setState("error");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, subscription: sub.toJSON() }),
      });
      const json = (await res.json()) as { ok: boolean; appointment_id?: string };
      if (!json.ok || !json.appointment_id) return setState("error");
      const cache = await caches.open(LINKS_CACHE);
      await cache.put(`/__lembrete/${json.appointment_id}`, new Response(bookingPath(shopSlug, token)));
      setState("enabled");
    } catch {
      setState("error");
    }
  }

  if (state === "checking") return null;

  if (state === "unsupported") {
    return (
      <p className="flex items-start gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted" data-testid="reminder-unsupported">
        <Info className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
        {hasEmail
          ? "Este navegador não recebe notificações, mas você receberá os lembretes por e-mail."
          : "Este navegador não recebe notificações. No iPhone, instale o app (Compartilhar → Adicionar à Tela de Início) e abra este link por ele, ou faça um novo agendamento informando seu e-mail."}
      </p>
    );
  }

  if (state === "enabled") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-success">
        <Check className="size-4" aria-hidden /> Lembretes ativados: avisaremos 24 h e 2 h antes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" className="self-start" onClick={enable} disabled={state === "working"}>
        <BellRing className="size-4" aria-hidden /> {state === "working" ? "Ativando…" : "Ativar lembrete"}
      </Button>
      {state === "denied" ? (
        <p className="text-sm text-muted">As notificações estão bloqueadas neste navegador. Libere nas configurações do site para receber lembretes.</p>
      ) : null}
      {state === "error" ? (
        <p role="alert" className="text-sm text-danger">
          Não foi possível ativar os lembretes agora. Tente novamente.
        </p>
      ) : null}
    </div>
  );
}
