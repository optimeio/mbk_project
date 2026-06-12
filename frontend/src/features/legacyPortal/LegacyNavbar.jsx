"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

function LegacyNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.getElementById('navbar');
      if (window.scrollY > 60) {
        navbar?.classList.add('scrolled');
      } else {
        navbar?.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMenu = () => {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    hamburger?.classList.remove('active');
    mobileNav?.classList.remove('active');
    document.body.style.overflow = '';
  };

  const toggleMenu = () => {
    const hamburger = document.getElementById('hamburger');
    const mobileNav = document.getElementById('mobile-nav');
    hamburger?.classList.toggle('active');
    mobileNav?.classList.toggle('active');
    document.body.style.overflow = mobileNav?.classList.contains('active') ? 'hidden' : '';
  };

  const handleNavClick = (event, targetId) => {
    event.preventDefault();
    closeMenu();

    const scrollToTarget = () => {
      if (targetId === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    if (pathname !== '/') {
      router.push('/');
      window.setTimeout(scrollToTarget, 180);
      return;
    }

    scrollToTarget();
  };

  return (
    <>
      <nav id="navbar">
        <div className="container nav-content">
          <Link href="/" className="logo" onClick={(event) => handleNavClick(event, 'home')}>
            <img src="/training.png" alt="MBK Logo" className="logo-img" />
            <div className="logo-text">
              <span>MBK TECHNOLOGY</span>
              <div className="tagline">Skills to Success</div>
            </div>
          </Link>

          <div className="nav-links">
            <Link href="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
            <Link href="/courses" className={pathname === '/courses' ? 'active' : ''}>Courses</Link>
            <Link href="/services" className={pathname === '/services' ? 'active' : ''}>Services</Link>
            <Link href="/about" className={pathname === '/about' ? 'active' : ''}>About</Link>
            <Link href="/contact" className={pathname === '/contact' ? 'active' : ''}>Contact</Link>
            <Link href="/lms" className="nav-btn">LMS Login</Link>
          </div>

          <button className="hamburger" id="hamburger" aria-label="Menu" type="button" onClick={toggleMenu}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </nav>

      <div className="mobile-nav" id="mobile-nav">
        <Link href="/" onClick={closeMenu}>Home</Link>
        <Link href="/courses" onClick={closeMenu}>Courses</Link>
        <Link href="/services" onClick={closeMenu}>Services</Link>
        <Link href="/about" onClick={closeMenu}>About</Link>
        <Link href="/contact" onClick={closeMenu}>Contact</Link>
        <Link href="/lms" className="nav-btn" onClick={closeMenu} style={{ marginTop: '20px' }}>LMS Login</Link>
      </div>
    </>
  );
}

export default LegacyNavbar;
