import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const projectRootDir = path.resolve(frontendDir, '..');
const outDir = path.resolve(frontendDir, 'out');
const zipFile = path.resolve(projectRootDir, 'frontend-hostinger-deploy.zip');

console.log('🚀 Building static export for Hostinger...');

execSync('npx next build', {
  cwd: frontendDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_EXPORT: 'true'
  }
});

if (!fs.existsSync(outDir)) {
  console.error('❌ Error: frontend/out directory was not generated.');
  process.exit(1);
}

console.log(`\n📦 Creating deployment zip: ${zipFile}...`);
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

// Use PowerShell Compress-Archive on Windows
const psCommand = `powershell -Command "Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zipFile}' -Force"`;
execSync(psCommand, { stdio: 'inherit' });

const stats = fs.statSync(zipFile);
console.log(`\n✅ SUCCESS! Deployment package created:`);
console.log(`📁 File: ${zipFile}`);
console.log(`📊 Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`\n📋 HOW TO UPLOAD TO HOSTINGER:`);
console.log(`1. Open Hostinger File Manager -> Go inside 'public_html' folder.`);
console.log(`2. Click the Upload button (up arrow icon in top right).`);
console.log(`3. Select 'frontend-hostinger-deploy.zip'.`);
console.log(`4. Right-click the uploaded zip file inside public_html and click 'Extract'.`);
console.log(`5. That's it! Your frontend is live.`);
