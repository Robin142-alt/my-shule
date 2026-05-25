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
  body: string;
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
  if (status !== 401) {
    return false;
  }

  const message = readMessage(responseBody).toLowerCase();

  return (
    message.includes("token validation failed") ||
    message.includes("access token") ||
    message.includes("session is no longer valid")
  );
}

export async function fetchWithSessionRefresh<TSession extends RefreshableSession>(
  input: FetchWithSessionRefreshInput<TSession>,
): Promise<FetchWithSessionRefreshResult<TSession>> {
  const firstResponse = await input.send(input.accessToken);
  const firstBody = await firstResponse.text();

  if (!isRefreshableSessionFailure(firstResponse.status, firstBody)) {
    return {
      response: firstResponse,
      body: firstBody,
    };
  }

  try {
    const refreshedSession = await input.refreshSession();
    const retryResponse = await input.send(refreshedSession.accessToken);
    const retryBody = await retryResponse.text();

    return {
      response: retryResponse,
      body: retryBody,
      refreshedSession,
    };
  } catch {
    return {
      response: firstResponse,
      body: firstBody,
      sessionExpired: true,
    };
  }
}
