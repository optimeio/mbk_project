import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);

const listListeningPids = (port) => {
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr ":${port}"`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = new Set();
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes('LISTENING')) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts.at(-1);
        if (pid && /^\d+$/.test(pid) && pid !== '0') {
          pids.add(pid);
        }
      }
      return [...pids];
    } catch {
      return [];
    }
  }

  try {
    const output = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return output
      .split(/\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
};

const stopPid = (pid) => {
  if (process.platform === 'win32') {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    return;
  }
  execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
};

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');

const clearNextDevCache = () => {
  const nextDir = path.join(frontendDir, '.next');
  if (!fs.existsSync(nextDir)) {
    return;
  }

  try {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('[dev] Cleared stale frontend/.next cache.');
  } catch (error) {
    console.warn('[dev] Could not clear frontend/.next cache:', error.message);
  }
};

clearNextDevCache();

const pids = listListeningPids(PORT);
if (pids.length === 0) {
  console.log(`[dev] Port ${PORT} is free.`);
  process.exit(0);
}

for (const pid of pids) {
  console.log(`[dev] Stopping stale process on port ${PORT} (PID ${pid})...`);
  try {
    stopPid(pid);
  } catch (error) {
    console.warn(`[dev] Could not stop PID ${pid}:`, error.message);
  }
}

console.log(`[dev] Port ${PORT} cleared.`);
