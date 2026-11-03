export const COIN_DECIMALS = 18;
export const USDT_DECIMALS = 6;
export const PRICE_PER_COIN_RAW = 1_000_000_000_000n;
export const COIN_SUPPLY_RAW = 1_000_000_000_000_000_000n;
export function parseUsdt(value: string): bigint | null {
  if (!/^\d+(\.\d{0,6})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(decimal.padEnd(6, "0"));
}
export function formatRaw(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const fraction = (value % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${value / divisor}${fraction ? `.${fraction}` : ""}`;
}
export function quoteRaw(usdtRaw: bigint): bigint { return usdtRaw * COIN_SUPPLY_RAW / PRICE_PER_COIN_RAW; }
export function sharePercent(coinRaw: bigint): string { return `${formatRaw(coinRaw * 100n, 18)}%`; }
