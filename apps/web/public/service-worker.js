self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Add offline caching strategies or background sync logic here
  const { request } = event;
  
  if (request.method === 'POST' || request.method === 'PATCH' || request.method === 'PUT') {
    // If we're offline, we could queue these requests in IndexedDB
    // For now, this is handled by the frontend's sync-queue implementation.
    return;
  }
  
  // Basic network-first strategy for demonstration
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});
