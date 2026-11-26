import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (formerly Middleware). Runs before every matched request.
 *
 * 1. CSRF: rejects cross-origin state-changing API requests (Origin check).
 * 2. Optimistic auth redirect: no session cookie -> /login for private pages.
 *    This is only a fast path; real session validation happens on the server
 *    in getCurrentUser() for every page and API call.
 * 3. Security headers on every response.
 */

// Must match SESSION_COOKIE_NAME in src/lib/auth/session.ts (that module is
// server-only and pulls in the DB, so it isn't imported here).
const SESSION_COOKIE_NAME = "auth_session";

const PROTECTED_PREFIXES = ["/dashboard"];
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") &&
    STATE_CHANGING_METHODS.has(request.method) &&
    isCrossOrigin(request)
  ) {
    return withSecurityHeaders(
      NextResponse.json(
        { success: false, message: "Cross-origin request blocked." },
        { status: 403 }
      )
    );
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !request.cookies.has(SESSION_COOKIE_NAME)) {
    return withSecurityHeaders(
      NextResponse.redirect(new URL("/login", request.url))
    );
  }

  return withSecurityHeaders(NextResponse.next());
}

/**
 * Browsers always send `Origin` on cross-origin POST/PUT/PATCH/DELETE, so a
 * mismatch means another site is trying to use the user's cookies. Requests
 * with no Origin come from non-browser clients (curl, Postman), which cannot
 * carry a victim's cookies, so they are allowed. Together with the session
 * cookie's SameSite=Lax this blocks CSRF.
 */
function isCrossOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");

  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

// Browsers upload file bytes directly to object storage (signed URLs).
const STORAGE_ORIGIN = (() => {
  try {
    return process.env.STORAGE_S3_ENDPOINT ? new URL(process.env.STORAGE_S3_ENDPOINT).origin : "";
  } catch {
    return "";
  }
})();

function withSecurityHeaders(response: NextResponse) {
  const isDev = process.env.NODE_ENV !== "production";

  const csp = [
    "default-src 'self'",
    // Next.js injects inline bootstrap scripts; dev mode also needs eval for
    // React debugging and fast refresh.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${STORAGE_ORIGIN ? ` ${STORAGE_ORIGIN}` : ""}`,
    `media-src 'self' blob:${STORAGE_ORIGIN ? ` ${STORAGE_ORIGIN}` : ""}`,
    // In-app PDF viewer loads the signed file URL in an iframe.
    `frame-src 'self'${STORAGE_ORIGIN ? ` ${STORAGE_ORIGIN}` : ""}`,
    "font-src 'self'",
    `connect-src 'self'${STORAGE_ORIGIN ? ` ${STORAGE_ORIGIN}` : ""}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
