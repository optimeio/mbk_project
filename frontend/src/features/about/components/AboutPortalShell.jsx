import Image from 'next/image';
import Link from 'next/link';
import styles from '../pages/AboutPage.module.css';

export default function AboutPortalShell({ children }) {
  return (
    <div className={styles.portalShell}>
      <header className={styles.portalHeader}>
        <Link className={styles.portalBrand} href="/" aria-label="MBK Carrierz home">
          <Image
            src="/mbk_tech_cyan.png"
            alt="MBK Carrierz"
            width={44}
            height={44}
            sizes="44px"
            className={styles.portalBrandLogo}
            priority
          />
          <span>MBK Carrierz</span>
        </Link>

        <nav className={styles.portalNav} aria-label="About page navigation">
          <Link href="/">Home</Link>
          <Link href="/about#courses">Courses</Link>
          <Link href="/about" aria-current="page">About</Link>
          <Link href="/#footer-section">Contact</Link>
          <Link href="/?login=true">Portal Login</Link>
        </nav>
      </header>

      {children}

      <footer className={styles.portalFooter}>
        <div>
          <strong>MBK Carrierz</strong>
          <span>Courses, trainer operations, documentation, and dashboard-backed delivery for institutions.</span>
        </div>
        <Link href="/?login=true">Open Portal</Link>
      </footer>
    </div>
  );
}
