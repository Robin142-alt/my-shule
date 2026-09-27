export const AUTH_REQUEST_TIMEOUT_MS = 20_000;

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error(
        "The connection took too long. Check your internet and try again.",
      );
    if (error instanceof TypeError)
      throw new Error("Unable to connect. Check your internet and try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
