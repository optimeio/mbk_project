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
import CriticalTheme from '@/components/common/CriticalTheme';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const CDN_URL = 'https://res.cloudinary.com';

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

// JSON-LD structured data for SEO
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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className} data-scroll-behavior="smooth">
      <head>
        {/* DNS Prefetch + Preconnect for external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="" />
        <link rel="preconnect" href={CDN_URL} crossOrigin="" />
        <link rel="dns-prefetch" href={CDN_URL} />
        {API_URL && <link rel="preconnect" href={API_URL} crossOrigin="" />}
        {API_URL && <link rel="dns-prefetch" href={API_URL} />}

        {/* Removed explicit preload for the logo because Next's Image loader
          uses transformed URLs (/_next/image) and the preload wasn't being
          consumed, triggering a browser warning. If needed, preload the
          exact transformed URL or let the browser fetch the favicon/icon.
        */}

        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <meta name="theme-color" content="#0c2438" />
        <link rel="icon" type="image/png" sizes="64x64" href="/logos/mbkz-64.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/logos/mbkz-180.png" />

        {/* Structured data for search engines */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="text-fluid-body antialiased">
        <CriticalTheme />
        <StripInjectedAttrs />
        <Suspense fallback={null}>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
