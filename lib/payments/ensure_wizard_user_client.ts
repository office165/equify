'use client';

export async function postEnsureWizardUser(input: {
  email: string;
  fullName?: string | null;
}): Promise<{ ok: boolean; email?: string; reason?: string }> {
  if (typeof window === 'undefined') {
    return { ok: false, reason: 'ssr' };
  }

  try {
    const response = await fetch('/api/v1/wizard/ensure-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email.trim(),
        fullName: input.fullName?.trim() || null,
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      email?: string;
      reason?: string;
    } | null;

    if (!response.ok || !data?.ok) {
      return { ok: false, reason: data?.reason ?? `http_${response.status}` };
    }
    return { ok: true, email: data.email };
  } catch {
    return { ok: false, reason: 'network' };
  }
}
