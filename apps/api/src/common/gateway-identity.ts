import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

type IngressRequest = { headers?: Record<string, string | string[] | undefined>; ip?: string };

// Authenticates client metadata only. JWT, tenant, capability and CSRF checks
// remain independent; this signature never grants access to an API or school.
export function resolveGatewayClientIp(
  request: IngressRequest,
  secret = process.env.GATEWAY_IDENTITY_SECRET ?? '',
  now = Date.now(),
): string | null {
  const headers = request.headers ?? {};
  const ip = headers['x-myshule-client-ip'];
  const timestamp = headers['x-myshule-client-time'];
  const signature = headers['x-myshule-client-signature'];
  if (ip === undefined && timestamp === undefined && signature === undefined) return null;
  const userAgent = headers['user-agent'] ?? '';
  if (secret.length < 32 || typeof ip !== 'string' || !isIP(ip)
    || typeof timestamp !== 'string' || !/^\d{13}$/.test(timestamp)
    || Math.abs(now - Number(timestamp)) > 60_000
    || typeof signature !== 'string' || !/^[a-f0-9]{64}$/.test(signature)
    || typeof userAgent !== 'string') {
    throw new UnauthorizedException('Invalid gateway identity');
  }
  const expected = createHmac('sha256', secret)
    .update(JSON.stringify(['v1', ip, userAgent, timestamp])).digest();
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) {
    throw new UnauthorizedException('Invalid gateway identity');
  }
  return ip;
}

export function resolveRequestClientIp(request: IngressRequest): string | null {
  const verified = resolveGatewayClientIp(request);
  if (verified) return verified;
  // Preserve Railway's existing first-entry ingress contract for direct API
  // clients and provider callbacks. Never treat cf-connecting-ip as trusted here.
  const forwarded = request.headers?.['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first && isIP(first) ? first : request.ip || null;
}
