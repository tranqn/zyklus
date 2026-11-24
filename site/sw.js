// Offline cache: app shell network-first, hashed assets cache-first.
const CACHE = 'zyklus-v3'
// sw.js stays the same across deploys, so old hashed chunks are pruned here instead of on activate:
// keep the newest entries (one deploy is about 20 chunks; the running version is always the newest)
const MAX_ASSETS = 60
async function pruneAssets(cache) {
  const assets = (await cache.keys()).filter((r) => new URL(r.url).pathname.includes('/assets/'))
  await Promise.all(assets.slice(0, Math.max(0, assets.length - MAX_ASSETS)).map((r) => cache.delete(r)))
}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])))
  self.skipWaiting()
})
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return
  // account data and food search must never come from the cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/off/')) return
  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(e.request, copy).then(() => pruneAssets(c)))
            }
            return res
          }),
      ),
    )
    return
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html'))),
  )
})
