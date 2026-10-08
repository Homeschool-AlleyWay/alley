/* UNIFY Curriculum service worker: network first, falls back to the saved copy so the curriculum works offline. */
const V = 'cur-v1';
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(['curriculum.html', 'demo/dist/curriculum.js', 'curriculum.webmanifest', 'curriculum/index.json', 'icon-192.png', 'icon-512.png'])).then(() => self.skipWaiting()).catch(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('cur-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (!(u.pathname.endsWith('curriculum.html') || u.pathname.includes('/curriculum/') || u.pathname.endsWith('curriculum.js') || u.pathname.endsWith('curriculum.webmanifest'))) return;
  e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; }).catch(() => caches.match(r)));
});
