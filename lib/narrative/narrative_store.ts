/**
 * Round 7 (OPUS_NARRATIVE): one stored narrative per report (by the hash of its facts), so the
 * download and the email show the same text. Supabase table report_narratives
 * (supabase/migrations/20261118_report_narratives.sql, applied by hand) plus an in-memory copy.
 * Without the table or Supabase the memory copy is used (per server instance).
 */
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../db/supabase';
import type { ReportNarrative } from './narrative_guard';

export interface NarrativeStore {
  get(key: string): Promise<ReportNarrative | null>;
  put(key: string, n: ReportNarrative): Promise<void>;
}

export function memoryNarrativeStore(map = new Map<string, ReportNarrative>()): NarrativeStore {
  return {
    async get(key) {
      return map.get(key) ?? null;
    },
    async put(key, n) {
      if (!map.has(key)) map.set(key, n);
    },
  };
}

const MEMORY = new Map<string, ReportNarrative>();

function supabaseNarrativeStore(): NarrativeStore {
  const mem = memoryNarrativeStore(MEMORY);
  return {
    async get(key) {
      const hit = await mem.get(key);
      if (hit) return hit;
      try {
        const { data, error } = await getSupabaseAdminClient().from('report_narratives').select('narrative').eq('facts_hash', key).maybeSingle();
        if (error) throw new Error(error.message);
        const n = (data?.narrative as ReportNarrative | undefined) ?? null;
        if (n) await mem.put(key, n);
        return n;
      } catch (err) {
        console.warn('[opus-narrative] store read failed, memory only', err instanceof Error ? err.message : err);
        return null;
      }
    },
    async put(key, n) {
      await mem.put(key, n);
      try {
        // First write wins: an existing row is kept, so two parallel renders end with one text.
        const { error } = await getSupabaseAdminClient().from('report_narratives').upsert({ facts_hash: key, narrative: n }, { onConflict: 'facts_hash', ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      } catch (err) {
        console.warn('[opus-narrative] store write failed, memory only', err instanceof Error ? err.message : err);
      }
    },
  };
}

export function narrativeStore(): NarrativeStore {
  return isSupabaseAdminConfigured() ? supabaseNarrativeStore() : memoryNarrativeStore(MEMORY);
}
