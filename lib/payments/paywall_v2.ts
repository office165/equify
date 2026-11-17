/**
 * PAYWALL_V2 orchestration (off unless PAYWALL_V2=on).
 * The payment token is consumed only after the PDF was built and the email was sent.
 * On failure the token stays unused, the customer sees a calm message and the office is
 * alerted with the order id. Dependencies are injected so the flow is testable with a
 * mocked Supabase.
 */

export const REPORT_PENDING_MESSAGE_HE = 'הדוח בדרך, נשלח אליך במייל תוך שעה.';
export const REPORT_PENDING_MESSAGE_EN = 'Your report is on its way and will be emailed to you within an hour.';

export interface DeliverV2Deps<R> {
  hasUnusedToken: (email: string) => Promise<boolean>;
  consumeToken: (email: string) => Promise<boolean>;
  /** Builds the PDF and sends the email. Must report whether the email was delivered. */
  deliver: () => Promise<R & { pdfBytes: number; email: { delivered: boolean } }>;
  alertOffice: (subject: string, lines: string[]) => void;
  mintAccessToken: (email: string) => string;
}

export type DeliverV2Outcome<R> =
  | { status: 402; body: { status: 'awaiting_payment' } }
  | { status: 200; body: R & { reportAccessToken: string } }
  | { status: 502; body: { status: 'pending_manual'; message: string; orderId: string } };

export async function runDeliverPaywallV2<R>(
  params: { email: string; orderId: string; locale?: 'he' | 'en' },
  deps: DeliverV2Deps<R>,
): Promise<DeliverV2Outcome<R>> {
  const { email, orderId } = params;
  const message = params.locale === 'en' ? REPORT_PENDING_MESSAGE_EN : REPORT_PENDING_MESSAGE_HE;
  if (!(await deps.hasUnusedToken(email))) {
    return { status: 402, body: { status: 'awaiting_payment' } };
  }

  let result: (R & { pdfBytes: number; email: { delivered: boolean } }) | null = null;
  let failure = '';
  try {
    const delivered = await deps.deliver();
    result = delivered;
    if (!(delivered.pdfBytes > 0)) failure = 'pdf_empty';
    else if (!delivered.email.delivered) failure = 'email_not_delivered';
  } catch (err) {
    failure = err instanceof Error ? err.message.slice(0, 300) : 'deliver_failed';
  }

  if (failure || !result) {
    deps.alertOffice(`דוח לא נשלח, הזמנה ${orderId}`, [
      `הזמנה: ${orderId}`,
      `סיבה: ${failure}`,
      'טוקן התשלום לא נצרך. צריך לשלוח את הדוח ידנית או להריץ שוב.',
    ]);
    return { status: 502, body: { status: 'pending_manual', message, orderId } };
  }

  const consumed = await deps.consumeToken(email);
  if (!consumed) {
    deps.alertOffice(`דוח נשלח אבל הטוקן כבר נצרך, הזמנה ${orderId}`, [
      `הזמנה: ${orderId}`,
      'ייתכן שליחה כפולה (שתי בקשות במקביל). לבדוק בטבלת stripe_transactions.',
    ]);
  }
  return { status: 200, body: { ...result, reportAccessToken: deps.mintAccessToken(email) } };
}

export interface DispatchV2Deps<R extends { emailSent: boolean; pdfBytes: number }> {
  isTokenUnused: () => Promise<boolean>;
  claimToken: () => Promise<boolean>;
  dispatch: () => Promise<R>;
  alertOffice: (subject: string, lines: string[]) => void;
}

export type DispatchV2Outcome<R> =
  | { status: 403; body: { error: string } }
  | { status: 202; body: R }
  | { status: 502; body: { status: 'pending_manual'; message: string; orderId: string } };

export async function runDispatchPaywallV2<R extends { emailSent: boolean; pdfBytes: number }>(
  params: { orderId: string; locale?: 'he' | 'en' },
  deps: DispatchV2Deps<R>,
): Promise<DispatchV2Outcome<R>> {
  const message = params.locale === 'en' ? REPORT_PENDING_MESSAGE_EN : REPORT_PENDING_MESSAGE_HE;
  if (!(await deps.isTokenUnused())) {
    return { status: 403, body: { error: 'Payment dispatch token already used' } };
  }
  let result: R | null = null;
  let failure = '';
  try {
    result = await deps.dispatch();
    if (!result.emailSent) failure = result.pdfBytes > 0 ? 'email_not_delivered' : 'pdf_not_built';
  } catch (err) {
    failure = err instanceof Error ? err.message.slice(0, 300) : 'dispatch_failed';
  }
  if (failure || !result) {
    deps.alertOffice(`דוח לא נשלח (dispatch), הזמנה ${params.orderId}`, [
      `הזמנה: ${params.orderId}`,
      `סיבה: ${failure}`,
      'טוקן התשלום לא נצרך.',
    ]);
    return { status: 502, body: { status: 'pending_manual', message, orderId: params.orderId } };
  }
  if (!(await deps.claimToken())) {
    deps.alertOffice(`dispatch נשלח אבל הטוקן כבר נצרך, הזמנה ${params.orderId}`, [
      `הזמנה: ${params.orderId}`,
      'ייתכן שליחה כפולה.',
    ]);
  }
  return { status: 202, body: result };
}
