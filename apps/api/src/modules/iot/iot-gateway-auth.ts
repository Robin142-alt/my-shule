import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateIotDeviceCredentialSecret(): string {
  return `iot_${randomBytes(32).toString('base64url')}`;
}

export function hashIotDeviceCredential(secret: string): string {
  return createHash('sha256')
    .update(normalizeCredential(secret), 'utf8')
    .digest('hex');
}

export function verifyIotDeviceCredential(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashIotDeviceCredential(secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashIotGatewayPayload(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value ?? {}), 'utf8')
    .digest('hex');
}

function normalizeCredential(secret: string): string {
  return secret.trim();
}
