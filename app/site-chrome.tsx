import Link from "next/link";

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
          <a className="header-contact" href="mailto:8@111.bz">
            8@111.bz
          </a>
        </nav>
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
