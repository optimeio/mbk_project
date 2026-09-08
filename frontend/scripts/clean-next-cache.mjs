import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const nextDir = path.join(frontendDir, '.next');

if (fs.existsSync(nextDir)) {
  try {
    fs.rmSync(nextDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    console.log('[dev] Removed frontend/.next build cache.');
  } catch (err) {
    console.warn('[dev] Could not fully remove .next cache:', err.message);
  }
} else {
  console.log('[dev] No frontend/.next cache to remove.');
}
