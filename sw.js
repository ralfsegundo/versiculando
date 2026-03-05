// ============================================================
//  sw.js — Versiculando Service Worker
//  Estratégia: Cache-First para assets, Network-First para API
// ============================================================

const VERSION = 'versiculando-v1';
const CACHE_STATIC = `${VERSION}-static`;
const CACHE_DYNAMIC = `${VERSION}-dynamic`;
const CACHE_SUPABASE = `${VERSION}-supabase`;

// Assets que SEMPRE devem estar em cache (shell do app)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
];

// URLs que nunca devem ser cacheadas
const NEVER_CACHE = [
  'supabase.co/auth',          // login/logout — nunca do cache
  'chrome-extension',
  'hot-update',                // vite HMR
];

// URLs do Supabase que podem ser cacheadas (dados dos livros)
const SUPABASE_CACHEABLE = [
  'supabase.co/rest/v1/bible_books_data',
  'supabase.co/rest/v1/trails',
  'supabase.co/rest/v1/trail_days',
];

// ─── INSTALL ──────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith('versiculando-') && !key.startsWith(VERSION))
          .map(key => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ─── FETCH ────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // Ignora não-GET e URLs bloqueadas
  if (request.method !== 'GET') return;
  if (NEVER_CACHE.some(pattern => url.includes(pattern))) return;
  if (!url.startsWith('http')) return;

  // 1. Dados de livros e trilhas do Supabase → Network-First com fallback de cache
  if (SUPABASE_CACHEABLE.some(pattern => url.includes(pattern))) {
    event.respondWith(networkFirstWithCache(request, CACHE_SUPABASE, 60 * 60 * 24)); // 24h
    return;
  }

  // 2. Chamadas genéricas ao Supabase (progresso, notas, perfil) → Network-only
  if (url.includes('supabase.co')) {
    event.respondWith(networkOnly(request));
    return;
  }

  // 3. Assets estáticos do app (JS, CSS, fontes, ícones) → Cache-First
  if (
    url.includes('/assets/') ||
    url.endsWith('.js') ||
    url.endsWith('.css') ||
    url.endsWith('.woff2') ||
    url.endsWith('.woff') ||
    url.endsWith('.png') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico')
  ) {
    event.respondWith(cacheFirst(request, CACHE_STATIC));
    return;
  }

  // 4. Navegação (HTML) → Network-First, fallback para /index.html
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }

  // 5. Tudo mais → Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_DYNAMIC));
});

// ─── ESTRATÉGIAS ──────────────────────────────────────────

// Cache-First: serve do cache, busca na rede só se não tiver
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

// Network-First: tenta rede, cai para cache se offline
async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      // Adiciona timestamp ao header para controle de expiração
      const responseToCache = new Response(await response.clone().text(), {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers),
          'sw-cached-at': Date.now().toString(),
          'sw-max-age': maxAgeSeconds.toString(),
        },
      });
      cache.put(request, responseToCache);
      return response;
    }
    throw new Error('Network response not ok');
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Offline — servindo do cache:', request.url);
      return cached;
    }
    return new Response(JSON.stringify({ error: 'offline', data: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Network-only: sem cache
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Stale-While-Revalidate: serve cache e atualiza em background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await fetchPromise || new Response('Offline', { status: 503 });
}

// Navegação: Network-First, fallback para index.html (SPA)
async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_STATIC);
      cache.put(request, response.clone());
      return response;
    }
    throw new Error('Nav response not ok');
  } catch {
    const cached = await caches.match(request) || await caches.match('/index.html');
    if (cached) return cached;
    return new Response('<h1>Offline</h1><p>Conecte-se para usar o Versiculando.</p>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// ─── MENSAGENS DO APP ──────────────────────────────────────
self.addEventListener('message', (event) => {
  // App pode pedir para limpar cache de dados (ex: após sync)
  if (event.data?.type === 'CLEAR_SUPABASE_CACHE') {
    caches.delete(CACHE_SUPABASE).then(() => {
      event.ports[0]?.postMessage({ success: true });
    });
  }

  // App pode pedir para pré-cachear uma lista de URLs
  if (event.data?.type === 'PRECACHE_URLS') {
    const urls = event.data.urls || [];
    caches.open(CACHE_SUPABASE).then(cache => {
      Promise.all(urls.map(url =>
        fetch(url).then(r => r.ok ? cache.put(url, r) : null).catch(() => null)
      )).then(() => event.ports[0]?.postMessage({ success: true, count: urls.length }));
    });
  }
});
