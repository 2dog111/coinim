import { createPublicClient, http, getAddress, isAddress, type Address } from "viem";
import { avalanche } from "viem/chains";

const ERC20_ABI = [
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const;
const SALE_ABI = [
  { type: "function", name: "COIN_TOKEN", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "PAYMENT_TOKEN", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "TREASURY", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "PRICE_PER_COIN_RAW", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
] as const;
export type SaleRuntime = { coin: Address; sale: Address; payment: Address; treasury: Address; rpc: string; inventoryRaw: string; deploymentBlock: string };
export async function getSaleRuntime(): Promise<SaleRuntime | null> {
  const { CHAIN_ID, PAYMENT_TOKEN_ADDRESS, COIN_TOKEN_ADDRESS, SALE_CONTRACT_ADDRESS, TREASURY_ADDRESS, SALE_ADMIN_ADDRESS, DEPLOYMENT_BLOCK, RPC_URL } = process.env;
  if (!CHAIN_ID || !PAYMENT_TOKEN_ADDRESS || !COIN_TOKEN_ADDRESS || !SALE_CONTRACT_ADDRESS || !TREASURY_ADDRESS || !SALE_ADMIN_ADDRESS || !DEPLOYMENT_BLOCK || !RPC_URL) return null;
  if (CHAIN_ID !== "43114" || ![PAYMENT_TOKEN_ADDRESS, COIN_TOKEN_ADDRESS, SALE_CONTRACT_ADDRESS, TREASURY_ADDRESS, SALE_ADMIN_ADDRESS].every(value => isAddress(value)) || getAddress(PAYMENT_TOKEN_ADDRESS) !== getAddress("0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7")) return null;
  try {
    const coin = getAddress(COIN_TOKEN_ADDRESS), sale = getAddress(SALE_CONTRACT_ADDRESS), payment = getAddress(PAYMENT_TOKEN_ADDRESS), treasury = getAddress(TREASURY_ADDRESS);
    const client = createPublicClient({ chain: avalanche, transport: http(RPC_URL, { timeout: 8000 }) });
    const [chain, coinCode, saleCode, paymentCode, coinDecimals, paymentDecimals, supply, onSaleCoin, onSalePayment, onSaleTreasury, price, paused, inventory, admin] = await Promise.all([
      client.getChainId(), client.getCode({ address: coin }), client.getCode({ address: sale }), client.getCode({ address: payment }),
      client.readContract({ address: coin, abi: ERC20_ABI, functionName: "decimals" }), client.readContract({ address: payment, abi: ERC20_ABI, functionName: "decimals" }),
      client.readContract({ address: coin, abi: ERC20_ABI, functionName: "totalSupply" }),
      client.readContract({ address: sale, abi: SALE_ABI, functionName: "COIN_TOKEN" }), client.readContract({ address: sale, abi: SALE_ABI, functionName: "PAYMENT_TOKEN" }),
      client.readContract({ address: sale, abi: SALE_ABI, functionName: "TREASURY" }), client.readContract({ address: sale, abi: SALE_ABI, functionName: "PRICE_PER_COIN_RAW" }),
      client.readContract({ address: sale, abi: SALE_ABI, functionName: "paused" }), client.readContract({ address: coin, abi: ERC20_ABI, functionName: "balanceOf", args: [sale] }),
      client.readContract({ address: sale, abi: [{ type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }], functionName: "owner" }),
    ]);
    if (chain !== 43114 || coinCode === "0x" || saleCode === "0x" || paymentCode === "0x" || coinDecimals !== 18 || paymentDecimals !== 6 || supply !== 10n ** 18n || onSaleCoin !== coin || onSalePayment !== payment || onSaleTreasury !== treasury || price !== 1_000_000_000_000n || admin !== getAddress(SALE_ADMIN_ADDRESS) || paused || inventory === 0n) return null;
    return { coin, sale, payment, treasury, rpc: "https://api.avax.network/ext/bc/C/rpc", inventoryRaw: inventory.toString(), deploymentBlock: DEPLOYMENT_BLOCK };
  } catch { return null; }
}
