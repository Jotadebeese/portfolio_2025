import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { LIVE_TOOL_IDS, ToolId } from "@/components/tools/types";
import { isForthwebHost } from "@/lib/forthweb-host";

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
  // CASE B: FORTHWEB SUBDOMAIN (e.g. forthweb.jotadebeese.com, forthweb.localhost:3000)
  // =========================================================================
  if (isForthwebHost(host)) {
    // 1. Strip internal /forthweb prefix if requested directly
    if (pathname === "/forthweb" || pathname.startsWith("/forthweb/")) {
      const strippedPath = pathname.replace(/^\/forthweb/, "") || "/";
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = strippedPath;
      return NextResponse.redirect(redirectUrl, 308);
    }

    // 2. Rewrite "/" to the Forthweb workbench (preserving ?tools=...)
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/forthweb";
      return NextResponse.rewrite(url);
    }

    // 3. Rewrite single-segment live tool routes (e.g. /image-optimizer)
    const slug = pathname.slice(1);
    if (!slug.includes("/") && LIVE_TOOL_IDS.includes(slug as ToolId)) {
      const url = request.nextUrl.clone();
      url.pathname = `/forthweb/${slug}`;
      return NextResponse.rewrite(url);
    }

    // 4. Route everything else (including /admin, /about, /jwt-inspector) to Forthweb 404
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = "/forthweb/not-found";
    return NextResponse.rewrite(notFoundUrl);
  }

  // =========================================================================
  // CASE C: MAIN DOMAIN (e.g. jotadebeese.com, localhost:3000)
  // =========================================================================
  // Hide /admin and internal /forthweb routes on the main domain -> 404 Not Found
  if (
    pathname.startsWith("/admin") ||
    pathname === "/forthweb" ||
    pathname.startsWith("/forthweb/")
  ) {
    return NextResponse.rewrite(new URL("/not-found", request.url));
  }

  const response = NextResponse.next();

  // Prevent search indexing, edge caching, and Referer token leakage on private notes
  if (pathname === "/notes/p" || pathname.startsWith("/notes/p/")) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
    response.headers.set(
      "Cache-Control",
      "private, no-store, no-cache, must-revalidate",
    );
    response.headers.set("Referrer-Policy", "no-referrer");
  }

  return response;
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
