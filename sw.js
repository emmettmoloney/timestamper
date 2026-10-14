// Offline support: the whole app is cached on install and served from cache.
// Bump VERSION whenever any file below changes so phones pick up the update.
// An open page keeps the code it loaded; the new version shows on the next launch.

const VERSION = 'v1';
const CACHE = `timestamper-${VERSION}`;
const FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/model.js', 'js/store.js', 'js/time.js',
  'fonts/atkinson-hyperlegible-next.woff2', 'fonts/atkinson-hyperlegible-mono.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('timestamper-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  ev.respondWith(
    caches.match(req, { ignoreSearch: true })
      .then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : null))
      .then(hit => hit || fetch(req)),
  );
});
