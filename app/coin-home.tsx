"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "./coin-home.css";
import { parseUsdt, quoteRaw, formatRaw, sharePercent } from "@/lib/coin-sale";
import type { SaleRuntime } from "@/lib/coin-runtime";
import CoinCheckout from "./coin-checkout";

function quote(value: string): { usdt: string; coin: string; percent: string } | { error: string } {
  const raw = parseUsdt(value);
  if (raw === null) return { error: "Enter a USDT amount with up to 6 decimal places." };
  if (raw === 0n) return { error: "Enter an amount above zero." };
  if (raw > 1_000_000_000_000n) return { error: "The amount exceeds the full supply at this price." };
  const coinRaw = quoteRaw(raw);
  return { usdt: formatRaw(raw, 6), coin: formatRaw(coinRaw, 18), percent: sharePercent(coinRaw) };
}

export default function CoinHome({ saleConfig }: { saleConfig: SaleRuntime | null }) {
  const [value, setValue] = useState("100");
  const [copied, setCopied] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const result = quote(value);
  function choose(amount: string) { setValue(amount); setCopied(""); }
  async function copy() {
    if ("error" in result) return;
    try { await navigator.clipboard.writeText(`${result.usdt} USDT = ${result.coin} COIN = ${result.percent} of total supply`); setCopied("Copied to clipboard."); }
    catch { setCopied("Could not copy. Please select and copy the values."); }
  }
  return <div className="coin-page">
    <header className="coin-header"><div className="coin-header-inner">
      <Link className="coin-brand" href="/" aria-label="COIN home"><Image src="/coin-mark.png" alt="" width={36} height={36}/><span>COIN</span></Link>
      <span className="coin-status"><i/> PRE-LAUNCH</span>
      <nav aria-label="Main navigation"><a href="#how">How it works</a><button onClick={() => input.current?.focus()}>Explore price <span>↗</span></button></nav>
      <div className="coin-contact"><a href="mailto:8@111.bz?subject=coin.im%20domain%20purchase%20inquiry">Domain for sale <strong>$70,000</strong></a><a href="mailto:8@111.bz">8@111.bz</a></div>
    </div></header>
    <main>
      <section className="coin-section coin-first" aria-labelledby="hero-title"><div className="coin-wrap">
        <div className="coin-grid"><div className="coin-intro"><p className="coin-eyebrow"><span>01 / THE IDEA</span><span>ONE WHOLE, SHARED</span></p>
          <h1 id="hero-title">One coin.<br/><em>Own a fraction.</em></h1>
          <p className="coin-lede">The plan: one COIN in total. A fixed sale price lets you see what each USDT amount would buy.</p>
          <div className="coin-hero-art"><Image src="/coin-hero.webp" alt="A single silver coin with a small cobalt fragment" width={900} height={600} priority/><span className="art-label art-label-one">1 COIN <b>= 100%</b></span><span className="art-label art-label-fraction">↗ Fractions, illustrated</span></div>
          <div className="coin-facts"><span>Planned total supply <strong>1 COIN</strong></span><span>Fractions as small as <strong>0.0000000001 COIN</strong></span></div>
        </div>
        <div className="explorer" id="explorer"><div className="explorer-top"><div><p className="coin-eyebrow">A CLOSER LOOK</p><h2>Fixed-price quote</h2></div><span className="explorer-index">01 / 01</span></div>
          <p className="explorer-desc">1 COIN = 1,000,000 USDT. Purchase is not available yet.</p>
          <label htmlFor="coin-amount">You pay</label><div className="amount-box"><input ref={input} id="coin-amount" value={value} onChange={e => choose(e.target.value)} inputMode="decimal" autoComplete="off" aria-invalid={"error" in result} aria-describedby="amount-help"/><span>USDT</span></div>
          <p className="input-help" id="amount-help" role={"error" in result ? "alert" : undefined}>{"error" in result ? result.error : "Up to 6 decimal places"}</p>
          <div className="presets" aria-label="Example fractions"><span>TRY A SHARE</span>{[["10","10"],["50","50"],["100","100"],["500","500"],["1,000","1000"]].map(([label, amount]) => <button key={label} onClick={() => choose(amount)} aria-pressed={value === amount}>{label}</button>)}</div>
          <div className="result"><span>You receive</span><strong>{"error" in result ? "—" : `${result.coin} COIN`}</strong><small>{"error" in result ? "" : `${result.percent} of total supply`}</small></div>
          {saleConfig ? <CoinCheckout config={saleConfig} value={value} /> : <p className="sale-availability">USDT · Avalanche C-Chain<br/>Network fees are paid in AVAX.<br/>Sale contract and inventory are not published. Purchases are unavailable.</p>}
          <button className="copy-button" onClick={copy} disabled={"error" in result}>Copy quote <span>↗</span></button><p className="copy-feedback" aria-live="polite">{copied || "Fixed sale price. Trading has not launched."}</p>
        </div></div>
      </div></section>
      <section className="coin-section coin-second" id="how" aria-labelledby="how-title"><div className="coin-wrap"><div className="second-heading"><div><p className="coin-eyebrow">02 / HOW IT WORKS</p><h2 id="how-title">One whole. Many fractions.</h2></div><p>Every fraction is part of the same COIN. Dividing it does not create more coins.</p></div>
        <div className="coin-grid second-grid"><div className="how-left"><div className="distribution-art"><Image src="/coin-distribution.webp" alt="Complementary fragments of a single silver disc" width={900} height={500} loading="lazy"/></div><div className="flow"><strong>1 COIN</strong><span>→</span><strong>Fractions</strong><span>→</span><strong>Holders</strong></div><div className="selection"><span>Your selected fraction</span><strong>{"error" in result ? "Enter a valid amount" : `${result.coin} COIN`}</strong><small>{"error" in result ? "" : `${result.percent} of total supply`}</small></div></div>
          <div className="launch"><div className="launch-head"><h3>Launch details</h3><span>PRE-LAUNCH</span></div><dl>{[["Planned supply","1 COIN"],["Fixed sale price","1 COIN = 1,000,000 USDT"],["Full-supply valuation at sale price","1,000,000 USDT"],["COIN contract","To be published"],["Sale contract","To be published"],["Available for sale","Not funded"],["Trading","Not live"]].map(([key,val]) => <div key={key}><dt>{key}</dt><dd>{val}</dd></div>)}</dl><p className="launch-note">Contract, allocation, team shares and liquidity terms are to be published before trading.</p><details><summary>What do I own?</summary><p>A fraction of the COIN token. This model does not promise rights to the company, its revenue or the domain.</p></details><details><summary>What does the valuation mean?</summary><p>One COIN multiplied by the fixed sale price equals 1,000,000 USDT. It is not a market capitalization or a resale quote.</p></details><details><summary>Can I sell?</summary><p>A primary sale would not create a secondary market or a buyback obligation.</p></details></div>
        </div><footer className="coin-footer"><strong>COIN<span>.</span></strong><span>coin.im · PRE-LAUNCH</span><a href="/blog">Research ↗</a><a href="mailto:8@111.bz">8@111.bz</a></footer>
      </div></section>
    </main>
  </div>;
}
