/**
 * E2E: push a test lead through POST /api/leads (real server path),
 * verify on Monday board, then delete.
 *
 * Usage:
 *   MONDAY_API_KEY=... MONDAY_BOARD_ID=18393484200 npx tsx scripts/test-monday-lead.ts
 */

import { readFileSync } from 'fs';
import { POST } from '../app/api/leads/route';
import {
  deleteMondayItem,
  findMondayItemIdByEmail,
  getMondayItemDetails,
  mondayItemUrl,
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
      // ignore
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const TEST_EMAIL = `valubot-e2e+${Date.now()}@smallbizclub.test`;
const TEST_NAME = 'בדיקה — למחיקה';
const TEST_COMPANY = 'חברת בדיקה Equify';
const TEST_PHONE = '0501234567';
const TEST_NATIONAL_ID = '328626639';

async function postLead(body: Record<string, unknown>) {
  const request = new Request('http://localhost/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const response = await POST(request);
  const json = (await response.json()) as {
    ok: boolean;
    lead?: { id: string; sessionId: string };
    error?: string;
  };
  if (!response.ok || !json.ok || !json.lead) {
    throw new Error(`API /api/leads failed: ${json.error ?? response.status}`);
  }
  return json.lead;
}

async function waitForMondayItem(email: string, timeoutMs = 45000): Promise<string> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const itemId = await findMondayItemIdByEmail(email);
    if (itemId) return itemId;
    await sleep(1500);
  }
  throw new Error(`Timed out waiting for Monday item for ${email}`);
}

function assertColumnPopulated(
  columns: { id: string; text: string }[],
  columnId: string,
  label: string,
): void {
  const col = columns.find((c) => c.id === columnId);
  if (!col?.text?.trim()) {
    throw new Error(`Column "${label}" (${columnId}) is empty. Got: ${JSON.stringify(col)}`);
  }
  console.log(`   ✓ ${label}: ${col.text}`);
}

async function main(): Promise<void> {
  loadEnv();

  if (!process.env.MONDAY_API_KEY?.trim()) {
    console.error('MONDAY_API_KEY missing');
    process.exit(1);
  }
  process.env.MONDAY_BOARD_ID = process.env.MONDAY_BOARD_ID || '18393484200';

  const sessionId = `e2e_${Date.now()}`;
  const c = VALUBOT_MONDAY_COLUMNS;

  console.log('1) POST /api/leads — wizard_step1…');
  const step1Lead = await postLead({
    event: 'wizard_step1',
    sessionId,
    fullName: TEST_NAME,
    companyName: TEST_COMPANY,
    userEmail: TEST_EMAIL,
    userPhone: TEST_PHONE,
    nationalId: TEST_NATIONAL_ID,
    source: 'organic',
    industryCode: 'saas',
    sectorLabel: 'הייטק / תוכנה ו-SaaS',
    locale: 'he',
  });
  console.log('   leadId:', step1Lead.id);

  console.log('2) Poll Monday board (background sync from API)…');
  const itemId = await waitForMondayItem(TEST_EMAIL);
  console.log('   itemId:', itemId);

  console.log('3) Verify item on board…');
  let details = await getMondayItemDetails(itemId);
  if (details.groupTitle !== 'EQUIFY LEADS VALUEBOT') {
    throw new Error(`Wrong group: ${details.groupTitle}`);
  }
  if (details.name !== TEST_COMPANY) {
    throw new Error(`Item title expected "${TEST_COMPANY}", got "${details.name}"`);
  }
  console.log('   group:', details.groupTitle);
  console.log('   item name:', details.name);
  assertColumnPopulated(details.columnValues, c.customerName, 'שם הלקוח');
  assertColumnPopulated(details.columnValues, c.phone, 'טלפון');
  assertColumnPopulated(details.columnValues, c.email, 'אימייל');
  assertColumnPopulated(details.columnValues, c.nationalId, 'תז / חפ');
  assertColumnPopulated(details.columnValues, c.leadStatus, 'סטטוס ליד');
  assertColumnPopulated(details.columnValues, c.processStage, 'שלב בתהליך');
  assertColumnPopulated(details.columnValues, c.leadSource, 'מקור ליד');

  console.log('4) POST /api/leads — wizard_completed…');
  await postLead({
    event: 'wizard_completed',
    sessionId,
    leadId: step1Lead.id,
    valuationPurpose: 'M&A_SALE',
    valuationMidpoint: 20_100_000,
    sectorLabel: 'הייטק / תוכנה ו-SaaS',
    locale: 'he',
  });

  await sleep(3000);
  details = await getMondayItemDetails(itemId);
  assertColumnPopulated(details.columnValues, c.needPurpose, 'מה הצורך?');
  assertColumnPopulated(details.columnValues, c.valuationMidpoint, 'שווי מוערך');

  const url = mondayItemUrl(itemId);
  console.log('\n✅ E2E PASSED');
  console.log('Item URL:', url);

  console.log('\n5) Delete test item…');
  await deleteMondayItem(itemId);
  const gone = await findMondayItemIdByEmail(TEST_EMAIL);
  if (gone) throw new Error('Item still exists after delete');
  console.log('   deleted');
}

main().catch((err) => {
  console.error('\n❌ E2E FAILED');
  console.error(err);
  process.exit(1);
});
