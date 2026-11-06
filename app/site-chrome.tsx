import Link from "next/link";
import Image from "next/image";

export function DomainSaleBanner() {
  return (
    <a
      className="domain-sale-banner"
      href="mailto:8@111.bz?subject=coin.im%20domain%20purchase%20inquiry"
      aria-label="This domain is for sale for $70,000. Contact the owner."
    >
      <span>Domain for sale</span>
      <strong>$70,000</strong>
    </a>
  );
}

export function HeaderActions() {
  return (
    <div className="header-actions">
      <a className="header-contact" href="mailto:8@111.bz">
        8@111.bz
      </a>
      <DomainSaleBanner />
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="wordmark" href="/" aria-label="Coin.im home">
          <Image src="/coin-logo.svg" width="36" height="36" alt="" /> Coin.im
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/blog">Research</Link>
        </nav>
        <HeaderActions />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-inner">
        <Link className="wordmark" href="/">
          <Image src="/coin-logo.svg" width="36" height="36" alt="" /> Coin.im
        </Link>
        <p>
          One coin, divided into fractions.
        </p>
      </div>
    </footer>
  );
}
