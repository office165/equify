import { NextResponse } from 'next/server';
import { INTERNAL_COOKIE, INTERNAL_COOKIE_MAX_AGE, internalCookieValue, internalPagesAvailable } from '../../../../lib/internal/payments_admin';
import { pulseTokenMatches } from '../../../../lib/pulse/pulse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Round 14: the token form of /internal/payments. Sets an httpOnly cookie with an HMAC of PULSE_TOKEN. 404 while off. */
export async function POST(request: Request) {
  if (!internalPagesAvailable()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const form = await request.formData().catch(() => null);
  const token = String(form?.get('token') ?? '');
  const back = new URL('/internal/payments', request.url);
  if (!pulseTokenMatches(token)) {
    back.searchParams.set('denied', '1');
    return NextResponse.redirect(back, 303);
  }
  const res = NextResponse.redirect(back, 303);
  res.cookies.set(INTERNAL_COOKIE, internalCookieValue(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/internal', maxAge: INTERNAL_COOKIE_MAX_AGE });
  return res;
}
