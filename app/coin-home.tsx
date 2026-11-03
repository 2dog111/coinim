"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import "./coin-home.css";

const SCALE = 10n ** 18n;
function fraction(value: string): { amount: string; percent: string } | { error: string } {
  if (!value.trim()) return { error: "Enter a COIN amount." };
  if (!/^\d+(\.\d*)?$/.test(value)) return { error: "Enter a non-negative decimal amount." };
  const [whole, decimals = ""] = value.split(".");
  if (decimals.length > 18) return { error: "Use at most 18 decimal places." };
  const units = BigInt(whole) * SCALE + BigInt((decimals + "0".repeat(18)).slice(0, 18));
  if (units > SCALE) return { error: "The amount cannot exceed 1 COIN." };
  const percentUnits = units * 100n;
  const percent = `${percentUnits / SCALE}.${(percentUnits % SCALE).toString().padStart(18, "0")}`.replace(/\.?0+$/, "");
  const amount = `${BigInt(whole)}${decimals ? `.${decimals}` : ""}`;
  return { amount, percent: percent || "0" };
}

export default function CoinHome() {
  const [value, setValue] = useState("0.0001");
  const [copied, setCopied] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const result = fraction(value);
  function choose(amount: string) { setValue(amount); setCopied(""); }
  async function copy() {
    if ("error" in result) return;
    try { await navigator.clipboard.writeText(`${result.amount} COIN = ${result.percent}% of the planned supply`); setCopied("Copied to clipboard."); }
    catch { setCopied("Could not copy. Please select and copy the values."); }
  }
  return <div className="coin-page">
    <header className="coin-header"><div className="coin-header-inner">
      <Link className="coin-brand" href="/" aria-label="COIN home"><Image src="/coin-mark.png" alt="" width={36} height={36}/><span>COIN</span></Link>
      <span className="coin-status"><i/> PRE-LAUNCH</span>
      <nav aria-label="Main navigation"><a href="#how">How it works</a><button onClick={() => input.current?.focus()}>Explore fractions <span>↗</span></button></nav>
      <div className="coin-contact"><a href="mailto:8@111.bz?subject=coin.im%20domain%20purchase%20inquiry">Domain for sale <strong>$70,000</strong></a><a href="mailto:8@111.bz">8@111.bz</a></div>
    </div></header>
    <main>
      <section className="coin-section coin-first" aria-labelledby="hero-title"><div className="coin-wrap">
        <div className="coin-grid"><div className="coin-intro"><p className="coin-eyebrow"><span>01 / THE IDEA</span><span>ONE WHOLE, SHARED</span></p>
          <h1 id="hero-title">One coin.<br/><em>Own a fraction.</em></h1>
          <p className="coin-lede">The plan: one COIN in total, divided among its holders. Explore a fraction and see your share of the whole.</p>
          <div className="coin-hero-art"><Image src="/coin-hero.webp" alt="A single silver coin with a small cobalt fragment" width={900} height={600} priority/><span className="art-label art-label-one">1 COIN <b>= 100%</b></span><span className="art-label art-label-fraction">↗ Your fraction</span></div>
          <div className="coin-facts"><span>Planned total supply <strong>1 COIN</strong></span><span>Fractions as small as <strong>0.0000000001 COIN</strong></span></div>
        </div>
        <div className="explorer" id="explorer"><div className="explorer-top"><div><p className="coin-eyebrow">A CLOSER LOOK</p><h2>Fraction explorer</h2></div><span className="explorer-index">01 / 01</span></div>
          <p className="explorer-desc">See how much of the whole a fraction represents.</p>
          <label htmlFor="coin-amount">COIN amount</label><div className="amount-box"><input ref={input} id="coin-amount" value={value} onChange={e => choose(e.target.value)} inputMode="decimal" autoComplete="off" aria-invalid={"error" in result} aria-describedby="amount-help"/><span>COIN</span></div>
          <p className="input-help" id="amount-help" role={"error" in result ? "alert" : undefined}>{"error" in result ? result.error : "Up to 18 decimal places"}</p>
          <div className="presets" aria-label="Example fractions"><span>TRY A SHARE</span>{[["1%","0.01"],["0.1%","0.001"],["0.01%","0.0001"]].map(([label, amount]) => <button key={label} onClick={() => choose(amount)} aria-pressed={value === amount}>{label}</button>)}</div>
          <div className="result"><span>Share of total supply</span><strong>{"error" in result ? "—" : `${result.percent}%`}</strong><small>of the planned supply</small></div>
          <button className="tiny-fraction" onClick={() => choose("0.0000000001")}>Try 0.0000000001 COIN <span>↗</span></button>
          <button className="copy-button" onClick={copy} disabled={"error" in result}>Copy fraction <span>↗</span></button><p className="copy-feedback" aria-live="polite">{copied || "Explore proportions. Trading has not launched."}</p>
        </div></div>
      </div></section>
      <section className="coin-section coin-second" id="how" aria-labelledby="how-title"><div className="coin-wrap"><div className="second-heading"><div><p className="coin-eyebrow">02 / HOW IT WORKS</p><h2 id="how-title">One whole. Many fractions.</h2></div><p>Every fraction is part of the same COIN. Dividing it does not create more coins.</p></div>
        <div className="coin-grid second-grid"><div className="how-left"><div className="distribution-art"><Image src="/coin-distribution.webp" alt="Complementary fragments of a single silver disc" width={900} height={500} loading="lazy"/></div><div className="flow"><strong>1 COIN</strong><span>→</span><strong>Fractions</strong><span>→</span><strong>Holders</strong></div><div className="selection"><span>Your selected fraction</span><strong>{"error" in result ? "Enter a valid amount" : `${result.amount} COIN`}</strong><small>{"error" in result ? "" : `${result.percent}% of the planned supply`}</small></div></div>
          <div className="launch"><div className="launch-head"><h3>Launch details</h3><span>PRE-LAUNCH</span></div><dl>{[["Planned supply","1 COIN"],["Planned precision","18 decimal places"],["Contract","To be published"],["Initial allocation","To be published"],["Trading","Not live"]].map(([key,val]) => <div key={key}><dt>{key}</dt><dd>{val}</dd></div>)}</dl><p className="launch-note">Contract, allocation, team shares and liquidity terms are to be published before trading.</p><details><summary>What would I own?</summary><p>A fraction of the COIN token. This model does not promise rights to the company, its revenue or the domain.</p></details><details><summary>Why only one?</summary><p>A supply of one makes each share of the whole easy to understand. The unit of supply does not guarantee value or price growth.</p></details></div>
        </div><footer className="coin-footer"><strong>COIN<span>.</span></strong><span>coin.im · PRE-LAUNCH</span><a href="/blog">Research ↗</a><a href="mailto:8@111.bz">8@111.bz</a></footer>
      </div></section>
    </main>
  </div>;
}
