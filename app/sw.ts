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

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Painel, APIs e o link de gerenciamento sempre na rede (dados pessoais e sensíveis ao tempo).
    {
      matcher: ({ url }) => sameOrigin(url) && (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/") || url.pathname.startsWith("/agendamento/")),
      handler: new NetworkOnly(),
    },
    // Server Actions (POST com header Next-Action) nunca passam por cache.
    { matcher: ({ request }) => request.headers.has("Next-Action"), handler: new NetworkOnly() },
    // Home e catálogo: mostra o que estiver em cache e atualiza em segundo plano.
    {
      matcher: ({ url, request }) =>
        sameOrigin(url) && request.method === "GET" && (url.pathname === "/" || url.pathname === "/servicos"),
      handler: new StaleWhileRevalidate({ cacheName: "catalogo" }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();

// --- Lembretes (Web Push) ------------------------------------------------------
type ReminderPayload = { title: string; body: string; appointmentId: string; tag?: string };
const LINKS_CACHE = "lembretes-links";

self.addEventListener("push", (event) => {
  let data: ReminderPayload;
  try {
    data = event.data?.json() as ReminderPayload;
  } catch {
    data = { title: "Lembrete do seu horário", body: event.data?.text() ?? "", appointmentId: "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag ?? `lembrete-${data.appointmentId}`,
      data: { appointmentId: data.appointmentId },
    }),
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
  const appointmentId = (event.notification.data as { appointmentId?: string } | null)?.appointmentId ?? "";
  event.waitUntil(
    (async () => {
      const url = new URL(await manageUrlFor(appointmentId), self.location.origin).href;
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const existing = windows.find((w) => w.url === url);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })(),
  );
});
