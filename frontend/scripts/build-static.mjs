import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const outDir = path.resolve(frontendDir, 'out');

console.log('🚀 Building physical static files for public_html (no zip)...');

execSync('npx next build', {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_EXPORT: 'true',
  },
});

if (!fs.existsSync(outDir)) {
  console.error('❌ Error: frontend/out directory was not generated.');
  process.exit(1);
}

console.log(`\n✅ Build Complete! Physical files and folders are ready in:`);
console.log(`📁 ${outDir}`);
console.log(`\n📋 You can now upload all files and folders inside 'frontend/out/' directly into 'public_html'.`);
