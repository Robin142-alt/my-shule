type RefreshableSession = {
  accessToken: string;
};

type FetchWithSessionRefreshInput<TSession extends RefreshableSession> = {
  accessToken: string;
  send: (accessToken: string) => Promise<Response>;
  refreshSession: () => Promise<TSession>;
};

type FetchWithSessionRefreshResult<TSession extends RefreshableSession> = {
  response: Response;
  body: ArrayBuffer;
  refreshedSession?: TSession;
  sessionExpired?: boolean;
};

function readMessage(responseBody: string) {
  try {
    const payload = JSON.parse(responseBody) as { message?: unknown };
    return typeof payload.message === "string" ? payload.message : "";
  } catch {
    return "";
  }
}

export function isRefreshableSessionFailure(status: number, responseBody: string) {
  const message = readMessage(responseBody).toLowerCase();

  if (status === 401) {
    return (
      message.includes("token validation failed") ||
      message.includes("access token") ||
      message.includes("session is no longer valid")
    );
  }

  return status === 403 && message.includes("permission-based access denied");
}

export async function fetchWithSessionRefresh<TSession extends RefreshableSession>(
  input: FetchWithSessionRefreshInput<TSession>,
): Promise<FetchWithSessionRefreshResult<TSession>> {
  const firstResponse = await input.send(input.accessToken);
  const firstBody = await firstResponse.arrayBuffer();
  const firstResponseText =
    firstResponse.status === 401 || firstResponse.status === 403
      ? new TextDecoder().decode(firstBody)
      : "";

  if (!isRefreshableSessionFailure(firstResponse.status, firstResponseText)) {
    return {
      response: firstResponse,
      body: firstBody,
    };
  }

  try {
    const refreshedSession = await input.refreshSession();
    const retryResponse = await input.send(refreshedSession.accessToken);
    const retryBody = await retryResponse.arrayBuffer();

    return {
      response: retryResponse,
      body: retryBody,
      refreshedSession,
    };
  } catch {
    return {
      response: firstResponse,
      body: firstBody,
      sessionExpired: firstResponse.status === 401 ? true : undefined,
    };
  }
}
