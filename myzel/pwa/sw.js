// Myzel – Service Worker: speichert die App beim ersten Öffnen komplett auf dem Gerät, damit sie offline startet.
// build.py setzt VERSION (Hash über alle Dateien) und die Dateiliste ein; jede neue Version bekommt einen eigenen Cache.
// Updates: eine neue Version lädt sich vollständig in ihren Cache und wartet dann, bis die offene App sie auf dem
// Startbildschirm mit „Jetzt aktualisieren“ übernimmt (Nachricht skipWaiting, index.html updGo) – nie mitten im Spiel.
const VERSION = '__VERSION__';
const CACHE = 'myzel-' + VERSION;
const ASSETS = __ASSETS__;
const ROOMS = 'raeume-1';   // (not „myzel-…“: activate keeps it)

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => legacyActive())
      .then((legacy) => { if (legacy) return self.skipWaiting(); })
  );
});

// The active version predates the update card (its cache holds no changelog.json): its page cannot offer the update,
// so this one takes over at once, as every version did before (that page then offers „Neu laden“, the next start is
// this version). The first install has no active version and activates by itself.
async function legacyActive() {
  if (!self.registration.active) return false;
  const keys = (await caches.keys()).filter((k) => k.startsWith('myzel-') && k !== CACHE);
  for (const k of keys) if (await (await caches.open(k)).match('changelog.json')) return false;
  return true;
}

self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type === 'skipWaiting') self.skipWaiting();
  else if (d.type === 'version' && event.ports && event.ports[0]) event.ports[0].postMessage({ version: VERSION });
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('myzel-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first: the app works the same online and offline. New versions arrive through an updated sw.js.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('./', { cacheName: CACHE }).then((hit) => hit || fetch(req)));
    return;
  }
  // the hall's rooms (raeume/): not in the app's cache – kept in a cache of their own the first time one loads, across
  // versions (a new version that changes a room renames the file)
  if (url.pathname.includes('/raeume/')) {
    event.respondWith(caches.open(ROOMS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
