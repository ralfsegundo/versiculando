// ============================================================
//  sw.js — Service Worker do Versiculando
//
//  Responsabilidades:
//  1. Cache offline de assets estáticos
//  2. Agendamento e disparo de notificações de streak
// ============================================================

const CACHE_NAME = 'versiculando-v2';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json'];

// ── Instalação: pré-cacheia assets essenciais ─────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// ── Ativação: remove caches antigos ──────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: serve do cache quando offline ─────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── Notificações de streak ────────────────────────────────────

let streakNotifTimer = null;

self.addEventListener('message', (event) => {
  const { type, delayMs, title, body, streak, scheduledFor } = event.data || {};

  if (type === 'SCHEDULE_STREAK_NOTIFICATION') {
    // Cancela qualquer timer anterior antes de criar um novo
    if (streakNotifTimer) {
      clearTimeout(streakNotifTimer);
      streakNotifTimer = null;
    }

    console.log(`[SW] Notificação de streak agendada para ${scheduledFor} (em ${Math.round(delayMs / 60000)} min)`);

    streakNotifTimer = setTimeout(async () => {
      // Verifica se alguma janela do app está aberta e em foco
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const appIsOpen = clients.some(c => c.visibilityState === 'visible');

      // Não notifica se o usuário já está no app
      if (appIsOpen) {
        console.log('[SW] App aberto — notificação de streak cancelada');
        return;
      }

      self.registration.showNotification(title, {
        body,
        icon:   '/icons/icon.svg',
        badge:  '/icons/icon.svg',
        tag:    'streak-reminder',       // substitui notificação anterior se houver
        renotify: false,
        requireInteraction: false,
        data: { streak, url: '/' },
        actions: [
          { action: 'open', title: '📖 Abrir agora' },
          { action: 'dismiss', title: 'Mais tarde' },
        ],
        vibrate: [200, 100, 200],        // padrão Android
      });
    }, delayMs);
  }

  if (type === 'CANCEL_STREAK_NOTIFICATION') {
    if (streakNotifTimer) {
      clearTimeout(streakNotifTimer);
      streakNotifTimer = null;
      console.log('[SW] Notificação de streak cancelada — usuário ativo');
    }
  }
});

// ── Clique na notificação ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  // Foca janela existente ou abre nova
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
