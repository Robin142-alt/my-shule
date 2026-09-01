import { NextResponse, type NextRequest } from "next/server";

import {
  evaluateExperienceRouting,
  PORTAL_SESSION_COOKIE,
  SCHOOL_SESSION_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
} from "@/lib/auth/experience-routing";
import { REFRESH_COOKIE } from "@/lib/auth/session-cookies";

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Content-Security-Policy', csp);
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export function proxy(request: NextRequest) {
  const decision = evaluateExperienceRouting({
    host:
      request.headers.get("x-forwarded-host") ??
      request.headers.get("host"),
    pathname: request.nextUrl.pathname,
    refreshToken: request.cookies.get(REFRESH_COOKIE)?.value,
    cookies: {
      [SUPERADMIN_SESSION_COOKIE]:
        request.cookies.get(SUPERADMIN_SESSION_COOKIE)?.value,
      [SCHOOL_SESSION_COOKIE]:
        request.cookies.get(SCHOOL_SESSION_COOKIE)?.value,
      [PORTAL_SESSION_COOKIE]:
        request.cookies.get(PORTAL_SESSION_COOKIE)?.value,
    },
  });

  if (decision.action === "redirect") {
    return applySecurityHeaders(NextResponse.redirect(new URL(decision.location, request.url)));
  }

  const requestHeaders = new Headers(request.headers);

  Object.entries(decision.headers).forEach(([key, value]) => {
    requestHeaders.set(key, value);
  });

  if (decision.rewrittenPath && decision.rewrittenPath !== request.nextUrl.pathname) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = decision.rewrittenPath;

    return applySecurityHeaders(NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    }));
  }

  return applySecurityHeaders(NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  }));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|service-worker\\.js|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
