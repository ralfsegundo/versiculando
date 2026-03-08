// ============================================================
//  sw.js — Service Worker do Versiculando (Refatorado)
// ============================================================

const CACHE_VERSION = 5;
const CACHE_NAME = `versiculando-v${CACHE_VERSION}`;
const ASSETS_TO_CACHE = [
  '/', 
  '/index.html', 
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon.svg'
];

// ── Instalação ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// ── Ativação ──────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Removendo cache antigo:', k);
        return caches.delete(k);
      }))
    ).then(() => {
      self.clients.claim();
    })
  );
});

// ── Interceptação de Rede (Fetch) ─────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignora requisições não-GET, extensões do Chrome e chamadas de API (Supabase)
  if (
    request.method !== 'GET' || 
    !url.protocol.startsWith('http') || 
    url.hostname.includes('supabase.co')
  ) {
    return;
  }

  // 2. Roteamento SPA Offline: Se for navegação (ex: url direta para /perfil), serve o index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  const isAsset = /\.(js|jsx|ts|tsx|css|json)(\?.*)?$/.test(url.pathname);
  const isImageOrFont = /\.(png|jpg|jpeg|svg|gif|ico|webp|woff|woff2|ttf)$/.test(url.pathname);

  // 3. Estratégia para Scripts e Estilos: Network-First (com salvamento no cache)
  if (isAsset) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 4. Estratégia para Imagens e Fontes: Cache-First Dinâmico
  if (isImageOrFont) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;
        
        return fetch(request).then(networkResponse => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return networkResponse;
        }).catch(() => {
          return new Response('', { status: 404, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  // Fallback padrão
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});

// ── Notificações de streak ────────────────────────────────────

let streakNotifTimer = null;

self.addEventListener('message', (event) => {
  const { type, delayMs, title, body, streak, scheduledFor } = event.data || {};

  if (type === 'SCHEDULE_STREAK_NOTIFICATION') {
    if (streakNotifTimer) {
      clearTimeout(streakNotifTimer);
      streakNotifTimer = null;
    }

    console.log(`[SW] Tentando agendar notificação para ${scheduledFor} (em ${Math.round(delayMs / 60000)} min)`);

    streakNotifTimer = setTimeout(async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const appIsOpen = clients.some(c => c.visibilityState === 'visible');

      if (appIsOpen) return;

      self.registration.showNotification(title, {
        body,
        icon:   '/icons/icon-192.png',
        badge:  '/icons/icon-192.png',
        tag:    'streak-reminder',
        renotify: false,
        requireInteraction: false,
        data: { streak, url: '/' },
        vibrate: [200, 100, 200],
      });
    }, delayMs);
  }

  if (type === 'CANCEL_STREAK_NOTIFICATION') {
    if (streakNotifTimer) {
      clearTimeout(streakNotifTimer);
      streakNotifTimer = null;
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.postMessage({ type: 'NOTIF_OPENED', streak: event.notification.data?.streak });
      } else {
        self.clients.openWindow('/');
      }
    })
  );
});