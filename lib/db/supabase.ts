/**
 * Server-side Supabase admin client.
 * Resolves env vars from the official Supabase ↔ Vercel integration:
 *   SUPABASE_URL (+ NEXT_PUBLIC_SUPABASE_URL fallback)
 *   SUPABASE_SERVICE_ROLE_KEY (+ SUPABASE_ANON_KEY fallback)
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;
let startupCheckRan = false;

export function resolveSupabaseUrl(): string | null {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    null
  );
}

export function resolveSupabaseServiceRoleKey(): string | null {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    null
  );
}

/** Logs once per runtime if integration keys are absent. */
export function runSupabaseStartupCheck(): void {
  if (startupCheckRan) return;
  startupCheckRan = true;

  const url = resolveSupabaseUrl();
  const key = resolveSupabaseServiceRoleKey();

  if (!url || !key) {
    console.error('CRITICAL: Supabase keys are missing from environment variables!');
    console.error('[supabase] env presence', {
      SUPABASE_URL: Boolean(process.env.SUPABASE_URL?.trim()),
      NEXT_PUBLIC_SUPABASE_URL: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
      SUPABASE_ANON_KEY: Boolean(process.env.SUPABASE_ANON_KEY?.trim()),
    });
  }
}

runSupabaseStartupCheck();

export function getSupabaseEnvDiagnostics(): {
  configured: boolean;
  url: boolean;
  serviceRole: boolean;
  urlSource: string | null;
  serviceRoleSource: string | null;
} {
  const urlFromPrimary = process.env.SUPABASE_URL?.trim();
  const urlFromPublic = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const keyFromService = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const keyFromAnon = process.env.SUPABASE_ANON_KEY?.trim();

  const urlSource = urlFromPrimary
    ? 'SUPABASE_URL'
    : urlFromPublic
      ? 'NEXT_PUBLIC_SUPABASE_URL'
      : null;

  const serviceRoleSource = keyFromService
    ? 'SUPABASE_SERVICE_ROLE_KEY'
    : keyFromAnon
      ? 'SUPABASE_ANON_KEY'
      : null;

  return {
    configured: Boolean(urlSource && serviceRoleSource),
    url: Boolean(urlSource),
    serviceRole: Boolean(serviceRoleSource),
    urlSource,
    serviceRoleSource,
  };
}

export function isSupabaseAdminConfigured(): boolean {
  runSupabaseStartupCheck();
  return getSupabaseEnvDiagnostics().configured;
}

/** Administrative Supabase client — never expose to the browser. */
export function getSupabaseAdminClient(): SupabaseClient {
  runSupabaseStartupCheck();

  if (adminClient) return adminClient;

  const url = resolveSupabaseUrl();
  const apiKey = resolveSupabaseServiceRoleKey();

  if (!url || !apiKey) {
    throw new Error(
      'Supabase is not configured. Expected SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or fallbacks).',
    );
  }

  adminClient = createClient(url, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClient;
}
