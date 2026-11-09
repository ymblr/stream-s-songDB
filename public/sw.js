const CACHE_NAME = 'songdb-cache-v2';
const BASE = new URL('./', self.location).pathname;
const MAX_ENTRIES = 120;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.add(BASE))
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  // GitHub Pages shares an origin with other repositories: only remove our caches.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('songdb-cache-') && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function remember(request, response) {
  if (!response.ok || response.type === 'opaque') return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .slice(0, Math.max(0, keys.length - MAX_ENTRIES))
      .filter((key) => new URL(key.url).pathname !== BASE)
      .map((key) => cache.delete(key))
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith(BASE)
  )
    return;
  const hashedAsset = /\/assets\/.*-[\w-]+\.(?:js|css)$/.test(url.pathname);
  if (hashedAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            event.waitUntil(remember(request, response.clone()));
            return response;
          })
      )
    );
  } else {
    // HTML and unhashed public files (manifest/icons) must receive new deployments.
    event.respondWith(
      fetch(request)
        .then((response) => {
          event.waitUntil(remember(request, response.clone()));
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ||
            (request.mode === 'navigate'
              ? await caches.match(BASE)
              : undefined) ||
            Response.error()
        )
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
