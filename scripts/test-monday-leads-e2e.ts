/**
 * E2E: create test lead on real Monday board, verify update path, delete item.
 *
 * Usage: npx tsx scripts/test-monday-leads-e2e.ts
 */

import { readFileSync } from 'fs';
import { upsertLeadWithMondaySync } from '../lib/crm/leads_service';
import {
  deleteMondayItem,
  findMondayItemIdByEmail,
  updateMondayItemColumns,
  VALUBOT_MONDAY_COLUMNS,
} from '../lib/crm/valubot_monday_sync';

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
      // ignore missing file
    }
  }
}

const TEST_EMAIL = `e2e+${Date.now()}@valubot-test.invalid`;
const TEST_NAME = 'בדיקה - למחיקה';

async function main(): Promise<void> {
  loadEnv();

  if (!process.env.MONDAY_API_KEY?.trim()) {
    console.error('MONDAY_API_KEY missing — set in .env.local');
    process.exit(1);
  }

  process.env.MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID || '18393484200';

  console.log('1) Create test lead…');
  const created = await upsertLeadWithMondaySync({
    event: 'wizard_step1',
    sessionId: `e2e_${Date.now()}`,
    fullName: TEST_NAME,
    companyName: 'חברת בדיקה',
    userEmail: TEST_EMAIL,
    userPhone: '0501234567',
    nationalId: '123456782',
    source: 'organic',
  });

  const itemId = created.mondayItemId;
  if (!itemId) {
    throw new Error(`Create failed: ${created.mondayError ?? 'no item id'}`);
  }
  console.log('   itemId:', itemId, 'synced:', created.mondaySynced);

  console.log('2) Update stage → השלים אשף + valuation…');
  const updated = await upsertLeadWithMondaySync({
    event: 'wizard_completed',
    sessionId: created.lead.sessionId,
    leadId: created.lead.id,
    valuationMidpoint: 1_500_000,
    qualityScore: 85,
    sectorLabel: 'הייטק / תוכנה ו-SaaS',
  });
  console.log('   sync:', updated.mondaySynced, 'stage:', updated.lead.processStage);

  console.log('3) Dedupe check by email…');
  const found = await findMondayItemIdByEmail(TEST_EMAIL);
  if (found !== itemId) {
    throw new Error(`Dedupe mismatch: expected ${itemId}, got ${found}`);
  }
  console.log('   dedupe ok:', found);

  console.log('4) Direct column patch (PDF stage)…');
  await updateMondayItemColumns(itemId, {
    [VALUBOT_MONDAY_COLUMNS.processStage]: { label: 'הוריד PDF' },
  });
  console.log('   stage patched');

  console.log('5) Delete test item…');
  await deleteMondayItem(itemId);
  console.log('   deleted');

  console.log('\nE2E passed.');
}

main().catch((err) => {
  console.error('E2E failed:', err);
  process.exit(1);
});
