"use client";
import { BellOff, BellRing, Check, Info, Send, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { isAlertSubscribed, sendTestAlert, subscribeAlerts, unsubscribeAlerts } from "@/app/painel/[slug]/config/alert-actions";
import { Button } from "@/components/ui/Button";
import { currentPushSubscription, isIos, isStandalone, pushSupported, urlBase64ToUint8Array } from "@/lib/admin/device";
import { getPublicConfig } from "@/lib/public-config";

type State = "checking" | "ios-install" | "unsupported" | "denied" | "idle" | "working" | "enabled";

/** Evento disparado quando os avisos são ativados/desativados (o lembrete da agenda se esconde). */
export const ALERTS_CHANGED_EVENT = "avisos-alterados";

/** Situação dos avisos neste aparelho, sem pedir permissão. */
export async function detectAlertsState(slug: string): Promise<Exclude<State, "working">> {
  if (isIos() && !isStandalone()) return "ios-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (Notification.permission !== "granted") return "idle";
  const sub = await currentPushSubscription();
  return sub && (await isAlertSubscribed(slug, sub.endpoint)) ? "enabled" : "idle";
}

/** Cartão "Avisos neste aparelho" (Configurações): ativar, testar e desativar os avisos de agendamento. */
export function AlertsCard({ slug }: { slug: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    detectAlertsState(slug)
      .then(setState)
      .catch(() => setState("idle"));
  }, [slug]);

  function changed() {
    window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
  }

  async function enable() {
    setState("working");
    setMessage(null);
    try {
      // A permissão só é pedida aqui, após o toque do dono.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "denied" : "idle");
      const { vapidPublicKey } = await getPublicConfig();
      if (!vapidPublicKey) throw new Error("sem chave VAPID");
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) }));
      const r = await subscribeAlerts(slug, sub.toJSON());
      if (!r.ok) throw new Error(r.error);
      setState("enabled");
      changed();
    } catch {
      setState("idle");
      setMessage("Não foi possível ativar os avisos. Tente de novo.");
    }
  }

  async function disable() {
    setState("working");
    setMessage(null);
    const sub = await currentPushSubscription().catch(() => null);
    // A inscrição do navegador não é cancelada: ela pode servir aos lembretes de cliente neste aparelho.
    const r = sub ? await unsubscribeAlerts(slug, sub.endpoint) : { ok: true as const };
    if (r.ok) {
      setState("idle");
      setMessage("Avisos desativados neste aparelho.");
      changed();
    } else {
      setState("enabled");
      setMessage("Não foi possível desativar. Tente de novo.");
    }
  }

  async function test() {
    setMessage(null);
    const sub = await currentPushSubscription().catch(() => null);
    const r = sub ? await sendTestAlert(slug, sub.endpoint) : { ok: false as const, error: "not_found" as const };
    if (r.ok) setMessage("Aviso de teste enviado. Ele deve chegar em alguns segundos.");
    else if (r.error === "not_found") {
      setState("idle");
      setMessage("Este aparelho não está mais inscrito. Ative os avisos de novo.");
    } else setMessage("O aviso de teste não pôde ser enviado. Tente de novo em instantes.");
  }

  return (
    <section className="flex flex-col gap-3 rounded-md border border-border bg-card p-5" aria-labelledby="avisos-titulo" data-testid="alerts-card" data-state={state}>
      <div>
        <h2 id="avisos-titulo" className="flex items-center gap-2 font-medium">
          <BellRing className="size-4 text-gold" aria-hidden /> Avisos neste aparelho
        </h2>
        <p className="mt-1 text-sm text-muted">Receba uma notificação na hora em que um cliente marcar ou cancelar um horário pelo site.</p>
      </div>

      {state === "checking" ? null : state === "ios-install" ? (
        <div className="flex flex-col gap-2 text-sm" data-testid="alerts-ios-install">
          <p>
            No iPhone, os avisos só funcionam com o painel instalado: toque em <Share className="inline size-4 align-text-bottom text-gold" aria-label="Compartilhar" /> e
            depois em <strong>Adicionar à Tela de Início</strong>.
          </p>
          <p className="text-muted">Abra o painel pelo novo ícone, entre de novo com seu e-mail e senha e ative os avisos por lá. É preciso iOS 16.4 ou mais novo.</p>
        </div>
      ) : state === "unsupported" ? (
        <p className="flex items-start gap-2 text-sm text-muted" data-testid="alerts-unsupported">
          <Info className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          Este navegador não recebe avisos. Com o painel aberto, a agenda continua se atualizando sozinha.
        </p>
      ) : state === "denied" ? (
        <p className="flex items-start gap-2 text-sm text-muted" data-testid="alerts-denied">
          <BellOff className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          As notificações estão bloqueadas para este site. Libere em Configurações do navegador → Notificações e recarregue esta página.
        </p>
      ) : state === "enabled" ? (
        <div className="flex flex-col gap-3">
          <p role="status" className="flex items-center gap-2 text-sm text-success">
            <Check className="size-4" aria-hidden /> Avisos ativos neste aparelho.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={test}>
              <Send className="size-4" aria-hidden /> Enviar aviso de teste
            </Button>
            <Button variant="ghost" onClick={disable}>
              Desativar
            </Button>
          </div>
        </div>
      ) : (
        <Button className="self-start" onClick={enable} disabled={state === "working"}>
          <BellRing className="size-4" aria-hidden /> {state === "working" ? "Ativando…" : "Receber avisos neste aparelho"}
        </Button>
      )}

      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}
    </section>
  );
}
