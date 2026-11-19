import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getSupabaseAdminClient, isSupabaseAdminConfigured } from '../../../../lib/db/supabase';
import { INTERNAL_COOKIE, internalAccessOk, internalPagesAvailable, loadPaymentsOverview, type ReadDb } from '../../../../lib/internal/payments_admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'תשלומים (פנימי)',
  robots: { index: false, follow: false, nocache: true },
};

const wrap: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, sans-serif', color: '#111', background: '#fff', minHeight: '100vh' };
const table: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 32 };
const cell: React.CSSProperties = { border: '1px solid #ccc', padding: '6px 8px', textAlign: 'start', verticalAlign: 'top' };
const fmt = (iso: string) => iso.replace('T', ' ').slice(0, 19);

/** Round 14: internal payments page. Read only. 404 unless PULSE_TOKEN is set and UPAY or GREEN_INVOICE is on. */
export default async function InternalPaymentsPage({ searchParams }: { searchParams?: { denied?: string } }) {
  if (!internalPagesAvailable()) notFound();
  const auth = headers().get('authorization');
  const ok = internalAccessOk({ cookie: cookies().get(INTERNAL_COOKIE)?.value ?? null, bearer: auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7) : null });
  if (!ok) {
    return (
      <main style={wrap}>
        <h1 style={{ fontSize: 22, marginBottom: 16 }}>תשלומים (פנימי)</h1>
        <form method="post" action="/api/internal/session" style={{ display: 'flex', gap: 8, alignItems: 'end', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: 4 }}>
            <span>מפתח הדופק (PULSE_TOKEN)</span>
            <input name="token" type="password" autoComplete="off" required style={{ minHeight: 44, padding: '0 10px', border: '1px solid #666', borderRadius: 6 }} />
          </label>
          <button type="submit" style={{ minHeight: 44, padding: '0 16px', background: '#00857E', color: '#fff', border: 0, borderRadius: 6 }}>כניסה</button>
        </form>
        {searchParams?.denied ? <p role="alert" style={{ marginTop: 12, color: '#B00020' }}>המפתח לא נכון.</p> : null}
      </main>
    );
  }
  const db = isSupabaseAdminConfigured() ? (getSupabaseAdminClient() as unknown as ReadDb) : null;
  const o = await loadPaymentsOverview(db);
  const s = o.status;
  const rows: Array<[string, string]> = [
    ['UPAY', s.upay],
    ['upay מוגדר (מייל ומפתח)', s.upayConfigured ? 'כן' : 'לא'],
    ['סביבת upay', s.upayEnv],
    ['מאמת (UPAY_VERIFIER)', `${s.verifier.name}, פעיל: ${s.verifier.active}`],
    ['למה', s.verifier.reason],
    ['כתובות IP של IPN', String(s.ipList)],
    ['סוד IPN', s.ipnSecret ? 'מוגדר' : 'לא מוגדר'],
    ['כתובת אימות IPN', s.verifyUrl ? 'מוגדרת' : 'לא מוגדרת'],
    ['GREEN_INVOICE', s.greenInvoice],
    ['חשבונית ירוקה', s.greenInvoiceTarget],
    ['מסד', o.db + (o.error ? `: ${o.error}` : '')],
  ];
  return (
    <main style={wrap}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>תשלומים (פנימי)</h1>
      <h2 style={{ fontSize: 17, margin: '16px 0 8px' }}>סטטוס</h2>
      <table style={table}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row" style={{ ...cell, width: 240 }}>{k}</th>
              <td style={cell}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: 17, margin: '16px 0 8px' }}>הזמנות ({o.orders.length})</h2>
      <table style={table}>
        <thead>
          <tr>{['נוצרה', 'מזהה', 'מייל', 'סכום', 'סטטוס', 'cashier id', 'שוחרר', 'טוקן'].map((h) => <th key={h} scope="col" style={cell}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {o.orders.map((r) => (
            <tr key={r.id}>
              <td style={cell}>{fmt(r.createdAt)}</td>
              <td style={cell}>{r.id.slice(0, 8)}</td>
              <td style={cell}>{r.email}</td>
              <td style={cell}>{r.amount} {r.currency}</td>
              <td style={cell}>{r.status}</td>
              <td style={cell}>{r.cashierId ?? ''}</td>
              <td style={cell}>{r.released ? 'כן' : 'לא'}</td>
              <td style={cell}>{r.tokenMinted ? 'כן' : 'לא'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: 17, margin: '16px 0 8px' }}>IPN שהגיעו ({o.ipn.length})</h2>
      <table style={table}>
        <thead>
          <tr>{['הגיע', 'הזמנה', 'IP', 'תוצאה'].map((h) => <th key={h} scope="col" style={cell}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {o.ipn.map((r) => (
            <tr key={r.id}>
              <td style={cell}>{fmt(r.createdAt)}</td>
              <td style={cell}>{r.orderId?.slice(0, 8) ?? ''}</td>
              <td style={cell}>{r.ip ?? ''}</td>
              <td style={cell}>{r.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: 17, margin: '16px 0 8px' }}>חשבוניות ({o.invoices.length})</h2>
      <table style={table}>
        <thead>
          <tr>{['נוצרה', 'מפתח', 'סטטוס', 'מספר', 'שגיאה'].map((h) => <th key={h} scope="col" style={cell}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {o.invoices.map((r) => (
            <tr key={r.orderKey}>
              <td style={cell}>{fmt(r.createdAt)}</td>
              <td style={cell}>{r.orderKey}</td>
              <td style={cell}>{r.status}</td>
              <td style={cell}>{r.documentNumber ?? ''}</td>
              <td style={cell}>{r.error ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
