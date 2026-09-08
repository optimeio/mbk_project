"use client";

import Link from 'next/link';
import Icon from '@/components/common/Icon';

function LegacyFooter() {
  return (
    <footer id="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="logo">
              <img loading="lazy" src="/training.png" alt="MBK Logo" className="logo-img" style={{ height: '40px' }} />
              <div className="logo-text">
                <span>MBK TECHNOLOGY</span>
                <div className="tagline">Skills to Success</div>
              </div>
            </Link>
            <p>Premium Technical Training &amp; Skill Development in Salem, Tamil Nadu. Official trainer deployment partner for Naan Mudhalvan &amp; government initiatives.</p>
          </div>

          <div className="footer-links">
            <h4>Core Programs</h4>
            <ul>
              <li><Link href="/courses">Industry 4.0</Link></li>
              <li><Link href="/courses">EV Technology</Link></li>
              <li><Link href="/courses">AI &amp; Data Analytics</Link></li>
              <li><Link href="/courses">Smart Infrastructure</Link></li>
              <li><Link href="/services">Institutional Services</Link></li>
            </ul>
          </div>

          <div className="footer-links" id="contact-info">
            <h4>Contact Us</h4>
            <a href="https://maps.google.com/?q=MBK+Technology+Salem" target="_blank" rel="noopener noreferrer" className="footer-contact-item" style={{ textDecoration: 'none', color: 'inherit' }}><Icon name="map-pin" style={{ width: '16px', height: '16px' }} /><span>IInd Floor, OM Shiva Towers, 259-B, Advaitha Ashram Rd, Fairlands, Salem, Tamil Nadu - 636004, India</span></a>
            <a href="tel:+918807653965" className="footer-contact-item" style={{ textDecoration: 'none', color: 'inherit' }}><Icon name="phone" style={{ width: '16px', height: '16px' }} /><span>+91 88076 53965</span></a>
            <a href="mailto:mbktechnologies8@gmail.com" className="footer-contact-item" style={{ textDecoration: 'none', color: 'inherit' }}><Icon name="mail" style={{ width: '16px', height: '16px' }} /><span>mbktechnologies8@gmail.com</span></a>

            <h4 style={{ marginTop: '1.5rem', marginBottom: '0.8rem' }}>Follow Us</h4>
            <div className="social-links" style={{ display: 'flex', gap: '1rem' }}>
              <a href="https://instagram.com/mbktechnology" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }} aria-label="Instagram"><Icon name="instagram" /></a>
              <a href="https://facebook.com/mbktechnology" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)' }} aria-label="Facebook"><Icon name="facebook" /></a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 MBK Technology. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default LegacyFooter;
