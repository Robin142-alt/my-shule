const CACHE_PREFIX = "myshule-pwa-";
const CACHE_VERSION = "static-v1";
const STATIC_CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/brand/myshule-mark-192.png",
  "/brand/myshule-mark-512.png",
  "/brand/myshule-mark-maskable-512.png",
  "/brand/myshule-apple-touch-icon.png",
];
const PUBLIC_STATIC_PATHS = new Set([
  "/favicon.ico",
  "/icon.png",
  "/apple-icon.png",
  ...PRECACHE_URLS.filter((path) => path !== OFFLINE_URL),
]);

function isPublicStaticPath(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/brand/") ||
    PUBLIC_STATIC_PATHS.has(pathname)
  );
}

function isCacheablePublicResponse(response, requestUrl) {
  if (
    response.status !== 200 ||
    response.redirected ||
    response.type === "opaque"
  ) {
    return false;
  }

  const responseUrl = response.url
    ? new URL(response.url, self.location.origin)
    : requestUrl;

  return (
    responseUrl.origin === self.location.origin &&
    responseUrl.pathname === requestUrl.pathname
  );
}

async function precachePublicAsset(cache, pathname) {
  const requestUrl = new URL(pathname, self.location.origin);

  try {
    const response = await fetch(pathname, {
      cache: "reload",
      credentials: "same-origin",
    });

    if (isCacheablePublicResponse(response, requestUrl)) {
      await cache.put(pathname, response.clone());
    }
  } catch {
    // Installation remains recoverable when one public asset is temporarily unavailable.
  }
}

async function fetchAndCachePublicStatic(request, requestUrl) {
  const cache = await caches.open(STATIC_CACHE_NAME);

  try {
    const response = await fetch(request);

    if (isCacheablePublicResponse(response, requestUrl)) {
      try {
        await cache.put(request, response.clone());
      } catch {
        // A cache quota or storage failure must never break an online response.
      }
    }

    return response;
  } catch (error) {
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    throw error;
  }
}

async function cacheFirstVersionedStatic(request, requestUrl) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  return fetchAndCachePublicStatic(request, requestUrl);
}

async function fetchNavigationWithOfflineFallback(event) {
  try {
    const preloaded = event.preloadResponse
      ? await event.preloadResponse.catch(() => undefined)
      : undefined;

    if (preloaded) {
      return preloaded;
    }

    return await fetch(event.request);
  } catch (error) {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const offlineResponse = await cache.match(OFFLINE_URL, {
      ignoreSearch: true,
    });

    if (offlineResponse) {
      return offlineResponse;
    }

    throw error;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE_NAME);
      await Promise.all(
        PRECACHE_URLS.map((pathname) => precachePublicAsset(cache, pathname)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter(
            (cacheName) =>
              cacheName.startsWith(CACHE_PREFIX) &&
              cacheName !== STATIC_CACHE_NAME,
          )
          .map((cacheName) => caches.delete(cacheName)),
      );

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetchNavigationWithOfflineFallback(event));
    return;
  }

  if (!isPublicStaticPath(requestUrl.pathname)) {
    return;
  }

  if (requestUrl.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirstVersionedStatic(request, requestUrl));
    return;
  }

  event.respondWith(fetchAndCachePublicStatic(request, requestUrl));
});
