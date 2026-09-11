import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const { pathname } = request.nextUrl;

  // Detect admin subdomain: e.g. "admin.localhost:3000", "admin.jotadebeese.com"
  const isAdminSubdomain = host.startsWith("admin.");

  // =========================================================================
  // CASE A: ADMIN SUBDOMAIN (e.g. admin.jotadebeese.com, admin.localhost:3000)
  // =========================================================================
  if (isAdminSubdomain) {
    // 1. Redirect subdomain root "/" to "/admin" so the dashboard loads cleanly
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // 2. Allow Payload Admin UI and Payload API routes
    if (pathname.startsWith("/admin") || pathname.startsWith("/api")) {
      return NextResponse.next();
    }

    // 3. Block public site routes (e.g. /about, /notes) on the admin subdomain
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  // =========================================================================
  // CASE B: MAIN DOMAIN (e.g. jotadebeese.com, localhost:3000)
  // =========================================================================
  // Hide /admin completely on the main domain -> display 404 Not Found
  if (pathname.startsWith("/admin")) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - Next.js internal static assets (_next/static, _next/image)
     * - Public assets (assets/, favicon.ico, robots.txt, sitemap.xml)
     */
    "/((?!_next/static|_next/image|assets/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
