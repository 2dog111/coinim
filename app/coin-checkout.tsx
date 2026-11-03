"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, http, parseEventLogs, type Address, type Hex } from "viem";
import { avalanche } from "viem/chains";
import type { SaleRuntime } from "@/lib/coin-runtime";
import { parseUsdt, quoteRaw, formatRaw, sharePercent } from "@/lib/coin-sale";

type Provider = { request: (request: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (event: string, listener: (...args: unknown[]) => void) => void; removeListener?: (event: string, listener: (...args: unknown[]) => void) => void };
declare global { interface Window { ethereum?: Provider } }
const tokenAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
] as const;
const saleAbi = [
  { type: "function", name: "paused", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "quote", stateMutability: "pure", inputs: [{ type: "uint256" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "buy", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }], outputs: [] },
  { type: "event", name: "Purchased", inputs: [{ indexed: true, name: "buyer", type: "address" }, { indexed: true, name: "paymentToken", type: "address" }, { indexed: false, name: "usdtRaw", type: "uint256" }, { indexed: false, name: "coinRaw", type: "uint256" }] },
] as const;
const publicClient = createPublicClient({ chain: avalanche, transport: http("https://api.avax.network/ext/bc/C/rpc") });
const pendingKey = "coin.im.pending-buy";
type Pending = { chainId: 43114; account: Address; hash: Hex; usdtRaw: string; coinRaw: string };
export default function CoinCheckout({ config, value }: { config: SaleRuntime; value: string }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [usdtBalance, setUsdtBalance] = useState<bigint | null>(null);
  const [avaxBalance, setAvaxBalance] = useState<bigint | null>(null);
  const [inventory, setInventory] = useState<bigint | null>(null);
  const [allowance, setAllowance] = useState<bigint | null>(null);
  const [paused, setPaused] = useState<boolean | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState<Pending | null>(null);
  const [pendingUncertain, setPendingUncertain] = useState(false);
  const raw = parseUsdt(value);
  const coinRaw = raw === null ? null : quoteRaw(raw);
  async function refresh(owner: Address | null) {
    try {
      const [stock, isPaused] = await Promise.all([
        publicClient.readContract({ address: config.coin, abi: tokenAbi, functionName: "balanceOf", args: [config.sale] }),
        publicClient.readContract({ address: config.sale, abi: saleAbi, functionName: "paused" }),
      ]);
      setInventory(stock); setPaused(isPaused);
      if (owner) {
        const [balance, available, gasBalance] = await Promise.all([
          publicClient.readContract({ address: config.payment, abi: tokenAbi, functionName: "balanceOf", args: [owner] }),
          publicClient.readContract({ address: config.payment, abi: tokenAbi, functionName: "allowance", args: [owner, config.sale] }),
          publicClient.getBalance({ address: owner }),
        ]);
        setUsdtBalance(balance); setAllowance(available); setAvaxBalance(gasBalance);
      }
    } catch { setMessage("Network data is unavailable. Try again later."); setInventory(null); }
  }
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    const sync = async () => { try { const list = await provider.request({ method: "eth_accounts" }) as Address[]; const chain = await provider.request({ method: "eth_chainId" }) as string; setAccount(list[0] ?? null);setChainId(Number(BigInt(chain))); } catch { /* Wallet may be locked. */ } };
    const changed = () => { setConfirmed(null); setMessage("Wallet changed. Review the quote again."); void sync(); };
    provider.on?.("accountsChanged", changed);provider.on?.("chainChanged", changed);void sync();
    return () => { provider.removeListener?.("accountsChanged", changed);provider.removeListener?.("chainChanged", changed); };
  }, []);
  useEffect(() => { void Promise.resolve().then(() => refresh(account)); }, [account, chainId, config.coin, config.sale]);
  useEffect(() => {
    const saved = sessionStorage.getItem(pendingKey); if (!saved || !account) return;
    try { const pending = JSON.parse(saved) as Pending; if (pending.account.toLowerCase() === account.toLowerCase() && pending.chainId === 43114) void verify(pending); }
    catch { sessionStorage.removeItem(pendingKey); }
  }, [account]);
  async function verify(pending: Pending) {
    setBusy("Purchase pending");
    let finalPending = pending;
    try {
      const receipt = await publicClient.waitForTransactionReceipt({ hash: pending.hash, onReplaced: replacement => {
        if (replacement.reason === "cancelled") { sessionStorage.removeItem(pendingKey); setMessage("Transaction cancelled."); }
        else { finalPending = { ...pending, hash: replacement.transaction.hash }; sessionStorage.setItem(pendingKey, JSON.stringify(finalPending)); }
      } });
      if (receipt.status !== "success") throw new Error("The purchase reverted.");
      const events = parseEventLogs({ abi: saleAbi, eventName: "Purchased", logs: receipt.logs.filter(log => log.address.toLowerCase() === config.sale.toLowerCase()) });
      const matching = events.find(event => event.args.buyer?.toLowerCase() === pending.account.toLowerCase() && event.args.paymentToken?.toLowerCase() === config.payment.toLowerCase() && event.args.usdtRaw === BigInt(pending.usdtRaw) && event.args.coinRaw === BigInt(pending.coinRaw));
      if (!matching) throw new Error("Receipt did not contain the expected purchase event.");
      setConfirmed(finalPending);setPendingUncertain(false);setMessage("Purchase confirmed");sessionStorage.removeItem(pendingKey);await refresh(pending.account);
    } catch (error) { setPendingUncertain(!!sessionStorage.getItem(pendingKey)); setMessage(error instanceof Error ? error.message : "Purchase status is uncertain. Check the transaction before trying again."); }
    finally { setBusy(""); }
  }
  async function action() {
    const provider = window.ethereum;
    if (!provider) { setMessage("Install an Avalanche-compatible wallet to continue."); return; }
    if (!account) { try { const addresses = await provider.request({ method: "eth_requestAccounts" }) as Address[]; setAccount(addresses[0] ?? null); } catch { setMessage("Wallet connection was declined."); } return; }
    if (chainId !== 43114) { try { await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xa86a" }] }); } catch { setMessage("Switch to Avalanche C-Chain in your wallet."); } return; }
    if (!raw || !coinRaw || inventory === null || paused === null || usdtBalance === null || allowance === null || avaxBalance === null) return;
    if (paused || coinRaw > inventory || raw > usdtBalance || avaxBalance === 0n) return;
    const initialAccount = account, initialValue = value;
    const wallet = createWalletClient({ chain: avalanche, transport: custom(provider) });
    setMessage("");
    try {
      const onChainQuote = await publicClient.readContract({ address: config.sale, abi: saleAbi, functionName: "quote", args: [raw] });
      if (onChainQuote !== coinRaw) throw new Error("Quote mismatch. Purchase stopped.");
      if (allowance < raw) {
        if (allowance > 0n) {
          setBusy("Resetting USDT allowance");const resetHash = await wallet.writeContract({ account, address: config.payment, abi: tokenAbi, functionName: "approve", args: [config.sale, 0n] });
          if ((await publicClient.waitForTransactionReceipt({ hash: resetHash })).status !== "success") throw new Error("Allowance reset failed.");
        }
        setBusy(`Approving ${value} USDT`);const approvalHash = await wallet.writeContract({ account, address: config.payment, abi: tokenAbi, functionName: "approve", args: [config.sale, raw] });
        if ((await publicClient.waitForTransactionReceipt({ hash: approvalHash })).status !== "success") throw new Error("USDT approval failed.");
      }
      if (initialValue !== (document.getElementById("coin-amount") as HTMLInputElement)?.value) throw new Error("Amount changed. Review it again.");
      const current = await provider.request({ method: "eth_accounts" }) as Address[];
      if (current[0]?.toLowerCase() !== initialAccount.toLowerCase() || Number(BigInt(await provider.request({ method: "eth_chainId" }) as string)) !== 43114) throw new Error("Wallet changed. Review the purchase again.");
      const [stock, isPaused, balance, currentAllowance] = await Promise.all([
        publicClient.readContract({ address: config.coin, abi: tokenAbi, functionName: "balanceOf", args: [config.sale] }),
        publicClient.readContract({ address: config.sale, abi: saleAbi, functionName: "paused" }),
        publicClient.readContract({ address: config.payment, abi: tokenAbi, functionName: "balanceOf", args: [account] }),
        publicClient.readContract({ address: config.payment, abi: tokenAbi, functionName: "allowance", args: [account, config.sale] }),
      ]);
      if (isPaused || stock < coinRaw || balance < raw || currentAllowance < raw) throw new Error("Sale inventory or wallet balance changed.");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
      const request = await publicClient.simulateContract({ account, address: config.sale, abi: saleAbi, functionName: "buy", args: [raw, coinRaw, deadline] });
      await publicClient.estimateContractGas(request.request);
      setBusy("Confirm purchase in wallet");
      if (Number(BigInt(await provider.request({ method: "eth_chainId" }) as string)) !== 43114 || (await provider.request({ method: "eth_accounts" }) as Address[])[0]?.toLowerCase() !== initialAccount.toLowerCase()) throw new Error("Wallet changed. Review the purchase again.");
      const hash = await wallet.writeContract(request.request);
      const pending: Pending = { chainId: 43114, account, hash, usdtRaw: raw.toString(), coinRaw: coinRaw.toString() };
      sessionStorage.setItem(pendingKey, JSON.stringify(pending));await verify(pending);
    } catch (error) { setMessage(error instanceof Error ? error.message.slice(0, 180) : "Wallet request failed.");setBusy(""); }
  }
  const label = busy || !account ? busy || "Connect wallet" : chainId !== 43114 ? "Switch to Avalanche" : allowance !== null && raw !== null && allowance < raw ? `Approve ${value} USDT` : `Buy COIN for ${value} USDT`;
  const disabled = !!busy || pendingUncertain || (account !== null && chainId === 43114 && (raw === null || raw === 0n || !coinRaw || inventory === null || paused || coinRaw > inventory || usdtBalance === null || raw > usdtBalance || avaxBalance === 0n));
  return <div className="live-checkout"><p>USDT · Avalanche C-Chain<br/>Network fees are paid in AVAX.</p><p>{account ? `Wallet: ${account.slice(0, 6)}…${account.slice(-4)}` : "Wallet not connected"}</p><p>USDT balance: {usdtBalance === null ? "—" : formatRaw(usdtBalance, 6)}<br/>Available COIN: {inventory === null ? "—" : formatRaw(inventory, 18)}</p><p>Approve → Buy → Receive</p><button type="button" className="copy-button" disabled={disabled} onClick={action}>{label}</button><p role="status" aria-live="polite">{message}</p>{confirmed && <p>{formatRaw(BigInt(confirmed.usdtRaw), 6)} USDT paid · {formatRaw(BigInt(confirmed.coinRaw), 18)} COIN received · {sharePercent(BigInt(confirmed.coinRaw))} of supply. <a href={`https://snowtrace.io/tx/${confirmed.hash}`} target="_blank" rel="noreferrer">View transaction ↗</a></p>}</div>;
}
