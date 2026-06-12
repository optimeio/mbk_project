"use client";

import { useEffect } from 'react';
import Icon from '@/components/common/Icon';
import LegacyNavbar from './LegacyNavbar';
import LegacyFooter from './LegacyFooter';
import LegacyChatWidget from './LegacyChatWidget';

const LEGACY_PORTAL_STYLE_ID = 'mbk-legacy-portal-style';
const LEGACY_PORTAL_STYLE_HREF = '/legacy-portal.css';
const LEGACY_PORTAL_ACTIVE_CLASS = 'legacy-portal-active';

function useLegacyPortalStyle() {
  useEffect(() => {
    let link = document.getElementById(LEGACY_PORTAL_STYLE_ID);
    const counterKey = '__mbkLegacyPortalStyleUsers';
    const bodySnapshotKey = '__mbkLegacyPortalBodySnapshot';
    const currentUsers = Number(window[counterKey] || 0);
    window[counterKey] = currentUsers + 1;

    if (currentUsers === 0) {
      window[bodySnapshotKey] = {
        bodyBackgroundColor: document.body.style.backgroundColor,
        bodyColor: document.body.style.color,
        bodyFontFamily: document.body.style.fontFamily,
        bodyOverflowX: document.body.style.overflowX,
      };
      document.body.classList.add(LEGACY_PORTAL_ACTIVE_CLASS);
      document.documentElement.classList.add(LEGACY_PORTAL_ACTIVE_CLASS);
      document.body.style.backgroundColor = '#03030a';
      document.body.style.color = '#f8fafc';
      document.body.style.fontFamily = "'Manrope', 'Inter', system-ui, -apple-system, sans-serif";
      document.body.style.overflowX = 'hidden';
    }

    if (!link) {
      link = document.createElement('link');
      link.id = LEGACY_PORTAL_STYLE_ID;
      link.rel = 'stylesheet';
      link.href = LEGACY_PORTAL_STYLE_HREF;
      document.head.appendChild(link);
    }

    return () => {
      const nextUsers = Math.max(0, Number(window[counterKey] || 1) - 1);
      window[counterKey] = nextUsers;
      if (nextUsers === 0) {
        const snapshot = window[bodySnapshotKey] || {};
        document.body.classList.remove(LEGACY_PORTAL_ACTIVE_CLASS);
        document.documentElement.classList.remove(LEGACY_PORTAL_ACTIVE_CLASS);
        document.body.style.backgroundColor = snapshot.bodyBackgroundColor || '';
        document.body.style.color = snapshot.bodyColor || '';
        document.body.style.fontFamily = snapshot.bodyFontFamily || '';
        document.body.style.overflowX = snapshot.bodyOverflowX || '';
        link?.remove();
      }
    };
  }, []);
}

function useScrollTopButton(enabled) {
  useEffect(() => {
    if (!enabled) return;

    const scrollTopBtn = document.getElementById('scrollTop');
    if (!scrollTopBtn) return;

    const handleScroll = () => {
      if (window.scrollY > 400) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    };

    const handleClick = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('scroll', handleScroll);
    scrollTopBtn.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      scrollTopBtn.removeEventListener('click', handleClick);
    };
  }, [enabled]);
}

function useCursorGlow() {
  useEffect(() => {
    const glow = document.getElementById('cursor-glow');
    if (!glow) return;

    const handleMove = (event) => {
      glow.style.transform = `translate(${event.clientX - 160}px, ${event.clientY - 160}px)`;
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);
}

function useMagneticButtons() {
  useEffect(() => {
    const handleMouseMove = (event) => {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translateY(-3px) translate(${x * 0.12}px, ${y * 0.12}px)`;
    };

    const handleMouseLeave = (event) => {
      event.currentTarget.style.transform = '';
    };

    const buttons = document.querySelectorAll('.cta-btn, .nav-btn');
    buttons.forEach((button) => {
      button.addEventListener('mousemove', handleMouseMove);
      button.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      buttons.forEach((button) => {
        button.removeEventListener('mousemove', handleMouseMove);
        button.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);
}

export default function LegacyPortalShell({
  children,
  showNavbar = true,
  showFooter = true,
  showChatWidget = true,
  showScrollTop = true,
}) {
  useLegacyPortalStyle();
  useScrollTopButton(showScrollTop);
  useCursorGlow();
  useMagneticButtons();

  return (
    <div data-legacy-portal-shell="true" style={{ backgroundColor: '#03030a', color: '#f8fafc', minHeight: '100vh' }}>
      <div
        id="cursor-glow"
        style={{
          position: 'fixed',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle,rgba(249,115,22,0.07) 0%,transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'transform 0.08s linear',
        }}
      />

      {showNavbar ? <LegacyNavbar /> : null}
      {children}
      {showFooter ? <LegacyFooter /> : null}
      {showChatWidget ? <LegacyChatWidget /> : null}

      {showScrollTop ? (
        <button id="scrollTop" aria-label="Scroll to top" type="button">
          <Icon name="chevron-up" style={{ width: '20px', height: '20px' }} />
        </button>
      ) : null}
    </div>
  );
}
