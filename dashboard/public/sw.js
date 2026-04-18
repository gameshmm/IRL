// Service Worker — IRL Stream Dashboard PWA
const CACHE_NAME = 'irl-stream-v1';

// Arquivos a cachear para funcionamento offline básico (shell da app)
const SHELL_ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Não cacheia chamadas de API nem SSE
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/signal/')) {
    return;
  }

  // Network first para navegação, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Cache first para assets estáticos
  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request))
  );
});
