/** Cloudflare owns CF-Connecting-IP; caller-controlled forwarding is discarded. */
export function normalizeIngress(request) {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  for (const name of ['forwarded', 'x-forwarded-for', 'x-real-ip', 'x-tenant-slug', 'x-platform-experience']) {
    headers.delete(name);
  }
  headers.set('host', url.host);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
  return new Request(request, { headers });
}

export function protectResponse(request, response) {
  const headers = new Headers(response.headers);
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith('/api/') || request.headers.has('cookie') ||
      request.headers.has('authorization') || request.headers.has('rsc') ||
      headers.has('set-cookie')) {
    headers.set('cache-control', 'private, no-store, no-transform');
    headers.set('cdn-cache-control', 'no-store');
    headers.set('cloudflare-cdn-cache-control', 'no-store');
  }
  // Keep the original stream: SSE and large exports must not be buffered here.
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
