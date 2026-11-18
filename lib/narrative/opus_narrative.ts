/**
 * Round 7 (OPUS_NARRATIVE, off by default): Claude Opus 5.5 writes the executive summary, four
 * conclusion lines, and "על מה השווי נשען" (three assumptions and how far each must move for the
 * value to fall by 30%) from the engine output.
 *
 *   - Input: only lib/narrative/narrative_facts.ts (engine output, sector and size band).
 *   - Every narrative goes through lib/narrative/narrative_guard.ts. Any failure (no key, API
 *     error, refusal, wrong number, promise, forbidden sign) keeps the template text.
 *   - One narrative per report: the text is stored by a hash of its facts (report_narratives table,
 *     with an in-memory copy), so the download and the email get the same text.
 *   - The Haiku call in lib/wizard/sector_suggest_llm.ts is separate and unchanged.
 */
import { createHash } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import type { ValuationData } from '../pdf-template/types';
import { buildNarrativeFacts, type NarrativeFacts } from './narrative_facts';
import { validateNarrative, type ReportNarrative } from './narrative_guard';
import { narrativeStore, type NarrativeStore } from './narrative_store';

export const OPUS_NARRATIVE_MODEL = 'claude-opus-5-5';
export const NARRATIVE_PROMPT_VERSION = 'r7-1';

export function isOpusNarrativeEnabled(value = process.env.OPUS_NARRATIVE): boolean {
  return value?.trim().toLowerCase() === 'on';
}

export const NARRATIVE_SYSTEM_PROMPT = `אתה כותב את החלק המילולי של דוח הערכת שווי אלגוריתמי של equify BY SBC, לבעלי עסקים קטנים ובינוניים בישראל.
מקבלים ממך JSON עם תוצאת המנוע. כתוב בעברית פשוטה וברורה, בגוף שלישי, בלי שיווק.

כללים שאי אפשר לעבור עליהם:
1. כל מספר שאתה כותב חייב להיות אחד מהמחרוזות שב JSON, בדיוק כמו שהיא כתובה שם (כולל ₪, %, M ו ×). אל תחשב מספרים חדשים, אל תעגל, ואל תכתוב מספר במילים.
2. השווי הוא אינדיקציה. אל תבטיח תוצאה, מחיר עסקה, מימון או תשואה, ואל תכתוב "מובטח", "בוודאות" או "תיווך".
3. בלי קו מפריד ארוך, בלי נקודה אמצעית, בלי מקף צמוד לאות (כתוב "ב 2026", לא עם מקף), ובלי אימוג'י.
4. אל תמציא עובדות על העסק. מה שלא מופיע ב JSON לא קיים.

מה לכתוב:
- executiveSummary: פסקה אחת של 3 עד 5 משפטים: השווי לבעלים, שווי הפעילות, איך השיטות שוקללו, והטווח בין התרחישים.
- conclusions: בדיוק 4 שורות קצרות, כל אחת מסקנה אחת שנובעת מהמספרים.
- drivers: בדיוק 3 פריטים, באותו סדר ועם אותו key כמו ב drivers של ה JSON. title קצר, ו text שמסביר במשפט או שניים מה ההנחה ומה כתוב ב move (כמה היא צריכה לזוז כדי שהשווי ירד ב valueDropPct). אם reachable הוא false, אמור שגם שינוי גדול בהנחה הזאת לא מוריד את השווי ב valueDropPct.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['executiveSummary', 'conclusions', 'drivers'],
  properties: {
    executiveSummary: { type: 'string' },
    conclusions: { type: 'array', items: { type: 'string' } },
    drivers: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'title', 'text'],
        properties: { key: { type: 'string' }, title: { type: 'string' }, text: { type: 'string' } },
      },
    },
  },
} as const;

/** What the caller returns: the JSON text of the answer, the stop reason and the token usage. */
export interface NarrativeCallResult {
  text: string | null;
  stopReason: string | null;
  usage?: { input_tokens: number; output_tokens: number };
}

export type NarrativeCaller = (facts: NarrativeFacts) => Promise<NarrativeCallResult>;

/** The real call (Messages API through the SDK). Server-side fallback on refusal is on. */
export const anthropicNarrativeCaller: NarrativeCaller = async (facts) => {
  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: OPUS_NARRATIVE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
    system: NARRATIVE_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: JSON.stringify(facts) }],
  } as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);
  const text = response.content.find((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')?.text ?? null;
  return {
    text,
    stopReason: response.stop_reason ?? null,
    usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
  };
};

export function narrativeKey(facts: NarrativeFacts): string {
  return createHash('sha256').update(`${NARRATIVE_PROMPT_VERSION}|${OPUS_NARRATIVE_MODEL}|${JSON.stringify(facts)}`).digest('hex');
}

export type NarrativeOutcome =
  | { status: 'off' }
  | { status: 'stored' | 'generated'; narrative: ReportNarrative }
  | { status: 'rejected' | 'error' | 'no_facts' | 'no_key'; reason: string };

export async function resolveNarrative(
  data: ValuationData,
  opts: { caller?: NarrativeCaller; store?: NarrativeStore; requireKey?: boolean } = {},
): Promise<NarrativeOutcome> {
  if (!isOpusNarrativeEnabled()) return { status: 'off' };
  const facts = buildNarrativeFacts(data);
  if (!facts || facts.drivers.length !== 3) return { status: 'no_facts', reason: 'no engine facts' };
  const store = opts.store ?? narrativeStore();
  const key = narrativeKey(facts);
  const stored = await store.get(key);
  if (stored) return { status: 'stored', narrative: stored };
  const caller = opts.caller ?? anthropicNarrativeCaller;
  if (!opts.caller && (opts.requireKey ?? true) && !process.env.ANTHROPIC_API_KEY?.trim()) return { status: 'no_key', reason: 'ANTHROPIC_API_KEY is not set' };
  let res: NarrativeCallResult;
  try {
    res = await caller(facts);
  } catch (err) {
    return { status: 'error', reason: err instanceof Error ? err.message : String(err) };
  }
  if (res.stopReason === 'refusal') return { status: 'rejected', reason: 'refusal' };
  if (!res.text) return { status: 'rejected', reason: 'empty answer' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.text);
  } catch {
    return { status: 'rejected', reason: 'not JSON' };
  }
  const v = validateNarrative(parsed, facts);
  if (!v.ok) return { status: 'rejected', reason: v.reason };
  await store.put(key, v.narrative);
  return { status: 'generated', narrative: v.narrative };
}

/**
 * The report data with the Opus narrative when the flag is on and the narrative passes the guard;
 * otherwise the same object, unchanged (the template text stays).
 */
export async function withReportNarrative(data: ValuationData, opts?: Parameters<typeof resolveNarrative>[1]): Promise<ValuationData> {
  if (!isOpusNarrativeEnabled()) return data;
  const out = await resolveNarrative(data, opts);
  if (out.status === 'generated' || out.status === 'stored') return { ...data, opusNarrative: out.narrative };
  if ('reason' in out) console.warn('[opus-narrative] template kept', { status: out.status, reason: out.reason });
  return data;
}
