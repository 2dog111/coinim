"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import "./coin-home.css";
import { parseUsdt, quoteRaw, formatRaw, sharePercent } from "@/lib/coin-sale";
import type { SaleRuntime } from "@/lib/coin-runtime";
import CoinCheckout from "./coin-checkout";

function quote(value: string): { usdt: string; coin: string; percent: string } | { error: string } {
  const raw = parseUsdt(value);
  if (raw === null) return { error: "Enter a USDT amount with up to 6 decimal places." };
  if (raw === 0n) return { error: "Enter an amount above zero." };
  if (raw > 1_000_000_000_000n) return { error: "This amount exceeds the price of the whole coin." };
  const coinRaw = quoteRaw(raw);
  return { usdt: formatRaw(raw, 6), coin: formatRaw(coinRaw, 18), percent: sharePercent(coinRaw) };
}

function Mark() { return <svg className="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="currentColor"/><path d="M20 7v13l11.26 6.5A13 13 0 1 1 20 7Z" fill="#f0dede"/><path d="M23 7.35A13 13 0 0 1 32.5 24L23 18.5Z" fill="#8cdded"/></svg>; }

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
      <Link className="coin-brand" href="/" aria-label="Coin.im home"><Mark/><span>Coin.im</span></Link>
      <nav aria-label="Main navigation"><a href="#how">How it works</a><a href="#details">Launch details</a><a href="/blog">Research</a></nav>
      <a className="header-cta" href="#explorer">Calculate a share <span>↗</span></a>
    </div></header>
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-symbol symbol-left" aria-hidden="true"><span/></div><div className="hero-symbol symbol-right" aria-hidden="true"><span/></div>
        <div className="hero-content"><p className="hero-kicker"><span/> A token in the making</p><h1 id="hero-title">One coin.<br/>Many shares.</h1>
          <p className="hero-copy">The plan: create one COIN and divide it into fractions. At the proposed price, 100 USDT would buy 0.01% of the whole.</p>
          <a className="hero-cta" href="#explorer">Calculate your share <span>↗</span></a><p className="hero-status">{saleConfig ? "Sale available · Avalanche C-Chain" : "Pre-launch · Purchases are not available yet"}</p>
        </div>
      </section>
      <section className="main-sheet" id="how"><div className="sheet-inner">
        <div className="section-heading"><p className="eyebrow">THE IDEA</p><h2>One is enough<br/>to go around.</h2><p>There will be one COIN in total. You won’t need to buy all of it: the coin can be divided into smaller fractions.</p></div>
        <div className="feature-grid"><div className="fraction-illustration" aria-label="A circle divided into fractions"><div className="disc"><span className="disc-center">1</span></div><div className="fraction-caption"><span>ONE WHOLE</span><span>100% ↗</span></div></div>
          <div className="explorer" id="explorer"><p className="eyebrow">THE MATH</p><h2>What would you get?</h2><p className="explorer-desc">At the proposed fixed price, 1 COIN costs 1,000,000 USDT.</p>
            <label htmlFor="coin-amount">Amount in USDT</label><div className="amount-box"><input ref={input} id="coin-amount" value={value} onChange={e => choose(e.target.value)} inputMode="decimal" autoComplete="off" aria-invalid={"error" in result} aria-describedby="amount-help"/><span>USDT</span></div>
            <p className="input-help" id="amount-help" role={"error" in result ? "alert" : undefined}>{"error" in result ? result.error : "Up to 6 decimal places"}</p>
            <div className="presets" aria-label="Example amounts">{[["10","10"],["50","50"],["100","100"],["500","500"],["1,000","1000"]].map(([label, amount]) => <button key={label} onClick={() => choose(amount)} aria-pressed={value === amount}>{label}</button>)}</div>
            <div className="result"><span>That would buy</span><strong>{"error" in result ? "—" : `${result.coin} COIN`}</strong><small>{"error" in result ? "" : `${result.percent} of the planned supply`}</small></div>
            {saleConfig ? <CoinCheckout config={saleConfig} value={value} /> : <p className="sale-availability">The sale contract and inventory have not been published. This is a calculation, not a purchase.</p>}
            <button className="copy-button" onClick={copy} disabled={"error" in result}>Copy calculation <span>↗</span></button><p className="copy-feedback" aria-live="polite">{copied}</p>
          </div></div>
        <div className="details-section" id="details"><div><p className="eyebrow">BEFORE LAUNCH</p><h2>Before you<br/>take a share.</h2><p>The price is a proposal for the initial sale. It does not tell you what someone might pay for COIN later.</p></div>
          <div className="launch"><dl>{[["Planned supply","1 COIN"],["Proposed sale price","1 COIN = 1,000,000 USDT"],["Full supply at that price","1,000,000 USDT"],["COIN contract","To be published"],["Sale contract","To be published"],["Sale inventory","Not funded"],["Trading","Not live"]].map(([key,val]) => <div key={key}><dt>{key}</dt><dd>{val}</dd></div>)}</dl><p className="launch-note">Contract addresses, allocation, team shares and liquidity terms are to be published before trading.</p><details><summary>What would I own?</summary><p>A fraction of the COIN token. It would not give you rights to the company, its revenue or the domain.</p></details><details><summary>Is 1,000,000 USDT a market value?</summary><p>No. It is the proposed price of the whole supply, not a market capitalization or a resale quote.</p></details><details><summary>Will I be able to sell?</summary><p>A primary sale would not create a secondary market or a buyback obligation.</p></details></div>
        </div>
        <footer className="coin-footer"><Link className="coin-brand" href="/"><Mark/><span>Coin.im</span></Link><span>Pre-launch</span><a href="/blog">Research ↗</a><a href="mailto:8@111.bz?subject=coin.im%20domain%20purchase%20inquiry">Domain for sale · $70,000 ↗</a><a href="mailto:8@111.bz">8@111.bz</a></footer>
      </div></section>
    </main>
  </div>;
}
