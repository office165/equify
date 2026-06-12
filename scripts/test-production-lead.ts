/**
 * Production lead-sync smoke test.
 *
 * Usage:
 *   PRODUCTION_URL=https://valubot-six.vercel.app \
 *   MONDAY_API_KEY=... MONDAY_BOARD_ID=18393484200 \
 *   npx tsx scripts/test-production-lead.ts
 */

import { readFileSync } from 'fs';
import {
  deleteMondayItem,
  findMondayItemIdByEmail,
  getMondayItemDetails,
  mondayItemUrl,
} from '../lib/crm/valubot_monday_sync';

const PRODUCTION_URL =
  process.env.PRODUCTION_URL?.replace(/\/$/, '') || 'https://valubot-six.vercel.app';

function loadEnv(): void {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^([^#=]+)=(.*)$/);
        if (!m) continue;
        const key = m[1].trim();
        if (!process.env[key]) {
          process.env[key] = m[2].trim().replace(/^["']|["']$/g, '');
        }
      }
    } catch {
      // ignore
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  loadEnv();

  console.log('=== GATE 1: Production health ===');
  const healthRes = await fetch(`${PRODUCTION_URL}/api/leads/health`);
  const health = (await healthRes.json()) as Record<string, unknown>;
  console.log(JSON.stringify(health, null, 2));

  const config = health.config as Record<string, unknown> | undefined;
  if (!config?.mondayKeyPresent) {
    console.error('FAIL: MONDAY_API_KEY not present in production env');
    process.exit(1);
  }

  const testEmail = `prod-e2e+${Date.now()}@smallbizclub.test`;
  const sessionId = `prod_${Date.now()}`;

  console.log('\n=== GATE 2: POST production /api/leads ===');
  const postRes = await fetch(`${PRODUCTION_URL}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'wizard_step1',
      sessionId,
      fullName: 'בדיקה — למחיקה',
      companyName: 'חברת בדיקה Production',
      userEmail: testEmail,
      userPhone: '0501234567',
      nationalId: '328626639',
      source: 'organic',
      sectorLabel: 'הייטק / תוכנה ו-SaaS',
      locale: 'he',
    }),
  });
  const postBody = await postRes.json();
  console.log('POST status:', postRes.status);
  console.log(JSON.stringify(postBody, null, 2));

  if (!postRes.ok && !postBody.mondayQueued) {
    process.exit(1);
  }

  console.log('\n=== GATE 3: Poll Monday board ===');
  if (!process.env.MONDAY_API_KEY?.trim()) {
    console.warn('MONDAY_API_KEY not set locally — skipping board verification');
    return;
  }

  let itemId: string | null = null;
  for (let i = 0; i < 30; i += 1) {
    itemId = await findMondayItemIdByEmail(testEmail);
    if (itemId) break;
    await sleep(2000);
  }

  if (!itemId) {
    console.error('FAIL: Item not found on Monday board after 60s');
    const healthAfter = await fetch(`${PRODUCTION_URL}/api/leads/health`).then((r) => r.json());
    console.log('Health after failure:', JSON.stringify(healthAfter, null, 2));
    process.exit(1);
  }

  const details = await getMondayItemDetails(itemId);
  const url = mondayItemUrl(itemId);
  console.log('Item URL:', url);
  console.log('Group:', details.groupTitle);
  console.log('Item name:', details.name);

  console.log('\n=== GATE 4: Cleanup ===');
  await deleteMondayItem(itemId);
  console.log('Deleted test item', itemId);

  console.log('\n✅ Production lead test PASSED');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
