import type { SmsProviderCode } from './integrations.types';

export class UnsafeSmsProviderUrlError extends Error {}

const OFFICIAL_PROVIDER_HOSTS: Record<SmsProviderCode, readonly string[]> = {
  africas_talking: ['api.africastalking.com', 'api.sandbox.africastalking.com'],
  twilio: ['api.twilio.com'],
  textsms_kenya: ['sms.textsms.co.ke'],
};

export function parseAdditionalSmsProviderHosts(value: unknown): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

export function assertSafeSmsProviderUrl(
  value: string,
  providerCode: SmsProviderCode,
  additionalAllowedHosts: readonly string[] = [],
): URL {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new UnsafeSmsProviderUrlError('SMS provider endpoint is invalid');
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (url.protocol !== 'https:' || url.username || url.password || !hostname) {
    throw new UnsafeSmsProviderUrlError(
      'SMS provider endpoint must be an HTTPS URL without embedded credentials',
    );
  }

  if (isPrivateOrLocalHost(hostname)) {
    throw new UnsafeSmsProviderUrlError('SMS provider endpoint must use a public host');
  }

  const configuredHosts = additionalAllowedHosts.map((host) => host.trim().toLowerCase());
  const officialHosts = OFFICIAL_PROVIDER_HOSTS[providerCode];
  const isTwilioRegionalHost = providerCode === 'twilio'
    && /^api(?:\.[a-z0-9-]+){1,2}\.twilio\.com$/.test(hostname);
  const allowed = officialHosts.includes(hostname)
    || configuredHosts.includes(hostname)
    || isTwilioRegionalHost;

  if (!allowed) {
    throw new UnsafeSmsProviderUrlError(
      `SMS provider host ${hostname} is not in the configured allowlist`,
    );
  }

  return url;
}

function isPrivateOrLocalHost(hostname: string): boolean {
  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname === '0.0.0.0'
    || hostname === '::'
    || hostname === '::1'
  ) {
    return true;
  }

  const mappedIpv4 = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mappedIpv4) {
    return isPrivateIpv4(mappedIpv4);
  }

  if (/^(?:fc|fd)[0-9a-f:]*$/i.test(hostname) || /^fe[89ab][0-9a-f:]*$/i.test(hostname)) {
    return true;
  }

  return isPrivateIpv4(hostname);
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }

  const octets = parts.map(Number);
  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return true;
  }

  const [first, second] = octets;
  return first === 0
    || first === 10
    || first === 127
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 100 && second >= 64 && second <= 127)
    || first >= 224;
}
