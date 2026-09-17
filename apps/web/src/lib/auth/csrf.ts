import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const CSRF_COOKIE = "myshule.csrf";
export const CSRF_HEADER = "x-myshule-csrf";

export function generateCsrfToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function shouldUseSecureCookie(request?: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const forwardedProto = request?.headers.get("x-forwarded-proto") ?? "";
  const host = request?.headers.get("x-forwarded-host") ?? request?.headers.get("host") ?? "";

  if (/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host)) {
    return false;
  }

  return forwardedProto === "https" || !forwardedProto;
}

export function createCsrfResponse(request?: NextRequest) {
  const token = generateCsrfToken();
  const response = NextResponse.json({ token });

  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: 60 * 30,
  });

  return response;
}

export function validateCsrfRequest(request: NextRequest, audience?: string) {
  // The regular web/PWA gateway is same-origin. A sibling site must not
  // authorize a write by planting a matching double-submit cookie.
  const sessionAudience = audience ?? request.cookies.get("myshule_audience")?.value;
  if (sessionAudience === "school" || sessionAudience === "portal") {
    const origin = request.headers.get("origin");
    const site = request.headers.get("sec-fetch-site");
    if ((origin && origin !== new URL(request.url).origin) || site === "cross-site" || site === "same-site") {
      return false;
    }
  }
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value ?? null;
  const headerToken = request.headers.get(CSRF_HEADER);

  return Boolean(cookieToken && headerToken && cookieToken === headerToken);
}
