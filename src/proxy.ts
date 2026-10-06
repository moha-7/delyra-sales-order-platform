import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasSessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/audit/:path*",
    "/change-password/:path*",
    "/customers/:path*",
    "/dashboard/:path*",
    "/deposits/:path*",
    "/documents/:path*",
    "/leads/:path*",
    "/notifications/:path*",
    "/opportunities/:path*",
    "/orders/:path*",
    "/pricing/:path*",
    "/quotations/:path*",
    "/reports/:path*",
    "/tasks/:path*",
    "/api/document-versions/:path*",
    "/api/documents/:path*",
    "/api/opportunities/:path*",
  ],
};