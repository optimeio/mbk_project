import { Inter } from "next/font/google";
import '@/index.css';

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true,
});

import { Suspense } from 'react';
import Providers from './Providers';
import StripInjectedAttrs from './StripInjectedAttrs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const CDN_URL = 'https://res.cloudinary.com';

const CRITICAL_THEME_CSS = `
  :root {
    --radius: 0.625rem;
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --sidebar: oklch(0.985 0 0);
    --sidebar-primary: oklch(0.205 0 0);
    --sidebar-border: oklch(0.922 0 0);
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 210 40% 98%;
  }
  body {
    background-color: #f4f7f9;
    color: #0f172a;
  }
  aside[data-app-sidebar="true"] {
    display: none;
  }
  @media (min-width: 768px) {
    aside[data-app-sidebar="true"] {
      display: flex;
    }
  }
`;

export const metadata = {
  title: {
    default: 'MBK Carrierz | Professional Training & Placement Portal',
    template: '%s | MBK Carrierz'
  },
  description: 'Master Carrier Management System & Professional Skill Development Platform. Empowering trainers and students in Salem, Tamil Nadu.',
  keywords: ['MBK Technology', 'Skill Development', 'Trainer Onboarding', 'Career Guidance', 'Salem Training', 'Professional Courses'],
  authors: [{ name: 'MBK Technology Team' }],
  robots: { index: true, follow: true },
  alternates: {
    canonical: 'https://mbktechnologies.info',
  },
  openGraph: {
    title: 'MBK Carrierz - Skills to Success',
    description: 'Empowering future professionals through industry-aligned training and placement solutions.',
    url: 'https://mbktechnologies.info',
    siteName: 'MBK Carrierz',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MBK Carrierz',
    description: 'Empowering future professionals through industry-aligned training.',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'MBK Carrierz',
  url: 'https://mbktechnologies.info',
  description: 'Professional skill development and career placement platform for students and trainers.',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Salem',
    addressRegion: 'Tamil Nadu',
    addressCountry: 'IN',
  },
};

const runtimeBootstrapScript = `(function(){var k='mbk-chunk-reload';function isChunk(e){var m=String(e&&e.message||e||'');return String(e&&e.name||'')==='ChunkLoadError'||m.indexOf('ChunkLoadError')!==-1||m.indexOf('Failed to load chunk')!==-1;}function reloadOnce(){try{var last=Number(sessionStorage.getItem(k)||0);if(last&&Date.now()-last<15000){return false;}sessionStorage.setItem(k,String(Date.now()));window.location.reload();return true;}catch(_e){window.location.reload();return true;}}window.addEventListener('unhandledrejection',function(ev){if(isChunk(ev.reason)&&reloadOnce()){ev.preventDefault();}});window.addEventListener('error',function(ev){var reason=ev.error||ev.message;if(isChunk(reason)&&reloadOnce()){ev.preventDefault();}});})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href={CDN_URL} crossOrigin="" />
        <link rel="dns-prefetch" href={CDN_URL} />
        {API_URL && <link rel="preconnect" href={API_URL} crossOrigin="" />}
        {API_URL && <link rel="dns-prefetch" href={API_URL} />}

        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#0c2438" />
        <link rel="icon" type="image/png" sizes="64x64" href="/logos/mbkz-64.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/mbkz-180.png" />

        <style id="mbk-critical-theme" dangerouslySetInnerHTML={{ __html: CRITICAL_THEME_CSS }} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="text-fluid-body antialiased">
        <script dangerouslySetInnerHTML={{ __html: runtimeBootstrapScript }} />
        <StripInjectedAttrs />
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
