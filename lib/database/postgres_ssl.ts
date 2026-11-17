/**
 * TLS settings for node-postgres connections to Supabase.
 *
 * Why: pg-connection-string 2.7+ treats sslmode=require (and prefer, verify-ca) in the URL
 * as verify-full, and the URL's ssl settings override the `ssl` object passed to Pool.
 * POSTGRES_URL from the Supabase integration carries sslmode=require, so the old
 * `{ rejectUnauthorized: false }` was ignored and every connection failed with
 * SELF_SIGNED_CERT_IN_CHAIN (Supabase Root 2021 CA is not in Node's trust store).
 *
 * Fix: strip the ssl* query parameters from the URL and pass an explicit ssl object that
 * trusts the Supabase root CA and verifies the host name (verify-full).
 */
import type { ConnectionOptions } from 'tls';
import { SUPABASE_ROOT_2021_CA_PEM } from './supabase_root_ca';

const SSL_QUERY_PARAMS = ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat'];

export function isSupabasePostgresHost(connectionString: string): boolean {
  return /\.supabase\.(co|com)\b/i.test(connectionString);
}

/** Removes ssl* query parameters so the explicit `ssl` object is the only TLS source. */
export function stripSslQueryParams(connectionString: string): string {
  const q = connectionString.indexOf('?');
  if (q < 0) return connectionString;
  const base = connectionString.slice(0, q);
  const kept = connectionString
    .slice(q + 1)
    .split('&')
    .filter((pair) => pair && !SSL_QUERY_PARAMS.includes(pair.split('=')[0].toLowerCase()));
  return kept.length ? `${base}?${kept.join('&')}` : base;
}

function urlRequestsSsl(connectionString: string): boolean {
  return /[?&](sslmode=(require|verify-ca|verify-full|prefer)|ssl=(true|1))/i.test(connectionString);
}

/**
 * Resolves the `ssl` option for pg.
 * Supabase hosts: verify-full against the Supabase root CA.
 * Escape hatch (temporary, logged): PG_SSL_ALLOW_UNVERIFIED=true skips verification.
 * Other hosts: TLS only when PG_SSL=true or the URL asks for it; verification follows
 * PG_SSL_REJECT_UNAUTHORIZED as before.
 */
export function resolvePostgresSslConfig(
  connectionString: string,
  explicitSsl?: boolean,
): false | ConnectionOptions | undefined {
  const supabase = isSupabasePostgresHost(connectionString);
  const useSsl =
    explicitSsl ?? (supabase || process.env.PG_SSL === 'true' || urlRequestsSsl(connectionString));
  if (!useSsl) return undefined;

  if (process.env.PG_SSL_ALLOW_UNVERIFIED === 'true') {
    console.warn('[postgres_ssl] PG_SSL_ALLOW_UNVERIFIED=true: TLS certificate is not verified');
    return { rejectUnauthorized: false };
  }

  if (supabase) {
    return { ca: SUPABASE_ROOT_2021_CA_PEM, rejectUnauthorized: true };
  }

  return { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' };
}
