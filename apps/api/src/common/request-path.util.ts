const sensitiveQueryKeys = new Set([
  'code',
  'otp',
  'password',
  'refresh_token',
  'secret',
  'token',
]);

/** Only provider-owned ingress routes bypass host-derived school routing.
 * Their controller authenticates the channel token before accessing school data. */
export function isPaymentIngressCallback(method: string | undefined, path: string): boolean {
  return method?.toUpperCase() === 'POST' && (
    /^\/(?:api\/)?payments\/mpesa\/callback\/[^/]+\/[^/]+\/[^/]+$/.test(path) ||
    /^\/(?:api\/)?payments\/ingress\/[^/]+\/(?:sandbox|production)\/[^/]+\/[^/]+\/[^/]+\/(?:confirmation|validation)$/.test(path) ||
    /^\/(?:api\/)?payments\/ingress\/(?:verification|check)\/[^/]+\/[^/]+\/[^/]+\/(?:result|timeout)$/.test(path)
  );
}

function redactPathTokens(path: string): string {
  return path.replace(
    /(\/payments\/mpesa\/callback\/[^/]+\/[^/]+\/)[^/]+/gi, '$1[redacted]',
  ).replace(
    /(\/payments\/ingress\/(?:(?:verification|check)\/[^/]+\/[^/]+|[^/]+\/[^/]+\/[^/]+\/[^/]+)\/)[^/]+(?=\/(?:confirmation|validation|result|timeout)(?:\/|$))/gi,
    '$1[redacted]',
  ).replace(
    /(\/payments\/mpesa\/transaction-status\/[^/]+\/[^/]+\/)[^/]+(?=\/(?:result|timeout)(?:\/|$))/gi,
    '$1[redacted]',
  );
}

export function sanitizeRequestPath(value: string | undefined | null): string {
  const rawPath = typeof value === 'string' && value.trim().length > 0 ? value.trim() : '/';

  try {
    const parsed = new URL(rawPath, 'http://myshule.local');

    if (parsed.searchParams.size === 0) {
      return redactPathTokens(parsed.pathname || '/');
    }

    const safeParams = new URLSearchParams();
    parsed.searchParams.forEach((paramValue, paramKey) => {
      if (sensitiveQueryKeys.has(paramKey.toLowerCase())) {
        safeParams.set(paramKey, '[redacted]');
        return;
      }

      safeParams.set(paramKey, paramValue);
    });
    const safeQuery = safeParams.toString();

    return `${redactPathTokens(parsed.pathname || '/')}${safeQuery ? `?${safeQuery}` : ''}`;
  } catch {
    const [pathOnly] = rawPath.split(/[?#]/, 1);

    return redactPathTokens(pathOnly || '/');
  }
}
