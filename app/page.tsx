import Home from "./home";
import { recordPageVisit } from "@/lib/insights";
import { headers, cookies } from "next/headers";
export const dynamic = "force-dynamic";
export default async function Page() {
  await recordPageVisit(await headers(), await cookies());
  return <Home exampleStartDate={new Date().toISOString().slice(0, 10)} />;
}
