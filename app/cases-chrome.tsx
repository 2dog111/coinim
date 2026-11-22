import Link from "next/link";

export function SaleNotice() {
  return (
    <div className="cx-notice">
      <p>
        The domain coin.im is for sale · <a href="mailto:8@111.bz?subject=coin.im%20domain%20purchase%20inquiry">8@111.bz</a>
        {" · "}
        <a href="https://t.me/simvim" rel="noopener noreferrer">Telegram @simvim</a>
      </p>
    </div>
  );
}

export function CasesHeader() {
  return (
    <header className="cx-header">
      <Link className="cx-wordmark" href="/">Coin.im</Link>
      <nav aria-label="Main navigation">
        <Link href="/">Cases</Link>
        <Link href="/blog">Crypto research</Link>
      </nav>
    </header>
  );
}

export function CasesFooter() {
  return (
    <footer className="cx-footer">
      <p>Coin.im · Corporate fraud, exposed.</p>
      <p>
        A short seller&apos;s report is an allegation by an investor who profits when the shares fall. Each case says what the report
        claims, what happened to the stock and what the company answered.
      </p>
      <p>
        Domain sale and contact: <a href="mailto:8@111.bz">8@111.bz</a> ·{" "}
        <a href="https://t.me/simvim" rel="noopener noreferrer">Telegram @simvim</a>
      </p>
    </footer>
  );
}
