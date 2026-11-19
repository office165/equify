/**
 * Round 14 (UPAY): THE file to fill when upay answers. Everything we do not know yet about upay's
 * answers lives here, as data, so plugging in the real answer is an edit of this file plus
 * environment variables (reports/round-14/upay-plug.md), not a new round.
 *
 * Every section has `confirmed`. While it is false, the verifier that uses it runs only with
 * UPAY_ENV=demo (test account). In live mode an unconfirmed section means "no verifier": no report
 * is released. Set `confirmed: true` only after a demo transaction passed with the real answer.
 *
 * The values below are our best guess from the names in upay's document (v7.0.6): cashierid,
 * totalamount, currency, comment. The rest (status values, signature) are placeholders.
 */

export interface UpayFieldMap {
  /** Field that says whether the transaction was paid. */
  status: string[];
  /** Values of `status` (compared lower case) that mean paid, failed, cancelled. */
  paidValues: string[];
  failedValues: string[];
  cancelledValues: string[];
  /** Amount charged, in the order currency. */
  amount: string[];
  /** "ILS"/"USD" (also "1"/"2", "NIS", "₪", "$"). Missing currency is read as `currencyDefault`. */
  currency: string[];
  currencyDefault: 'ILS' | 'USD';
  /** upay's transaction id, the one we got when we created the payment. */
  cashierId: string[];
  /** Optional: last four digits of the card, for the invoice. */
  cardLast4: string[];
}

export interface UpayAnswerConfig {
  /** Shape A: a status query in upay's API, by cashierid. */
  statusQuery: {
    confirmed: boolean;
    mainaction: string;
    minoraction: string;
    /** Name of the parameter that carries the cashier id in the request. */
    idParam: string;
    fields: UpayFieldMap;
  };
  /** Shape B: an IPN that carries a signature we can check with a shared secret (UPAY_IPN_SECRET). */
  signedIpn: {
    confirmed: boolean;
    signatureField: string;
    /**
     * hmac-sha256-sorted: HMAC-SHA256(secret, "k1=v1&k2=v2..." sorted by key, signature excluded), hex.
     * md5-concat: MD5(values of `signedFields` in order, then the secret, concatenated), hex.
     * sha256-concat: the same with SHA-256.
     */
    algorithm: 'hmac-sha256-sorted' | 'md5-concat' | 'sha256-concat';
    /** For the concat algorithms: the fields, in order. Empty means every field except the signature, sorted by key. */
    signedFields: string[];
    fields: UpayFieldMap;
  };
  /** Shape C: an IPN from upay's IP list (UPAY_IPN_IPS), then we ask upay again. */
  ipRequery: {
    confirmed: boolean;
    /**
     * "postback": POST the IPN body as is to UPAY_IPN_VERIFY_URL (must be on upay.co.il) and expect
     * `okToken` in the answer (as PayPal's IPN does). "status_query": ask with shape A.
     */
    mode: 'postback' | 'status_query';
    okToken: string;
    fields: UpayFieldMap;
  };
}

const GUESSED_FIELDS: UpayFieldMap = {
  status: ['status', 'transactionstatus', 'statuscode'],
  paidValues: ['paid', 'approved', 'success', 'ok', '1', 'completed'],
  failedValues: ['failed', 'declined', 'error', 'rejected', '0'],
  cancelledValues: ['cancelled', 'canceled', 'cancel', '2'],
  amount: ['totalamount', 'amount', 'sum'],
  currency: ['currency', 'currencyid', 'coin'],
  currencyDefault: 'ILS',
  cashierId: ['cashierid', 'transactionid', 'transferid'],
  cardLast4: ['cardlast4', 'last4', 'fourdigits', 'creditcardlastdigits'],
};

export const UPAY_ANSWER_CONFIG: UpayAnswerConfig = {
  statusQuery: {
    confirmed: false,
    // Placeholder names: upay's document has no status query (reports/round-9.md, question 3).
    mainaction: 'CASHIER',
    minoraction: 'GETTRANSACTIONSTATUS',
    idParam: 'cashierid',
    fields: GUESSED_FIELDS,
  },
  signedIpn: {
    confirmed: false,
    signatureField: 'signature',
    algorithm: 'hmac-sha256-sorted',
    signedFields: [],
    fields: GUESSED_FIELDS,
  },
  ipRequery: {
    confirmed: false,
    mode: 'postback',
    okToken: 'VERIFIED',
    fields: GUESSED_FIELDS,
  },
};
