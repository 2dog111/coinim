import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  let responseCookie: string | null = null;
  if (request.nextUrl.pathname === "/" && !request.cookies.has("coin_visit")) {
    const visitorId = randomBytes(16).toString("hex");
    const existingCookies = requestHeaders.get("cookie");
    requestHeaders.set("cookie", `${existingCookies ? `${existingCookies}; ` : ""}coin_visit=${visitorId}`);
    responseCookie = visitorId;
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (responseCookie) {
    response.cookies.set("coin_visit", responseCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  if (request.nextUrl.pathname.startsWith("/insights/")) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = { matcher: ["/", "/insights/:path*"] };
