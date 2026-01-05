#!/usr/bin/env node
import fs from 'fs';
import os from 'os';
import path from 'path';

const root = process.cwd();
const envPath = path.join(root, '.env');

const findLanIp = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const addresses = interfaces[name];
    if (!addresses) continue;
    for (const addr of addresses) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }
  return null;
};

const ip = findLanIp();
if (!ip) {
  console.error('[set-dev-ip] Unable to detect LAN IP address. Please set EXPO_PUBLIC_API_BASE_URL manually.');
  process.exit(1);
}

const content = `EXPO_PUBLIC_API_BASE_URL=http://${ip}:4000\n`;
fs.writeFileSync(envPath, content, 'utf8');
console.log(`[set-dev-ip] Wrote ${envPath}`);
console.log(`[set-dev-ip] API_BASE_URL=http://${ip}:4000`);
