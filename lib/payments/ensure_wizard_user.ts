/**
 * Ensure a public.users row exists for the wizard email (server-only).
 */

import {
  getSupabaseAdminClient,
  isSupabaseAdminConfigured,
} from '../db/supabase';

export type EnsureWizardUserResult =
  | { ok: true; userId: string; email: string }
  | { ok: false; reason: 'supabase_not_configured' | 'invalid_input' | 'db_error'; message?: string };

export async function ensureWizardUser(input: {
  email: string;
  fullName?: string | null;
}): Promise<EnsureWizardUserResult> {
  if (!isSupabaseAdminConfigured()) {
    return { ok: false, reason: 'supabase_not_configured' };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, reason: 'invalid_input' };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc('ensure_wizard_user', {
    p_email: email,
    p_full_name: input.fullName?.trim() || null,
  });

  if (error) {
    const msg = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
    if (msg.includes('invalid_input') || msg.includes('invalid_email')) {
      return { ok: false, reason: 'invalid_input', message: error.message };
    }
    return { ok: false, reason: 'db_error', message: error.message };
  }

  const row = data as { ok?: boolean; user_id?: string; email?: string } | null;
  if (!row?.ok || !row.user_id || !row.email) {
    return { ok: false, reason: 'db_error', message: 'ensure_wizard_user_empty' };
  }

  return { ok: true, userId: String(row.user_id), email: String(row.email) };
}
