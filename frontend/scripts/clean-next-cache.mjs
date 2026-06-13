import fs from 'node:fs';
import path from 'node:path';

const nextDir = path.join(process.cwd(), '.next');

if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log('[dev] Removed .next build cache.');
} else {
  console.log('[dev] No .next cache to remove.');
}
