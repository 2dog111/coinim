import { configured } from "@/lib/server";
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { calculator: true, chat: configured(), marketData: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
