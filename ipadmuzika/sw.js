// Sphärenwerk – Service Worker: hält die Maschine für den Betrieb ohne Netz bereit.
// Eigene Dateien: erst das Netz (mit kurzer Frist), sonst der Speicher. Schriften: erst der Speicher.
const V = 'sphaerenwerk-1';
const CORE = ['./', 'index.html', 'style.css', 'engine.js', 'manifest.webmanifest',
  'js/util.js', 'js/scale.js', 'js/defs.js', 'js/machine.js', 'js/rituale.js', 'js/ui.js', 'js/audio.js',
  'js/displays.js', 'js/werk.js', 'js/pad.js', 'js/recorder.js', 'js/oracle.js', 'js/main.js',
  'icons/icon-192.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(V);
      try {
        const res = await Promise.race([fetch(req), timeout(3000)]);
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) return hit;
        if (req.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
        return Response.error();
      }
    })());
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(V + '-fonts');
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    })());
  }
});
