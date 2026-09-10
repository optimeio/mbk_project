import bundleAnalyzer from '@next/bundle-analyzer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const readRootEnvValue = (key) => {
  try {
    const envPath = path.resolve(__dirname, '../.env');
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'));
    return match?.[1]?.trim().replace(/^["']|["']$/g, '') || '';
  } catch {
    return '';
  }
};

const rootBackendPort = readRootEnvValue('BACKEND_PORT') || readRootEnvValue('PORT') || '5005';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const defaultLocalApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_ORIGIN ||
  `http://localhost:${rootBackendPort}`;
const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_ORIGIN || "").trim();
const cleanBaseUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, "").replace(/\/api\/?$/i, "") : "";
const devApiOrigin = cleanBaseUrl || defaultLocalApiUrl.replace(/\/api\/?$/i, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Static export for Hostinger deployment (generates out/ directory during production build)
  // NOTE: Do NOT use NODE_ENV here — .env sets NODE_ENV=production for the backend,
  // which bleeds into next dev config and activates export mode, breaking the dev server.
  // Use NEXT_EXPORT=true explicitly when building for static deployment.
  output: process.env.NEXT_EXPORT === 'true' ? 'export' : undefined,

  // Trailing slashes ensure /login/ → /login/index.html on Hostinger
  trailingSlash: true,

  // Image optimization disabled for static export (no Next.js server)
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**.cloudinary.com' },
      { protocol: 'https', hostname: '**.mbktechnologies.info' },
    ],
  },

  // Strip console.log in production (reduces bundle size + prevents leaks)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  // Enable gzip/brotli response compression
  compress: true,
  // Remove X-Powered-By fingerprinting header
  poweredByHeader: false,
  reactStrictMode: true,
  // Don't ship source maps to production (reduces bundle & hides source code)
  productionBrowserSourceMaps: false,

  transpilePackages: ['@heroicons/react'],

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@heroicons/react/24/outline',
      '@heroicons/react/24/solid',
      '@heroicons/react/20/solid',
      'date-fns',
      'antd',
      '@ant-design/icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-popover',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
    ],
  },

  // Note: outputFileTracingRoot removed — not applicable for static export

  // Development API rewrites (proxies /api requests to backend server)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${devApiOrigin}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${devApiOrigin}/uploads/:path*`,
      },
    ];
  },

  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? "https://mbk-project-spf5.onrender.com" : devApiOrigin),
    NEXT_PUBLIC_API_TIMEOUT_MS:
      process.env.NEXT_PUBLIC_API_TIMEOUT_MS || "45000",
  },
};

export default withBundleAnalyzer(nextConfig);
