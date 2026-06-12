/**
 * Live Monday.com board schema introspection.
 *
 * Usage:
 *   MONDAY_API_KEY=... MONDAY_BOARD_ID=18393484200 npx tsx scripts/monday-introspect.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const MONDAY_API_URL = 'https://api.monday.com/v2';
const MONDAY_API_VERSION = '2023-10';
const DEFAULT_BOARD_ID = '18393484200';
const TARGET_GROUP_TITLE = 'EQUIFY LEADS VALUEBOT';

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

function requireApiKey(): string {
  const key = process.env.MONDAY_API_KEY?.trim();
  if (!key) {
    console.error('MONDAY_API_KEY missing');
    process.exit(1);
  }
  return key;
}

async function mondayGraphql<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data?: T; errors?: { message: string }[]; raw: unknown }> {
  const response = await fetch(MONDAY_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: requireApiKey(),
      'API-Version': MONDAY_API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const raw = await response.json();
  return raw as { data?: T; errors?: { message: string }[]; raw: unknown };
}

interface BoardColumn {
  id: string;
  title: string;
  type: string;
  settings_str: string;
}

interface BoardGroup {
  id: string;
  title: string;
}

async function main(): Promise<void> {
  loadEnv();
  const boardId = process.env.MONDAY_BOARD_ID?.trim() || DEFAULT_BOARD_ID;

  const result = await mondayGraphql<{
    boards: {
      name: string;
      groups: BoardGroup[];
      columns: BoardColumn[];
    }[];
  }>(
    `query ($boardIds: [ID!]!) {
      boards(ids: $boardIds) {
        name
        groups { id title }
        columns { id title type settings_str }
      }
    }`,
    { boardIds: [boardId] },
  );

  console.log(JSON.stringify(result, null, 2));

  if (result.errors?.length) {
    console.error('GraphQL errors:', result.errors);
    process.exit(1);
  }

  const board = result.data?.boards?.[0];
  if (!board) {
    console.error('Board not found');
    process.exit(1);
  }

  const targetGroup =
    board.groups.find((g) => g.title.trim().toUpperCase() === TARGET_GROUP_TITLE) ??
    board.groups.find((g) => g.title.includes('VALUEBOT')) ??
    board.groups.find((g) => g.title.includes('VALUBOT'));

  const mapping = {
    boardId,
    boardName: board.name,
    boardUrl: 'https://smallbizclubils-team.monday.com/boards/' + boardId,
    targetGroup: targetGroup ?? null,
    groups: board.groups,
    columns: board.columns.map((col) => ({
      id: col.id,
      title: col.title,
      type: col.type,
      settings: safeParseSettings(col.settings_str),
    })),
    generatedAt: new Date().toISOString(),
  };

  const outPath = join(process.cwd(), '.data', 'monday-introspect.json');
  writeFileSync(outPath, JSON.stringify(mapping, null, 2), 'utf8');
  console.log('\nSaved:', outPath);

  if (targetGroup) {
    console.log(`\nTarget group: "${targetGroup.title}" → ${targetGroup.id}`);
  } else {
    console.warn(`\nWARNING: Group "${TARGET_GROUP_TITLE}" not found. Available groups:`);
    board.groups.forEach((g) => console.warn(`  - ${g.title} (${g.id})`));
  }
}

function safeParseSettings(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
