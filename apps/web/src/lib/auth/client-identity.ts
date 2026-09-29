import { isIP } from "node:net";
import { createHmac } from "node:crypto";

// Set only by our Cloudflare deployment. Local/other runtimes must not trust
// caller-provided forwarding headers. The Worker normalizes ingress first.
export function getClientIdentityHeaders(request: Request): Record<string, string> {
  const ip = process.env.MYSHULE_RUNTIME === "cloudflare"
    ? request.headers.get("cf-connecting-ip")?.trim()
    : undefined;
  const userAgent = request.headers.get("user-agent");
  const secret = process.env.GATEWAY_IDENTITY_SECRET;
  const signed: Record<string, string> = {};
  if (ip && isIP(ip)) {
    if (!secret || secret.length < 32) throw new Error("Gateway identity secret must have at least 32 characters");
    const timestamp = String(Date.now());
    signed["x-myshule-client-ip"] = ip;
    signed["x-myshule-client-time"] = timestamp;
    signed["x-myshule-client-signature"] = createHmac("sha256", secret)
      .update(JSON.stringify(["v1", ip, userAgent ?? "", timestamp])).digest("hex");
  }
  return {
    ...(ip && isIP(ip) ? { "x-forwarded-for": ip } : {}),
    ...(userAgent ? { "user-agent": userAgent } : {}),
    ...signed,
  };
}
