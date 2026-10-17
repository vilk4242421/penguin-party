/* Service worker: офлайн-режим + автообновление.
 * Сервер подставляет в BUILD хэш всех файлов игры — после каждого деплоя sw.js меняется,
 * браузер ставит новую версию сам, а игра перезагружается (в меню — сразу, в матче — после выхода). */
const BUILD = 'dev';
const CACHE = 'penguin-sumo-' + BUILD;
const FILES = ['./', 'index.html', 'game.js', 'sim.js', 'cosmetics.js', 'profile.js', 'audio.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname === '/stats' || u.pathname === '/health' || u.pathname === '/sdk.js') return;
  // сеть в приоритете (обновления доезжают сразу), кэш — на случай офлайна
  e.respondWith(
    fetch(e.request).then((r) => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })
      .catch(() => caches.match(e.request).then((m) => m || caches.match('index.html')))
  );
});
