import Link from "next/link";

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
        <Link className="wordmark" href="/" aria-label="coin.im home">
          coin.im
        </Link>
        <nav aria-label="Main navigation">
          <Link href="/">Trade planner</Link>
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
          coin.im
        </Link>
        <p>
          Plan the position. Read the evidence. Keep the final decision yours.
        </p>
      </div>
    </footer>
  );
}
