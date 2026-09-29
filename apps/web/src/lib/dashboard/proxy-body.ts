export class ProxyBodyTooLargeError extends Error {
  constructor() {
    super("Request body exceeds the upload limit");
  }
}

// Buffer only a bounded upload so an expired access token can be refreshed and
// the exact request retried. Content-Length alone cannot enforce this boundary.
export async function readBoundedProxyBody(request: Request, maxBytes: number): Promise<ArrayBuffer | undefined> {
  if (!request.body || request.method === "GET" || request.method === "HEAD") return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new ProxyBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}
