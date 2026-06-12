/**
 * Supabase Supavisor connection pooling (port 6543, transaction mode).
 * Normalizes DATABASE_URL for serverless (Vercel) and URL-encodes credentials.
 */

export interface PostgresUrlParts {
  user: string;
  password: string;
  host: string;
  port: string;
  database: string;
}

export const DEFAULT_POOLER_REGION = 'eu-central-1';
const DEFAULT_POOLER_PORT = '6543';

/**
 * Ensures SUPABASE_POOLER_REGION is always set before pooler URL resolution.
 * Mutates process.env when missing so serverless runtimes inherit the fallback.
 */
export function ensureSupabasePoolerRegion(): string {
  const current = process.env.SUPABASE_POOLER_REGION?.trim();
  if (!current) {
    process.env.SUPABASE_POOLER_REGION = DEFAULT_POOLER_REGION;
    return DEFAULT_POOLER_REGION;
  }
  return current;
}

export function extractSupabaseProjectRef(): string | null {
  const publicUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (publicUrl) {
    const match = publicUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    const parts = safeParsePostgresUrl(databaseUrl);
    if (parts?.user.includes('.')) {
      return parts.user.split('.').slice(1).join('.');
    }
    const dbHost = parts?.host.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
    if (dbHost?.[1]) {
      return dbHost[1];
    }
  }

  return process.env.SUPABASE_PROJECT_REF?.trim() ?? null;
}

export function safeParsePostgresUrl(connectionString: string): PostgresUrlParts | null {
  const trimmed = connectionString.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const normalized = trimmed.replace(/^postgres(ql)?:\/\//, 'http://');
    const url = new URL(normalized);
    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.replace(/^\//, '') || 'postgres',
    };
  } catch {
    return null;
  }
}

function extractRegionFromPoolerHost(host: string): string | null {
  const match = host.match(/aws-0-([a-z0-9-]+)\.pooler\.supabase\.com/i);
  return match?.[1] ?? null;
}

export function buildSupabasePoolerUrl(options: {
  projectRef: string;
  password: string;
  region?: string;
  port?: string;
  database?: string;
}): string {
  const region = options.region?.trim() || ensureSupabasePoolerRegion();
  const port = options.port?.trim() || DEFAULT_POOLER_PORT;
  const database = options.database?.trim() || 'postgres';
  const user = `postgres.${options.projectRef}`;
  const encodedPassword = encodeURIComponent(options.password);
  return `postgresql://${user}:${encodedPassword}@aws-0-${region}.pooler.supabase.com:${port}/${database}`;
}

function rebuildPostgresUrl(parts: PostgresUrlParts): string {
  const encodedPassword = encodeURIComponent(parts.password);
  const encodedUser = encodeURIComponent(parts.user);
  const port = parts.port ? `:${parts.port}` : '';
  return `postgresql://${encodedUser}:${encodedPassword}@${parts.host}${port}/${parts.database}`;
}

/**
 * Resolves the live Postgres connection string for Supabase pooling (6543).
 * Priority: DATABASE_POOLER_URL → normalized DATABASE_URL → built from parts.
 */
export function resolveDatabaseConnectionString(): string {
  ensureSupabasePoolerRegion();

  const poolerOverride =
    process.env.DATABASE_POOLER_URL?.trim() ||
    process.env.SUPABASE_DATABASE_URL?.trim();
  if (poolerOverride) {
    return ensureTransactionPoolerUrl(poolerOverride);
  }

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error('DATABASE_URL is not configured.');
  }

  const parsed = safeParsePostgresUrl(raw);
  if (!parsed) {
    return raw;
  }

  const projectRefFromUser = parsed.user.includes('.')
    ? parsed.user.split('.').slice(1).join('.')
    : null;
  const projectRef = extractSupabaseProjectRef() || projectRefFromUser;
  const password =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    parsed.password ||
    process.env.DATABASE_PASSWORD?.trim();
  const region = ensureSupabasePoolerRegion();

  if (parsed.host.includes('pooler.supabase.com') && projectRef && password) {
    const hostRegion = extractRegionFromPoolerHost(parsed.host);
    if (
      hostRegion !== region ||
      parsed.port !== DEFAULT_POOLER_PORT ||
      !parsed.user.startsWith('postgres.')
    ) {
      return buildSupabasePoolerUrl({
        projectRef,
        password,
        region,
        port: DEFAULT_POOLER_PORT,
        database: parsed.database || 'postgres',
      });
    }
    return rebuildPostgresUrl(parsed);
  }

  if (!projectRef || !password) {
    return rebuildPostgresUrl(parsed);
  }

  return buildSupabasePoolerUrl({
    projectRef,
    password,
    region,
    port: DEFAULT_POOLER_PORT,
    database: parsed.database || 'postgres',
  });
}

function ensureTransactionPoolerUrl(connectionString: string): string {
  ensureSupabasePoolerRegion();
  const parsed = safeParsePostgresUrl(connectionString);
  if (!parsed) {
    return connectionString;
  }

  const projectRef =
    extractSupabaseProjectRef() ||
    (parsed.user.includes('.') ? parsed.user.split('.').slice(1).join('.') : null);

  if (
    projectRef &&
    parsed.host.includes('pooler.supabase.com') &&
    parsed.port !== DEFAULT_POOLER_PORT
  ) {
    const region = ensureSupabasePoolerRegion();
    return buildSupabasePoolerUrl({
      projectRef,
      password: parsed.password,
      region,
      port: DEFAULT_POOLER_PORT,
      database: parsed.database,
    });
  }

  return rebuildPostgresUrl(parsed);
}
