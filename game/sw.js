/* Service worker: офлайн-режим (игра против ботов работает без сети) */
const CACHE = 'penguin-sumo-v1';
const FILES = ['./', 'index.html', 'game.js', 'sim.js', 'config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname === '/stats' || u.pathname === '/sdk.js') return;
  // сеть в приоритете (чтобы обновления доезжали), кэш — на случай офлайна
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
