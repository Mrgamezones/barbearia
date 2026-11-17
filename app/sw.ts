/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const sameOrigin = (url: URL) => url.origin === self.location.origin;
/** Link de gerenciamento de agendamento: /barbearia/<slug>/agendamento/<token>. */
const MANAGE_LINK = /^\/barbearia\/[a-z0-9-]+\/agendamento\//;
/** Início e catálogo de uma barbearia: /barbearia/<slug> e /barbearia/<slug>/servicos. */
const SHOP_CATALOG = /^\/barbearia\/[a-z0-9-]+(\/servicos)?\/?$/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Painel, APIs e o link de gerenciamento sempre na rede (dados pessoais e sensíveis ao tempo).
    {
      matcher: ({ url }) =>
        sameOrigin(url) && (url.pathname.startsWith("/painel") || url.pathname.startsWith("/api/") || MANAGE_LINK.test(url.pathname)),
      handler: new NetworkOnly(),
    },
    // Server Actions (POST com header Next-Action) nunca passam por cache.
    { matcher: ({ request }) => request.headers.has("Next-Action"), handler: new NetworkOnly() },
    // Home e catálogo: mostra o que estiver em cache e atualiza em segundo plano.
    {
      matcher: ({ url, request }) =>
        sameOrigin(url) && request.method === "GET" && SHOP_CATALOG.test(url.pathname),
      handler: new StaleWhileRevalidate({ cacheName: "catalogo" }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// --- Notificações (Web Push) ---------------------------------------------------
// Lembretes do cliente: { title, body, appointmentId, tag } — o clique abre o link de gerenciamento.
// Avisos ao dono: + { url, alertId } — o clique abre a agenda do dia e as janelas do painel atualizam.
type PushData = { title: string; body: string; appointmentId: string; tag?: string; url?: string; alertId?: number };
const LINKS_CACHE = "lembretes-links";

const isPanel = (url: string) => new URL(url).pathname.startsWith("/painel/");

self.addEventListener("push", (event) => {
  let data: PushData;
  try {
    data = event.data?.json() as PushData;
  } catch {
    data = { title: "Lembrete do seu horário", body: event.data?.text() ?? "", appointmentId: "" };
  }
  event.waitUntil(
    (async () => {
      // Sempre mostra a notificação: o iOS revoga a inscrição de quem recebe push sem mostrar nada.
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: data.tag ?? `lembrete-${data.appointmentId}`,
        data: { appointmentId: data.appointmentId, url: data.url ?? null },
      });
      if (data.alertId !== undefined) {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const w of windows) if (isPanel(w.url)) w.postMessage({ type: "shop-alert", alertId: data.alertId });
      }
    })(),
  );
});

/** Link de gerenciamento guardado pelo navegador quando o cliente ativou o lembrete. */
async function manageUrlFor(appointmentId: string): Promise<string> {
  if (!appointmentId) return "/";
  const cache = await caches.open(LINKS_CACHE);
  const res = await cache.match(`/__lembrete/${appointmentId}`);
  return res ? await res.text() : "/";
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = (event.notification.data as { appointmentId?: string; url?: string | null } | null) ?? {};
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (data.url) {
        // Aviso ao dono: reaproveita uma janela do painel já aberta, navegando até a agenda do dia.
        const url = new URL(data.url, self.location.origin);
        const panelRoot = url.pathname.split("/").slice(0, 3).join("/"); // /painel/<slug>
        const panel = windows.find((w) => new URL(w.url).pathname.startsWith(panelRoot));
        if (panel) {
          const focused = await panel.focus();
          return focused.navigate(url.href);
        }
        return self.clients.openWindow(url.href);
      }
      const url = new URL(await manageUrlFor(data.appointmentId ?? ""), self.location.origin).href;
      const existing = windows.find((w) => w.url === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
