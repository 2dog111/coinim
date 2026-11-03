import CoinHome from "./coin-home";
import { recordPageVisit } from "@/lib/insights";
import { headers, cookies } from "next/headers";
export const dynamic = "force-dynamic";
export default async function Page() {
  await recordPageVisit(await headers(), await cookies());
  return <CoinHome />;
}
