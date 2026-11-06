import { cookies } from "next/headers";
import { recordBrowserSignal } from "@/lib/insights";

export async function POST(request: Request, { params }: { params: Promise<{ signal: string }> }) {
  const { signal } = await params;
  if (signal !== "js" && signal !== "active") return new Response(null, { status: 404 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || origin !== `https://${host}` || request.headers.get("sec-fetch-site") !== "same-origin") {
    return new Response(null, { status: 403 });
  }
  if (Number(request.headers.get("content-length") || 0) > 16) return new Response(null, { status: 413 });
  const platform = await request.text();
  if (platform !== "ios" && platform !== "macos" && platform !== "other") return new Response(null, { status: 400 });
  try {
    await recordBrowserSignal(request.headers, await cookies(), signal, platform);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
