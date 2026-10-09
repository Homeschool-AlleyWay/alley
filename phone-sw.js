/* UNIFY Flip Phone service worker: app shell works offline; live APIs (Google, GitHub, dictionary, /api) always go to the network. */
const V = 'flip-v6', SHELL = ['phone.html', 'phone-net.js', 'phone-config.js', 'phone.webmanifest', 'phone-icon.svg', 'index.html', 'game.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  if (r.mode === 'navigate' && (u.pathname === '/phone' || u.pathname.endsWith('/phone.html'))) { e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put('phone.html', c)); return res; }).catch(() => caches.match('phone.html'))); return; }
  if (r.mode === 'navigate' && (u.pathname.endsWith('/') || u.pathname.endsWith('/index.html'))) { e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put('index.html', c)); return res; }).catch(() => caches.match('index.html'))); return; }
  if (!SHELL.some(p => u.pathname.endsWith('/' + p) || u.pathname === '/' + p)) return;
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; }).catch(() => caches.match(r)));
});
