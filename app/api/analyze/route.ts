import { handle } from "@/lib/server";
export const runtime = "nodejs";
export async function POST(req: Request) {
  return handle(req, true);
}
