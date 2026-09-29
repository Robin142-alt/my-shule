import { isIP } from "node:net";

// Set only by our Cloudflare deployment. Local/other runtimes must not trust
// caller-provided forwarding headers. The Worker normalizes ingress first.
export function getClientIdentityHeaders(request: Request): Record<string, string> {
  const ip = process.env.MYSHULE_RUNTIME === "cloudflare"
    ? request.headers.get("cf-connecting-ip")?.trim()
    : undefined;
  const userAgent = request.headers.get("user-agent");
  return {
    ...(ip && isIP(ip) ? { "x-forwarded-for": ip } : {}),
    ...(userAgent ? { "user-agent": userAgent } : {}),
  };
}
