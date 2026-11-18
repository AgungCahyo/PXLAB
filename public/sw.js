/* PXLB service worker — safe caching for installable PWA.
 * Does NOT claim full offline editing. Avoids auth/session/mutation caching.
 */
const VERSION = "pxlb-pwa-v1"
const STATIC_CACHE = `${VERSION}-static`
const PAGES_CACHE = `${VERSION}-pages`
const ART_CACHE = `${VERSION}-art`
const OFFLINE_URL = "/offline.html"
const ART_CACHE_LIMIT = 40

const PRECACHE = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
  "/manifest.webmanifest",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE)
      await cache.addAll(PRECACHE)
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith("pxlb-pwa-") && !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return

  const url = new URL(request.url)

  // Never touch cross-origin (Supabase Auth/Realtime/Storage/API).
  if (url.origin !== self.location.origin) return

  // Never cache auth or service worker itself.
  if (
    url.pathname.startsWith("/auth/") ||
    url.pathname === "/sw.js" ||
    (url.pathname.startsWith("/api/") && !isPublicArtwork(url.pathname))
  ) {
    return
  }

  // Navigations: network-first → cached page → offline shell.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  // Hashed Next build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // App icons + offline offline page.
  if (url.pathname.startsWith("/icons/") || url.pathname === OFFLINE_URL) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // Public pixel covers only — selective, capped.
  if (isPublicArtwork(url.pathname)) {
    event.respondWith(artworkStaleWhileRevalidate(request))
    return
  }

  // Everything else (RSC, server actions GET, create editor, APIs): network only.
})

function isPublicArtwork(pathname) {
  return /^\/api\/pixel-cover\/[0-9a-f-]{36}$/i.test(pathname)
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGES_CACHE)
  try {
    const response = await fetch(request)
    // Only cache successful HTML-ish navigations — never create editor drafts offline.
    if (response.ok && response.type === "basic") {
      const path = new URL(request.url).pathname
      if (!isEditorPath(path)) {
        cache.put(request, response.clone())
      }
    }
    return response
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    const offline = await caches.match(OFFLINE_URL)
    return (
      offline ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    )
  }
}

function isEditorPath(pathname) {
  return (
    pathname === "/create" ||
    pathname.startsWith("/create/") ||
    pathname === "/id/create" ||
    pathname.startsWith("/id/create/") ||
    pathname === "/en/create" ||
    pathname.startsWith("/en/create/")
  )
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(cacheName)
    cache.put(request, response.clone())
  }
  return response
}

async function artworkStaleWhileRevalidate(request) {
  const cache = await caches.open(ART_CACHE)
  const cached = await cache.match(request)
  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        await cache.put(request, response.clone())
        await trimCache(ART_CACHE, ART_CACHE_LIMIT)
      }
      return response
    })
    .catch(() => null)

  if (cached) {
    // Revalidate in background; do not block the cached response.
    networkPromise.catch(() => {})
    return cached
  }
  const network = await networkPromise
  if (network) return network
  return new Response(null, { status: 504 })
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  const overflow = keys.length - maxEntries
  for (let i = 0; i < overflow; i += 1) {
    await cache.delete(keys[i])
  }
}
