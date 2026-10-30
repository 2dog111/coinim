import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function validInsightsKey(candidate: string) {
  const expected = process.env.INSIGHTS_SECRET || "";
  if (!/^[a-f0-9]{64}$/.test(candidate) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  return timingSafeEqual(
    createHmac("sha256", "coin.im-insights").update(candidate).digest(),
    createHmac("sha256", "coin.im-insights").update(expected).digest(),
  );
}

export function proxy(request: NextRequest) {
  const insightsPath = request.nextUrl.pathname.startsWith("/insights/");
  if (insightsPath) {
    const candidate = request.nextUrl.pathname.split("/")[2] || "";
    if (!validInsightsKey(candidate)) {
      return new NextResponse(null, {
        status: 404,
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
        },
      });
    }
  }
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
  if (insightsPath) {
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return response;
}

export const config = { matcher: ["/", "/insights/:path*"] };
