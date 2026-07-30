type RefreshableSession = {
  accessToken: string;
};

type FetchWithSessionRefreshInput<TSession extends RefreshableSession> = {
  accessToken: string;
  send: (accessToken: string) => Promise<Response>;
  refreshSession: () => Promise<TSession>;
  isRefreshSessionExpired?: (error: unknown) => boolean;
  consumeResponseBody?: boolean;
};

type FetchWithSessionRefreshResult<TSession extends RefreshableSession> = {
  response: Response;
  body: ArrayBuffer;
  refreshedSession?: TSession;
  refreshError?: unknown;
  sessionExpired?: boolean;
};

export function isRefreshableSessionFailure(status: number, _responseBody: string) {
  return status === 401;
}

export async function fetchWithSessionRefresh<TSession extends RefreshableSession>(
  input: FetchWithSessionRefreshInput<TSession>,
): Promise<FetchWithSessionRefreshResult<TSession>> {
  const firstResponse = await input.send(input.accessToken);

  if (!isRefreshableSessionFailure(firstResponse.status, "")) {
    return {
      response: firstResponse,
      body: await readResponseBody(firstResponse, input.consumeResponseBody),
    };
  }

  const firstBody = await readResponseBody(firstResponse, input.consumeResponseBody);

  try {
    const refreshedSession = await input.refreshSession();
    const retryResponse = await input.send(refreshedSession.accessToken);

    return {
      response: retryResponse,
      body: await readResponseBody(retryResponse, input.consumeResponseBody),
      refreshedSession,
      sessionExpired: retryResponse.status === 401 ? true : undefined,
    };
  } catch (error) {
    const sessionExpired = input.isRefreshSessionExpired
      ? input.isRefreshSessionExpired(error)
      : firstResponse.status === 401;

    return {
      response: firstResponse,
      body: firstBody,
      refreshError: error,
      sessionExpired: sessionExpired ? true : undefined,
    };
  }
}

function readResponseBody(response: Response, consumeResponseBody = true) {
  return consumeResponseBody
    ? response.arrayBuffer()
    : Promise.resolve(new ArrayBuffer(0));
}
