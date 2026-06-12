#!/usr/bin/env node
/**
 * Ensures SUPABASE_POOLER_REGION=eu-central-1 exists in .env.local and .env.example
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const KEY = 'SUPABASE_POOLER_REGION';
const VALUE = 'eu-central-1';
const LINE = `${KEY}="${VALUE}"`;

function upsertEnvFile(filePath) {
  const abs = path.join(ROOT, filePath);
  if (!fs.existsSync(abs)) {
    fs.writeFileSync(abs, `${LINE}\n`, 'utf8');
    console.log(`Created ${filePath}`);
    return;
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const pattern = new RegExp(`^${KEY}=.*$`, 'm');
  if (pattern.test(raw)) {
    const next = raw.replace(pattern, LINE);
    fs.writeFileSync(abs, next, 'utf8');
    console.log(`Updated ${filePath}`);
  } else {
    const suffix = raw.endsWith('\n') ? '' : '\n';
    fs.writeFileSync(abs, `${raw}${suffix}${LINE}\n`, 'utf8');
    console.log(`Appended to ${filePath}`);
  }
}

upsertEnvFile('.env.local');
upsertEnvFile('.env.example');
console.log(`Done — ${KEY}=${VALUE}`);
