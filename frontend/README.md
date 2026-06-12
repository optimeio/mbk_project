# M-Client (Next.js)

## Development

1. Install dependencies:
   - `npm install`
2. Start the app:
   - `npm run dev`
3. Open:
   - `http://localhost:3000`

## API Configuration

- Local development (recommended): keep `NEXT_PUBLIC_API_URL` empty and use Next.js rewrites to proxy:
  - `/api/* -> http://127.0.0.1:5000/api/*`
  - `/uploads/* -> http://127.0.0.1:5000/uploads/*`
- Production:
  - Docker same-origin deployment (recommended for subdomains): keep `NEXT_PUBLIC_API_URL` empty and set `API_ORIGIN=http://M-server:5000` during the client image build.
  - Cross-origin deployment: set `NEXT_PUBLIC_API_URL=https://your-domain.tld/api` (or `https://your-domain.tld`) and make sure backend `CORS_ALLOWED_ORIGINS` includes every frontend origin, for example `https://*.your-domain.tld`.

## Scripts

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run lint checks

# MBKCARRIERZ-CLIENT
