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

export type ConnectionStringSource =
  | 'POSTGRES_URL'
  | 'DATABASE_POOLER_URL'
  | 'SUPABASE_DATABASE_URL'
  | 'DATABASE_URL';

export const DEFAULT_POOLER_REGION = 'eu-central-1';
export const DEFAULT_POOLER_SHARD = 'aws-0';
const DEFAULT_POOLER_PORT = '6543';

const POOLER_HOST_RE = /aws-(\d+)-([a-z0-9-]+)\.pooler\.supabase\.com/i;

/** True when POSTGRES_URL or DATABASE_URL is set (never POSTGRES_URL_NON_POOLING). */
export function isPostgresConnectionConfigured(): boolean {
  return Boolean(
    process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim(),
  );
}

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

/**
 * Ensures SUPABASE_POOLER_SHARD is always set before pooler URL resolution.
 * Mutates process.env when missing so serverless runtimes inherit the fallback.
 */
export function ensureSupabasePoolerShard(): string {
  const current = process.env.SUPABASE_POOLER_SHARD?.trim();
  if (!current) {
    process.env.SUPABASE_POOLER_SHARD = DEFAULT_POOLER_SHARD;
    return DEFAULT_POOLER_SHARD;
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

  const databaseUrl =
    process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();
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

function extractPoolerHostParts(host: string): { shard: string; region: string } | null {
  const match = host.match(POOLER_HOST_RE);
  if (!match?.[1] || !match?.[2]) {
    return null;
  }
  return { shard: `aws-${match[1]}`, region: match[2] };
}

/** Pooler host + postgres.<ref> user + transaction port — safe to use as-is. */
export function isCompletePoolerConnectionString(parts: PostgresUrlParts): boolean {
  if (!parts.host.includes('pooler.supabase.com')) {
    return false;
  }
  if (!extractPoolerHostParts(parts.host)) {
    return false;
  }
  if (parts.port !== DEFAULT_POOLER_PORT) {
    return false;
  }
  if (!parts.user.startsWith('postgres.')) {
    return false;
  }
  return true;
}

export function buildSupabasePoolerUrl(options: {
  projectRef: string;
  password: string;
  region?: string;
  shard?: string;
  port?: string;
  database?: string;
}): string {
  const region = options.region?.trim() || ensureSupabasePoolerRegion();
  const shard = options.shard?.trim() || ensureSupabasePoolerShard();
  const port = options.port?.trim() || DEFAULT_POOLER_PORT;
  const database = options.database?.trim() || 'postgres';
  const user = `postgres.${options.projectRef}`;
  const encodedPassword = encodeURIComponent(options.password);
  return `postgresql://${user}:${encodedPassword}@${shard}-${region}.pooler.supabase.com:${port}/${database}`;
}

function rebuildPostgresUrl(parts: PostgresUrlParts): string {
  const encodedPassword = encodeURIComponent(parts.password);
  const encodedUser = encodeURIComponent(parts.user);
  const port = parts.port ? `:${parts.port}` : '';
  return `postgresql://${encodedUser}:${encodedPassword}@${parts.host}${port}/${parts.database}`;
}

/** TEMP: diagnostic logging — remove after Vercel log review. */
function logResolveDatabaseConnectionDebug(options: {
  route: 'poolerOverride' | 'passthrough' | 'rebuild';
  source: ConnectionStringSource;
  host: string;
  user: string;
  port: string;
  supabaseDbPasswordSet: boolean;
  databasePasswordSet: boolean;
  postgresPasswordSet: boolean;
  rebuildReason?: string;
}): void {
  console.log('[resolveDatabaseConnectionString]', {
    route: options.route,
    source: options.source,
    host: options.host,
    user: options.user,
    port: options.port,
    SUPABASE_DB_PASSWORD: options.supabaseDbPasswordSet,
    DATABASE_PASSWORD: options.databasePasswordSet,
    POSTGRES_PASSWORD: options.postgresPasswordSet,
    ...(options.rebuildReason ? { rebuildReason: options.rebuildReason } : {}),
  });
}

function passwordEnvFlags(): {
  supabaseDbPasswordSet: boolean;
  databasePasswordSet: boolean;
  postgresPasswordSet: boolean;
} {
  return {
    supabaseDbPasswordSet: Boolean(process.env.SUPABASE_DB_PASSWORD?.trim()),
    databasePasswordSet: Boolean(process.env.DATABASE_PASSWORD?.trim()),
    postgresPasswordSet: Boolean(process.env.POSTGRES_PASSWORD),
  };
}

function connectionMetaFromString(connectionString: string): {
  host: string;
  user: string;
  port: string;
} {
  const parsed = safeParsePostgresUrl(connectionString);
  if (parsed) {
    return { host: parsed.host, user: parsed.user, port: parsed.port };
  }
  return { host: '(unparsed)', user: '(unparsed)', port: '(unparsed)' };
}

/**
 * Resolves the live Postgres connection string for Supabase pooling (6543).
 * Priority: POSTGRES_URL (verbatim) → DATABASE_POOLER_URL → DATABASE_URL → built from parts.
 * Never uses POSTGRES_URL_NON_POOLING (IPv6 direct host; fails on Vercel).
 */
export function resolveDatabaseConnectionString(): string {
  ensureSupabasePoolerRegion();
  const envFlags = passwordEnvFlags();

  const postgresUrl = process.env.POSTGRES_URL?.trim();
  if (postgresUrl) {
    logResolveDatabaseConnectionDebug({
      route: 'passthrough',
      source: 'POSTGRES_URL',
      ...connectionMetaFromString(postgresUrl),
      ...envFlags,
    });
    return postgresUrl;
  }

  const poolerOverrideUrl = process.env.DATABASE_POOLER_URL?.trim();
  const supabaseDatabaseUrl = process.env.SUPABASE_DATABASE_URL?.trim();
  const poolerOverride = poolerOverrideUrl || supabaseDatabaseUrl;
  if (poolerOverride) {
    const source: ConnectionStringSource = poolerOverrideUrl
      ? 'DATABASE_POOLER_URL'
      : 'SUPABASE_DATABASE_URL';
    const resolved = ensureTransactionPoolerUrl(poolerOverride);
    logResolveDatabaseConnectionDebug({
      route: 'poolerOverride',
      source,
      ...connectionMetaFromString(resolved),
      ...envFlags,
    });
    return resolved;
  }

  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error('POSTGRES_URL or DATABASE_URL is not configured.');
  }

  const parsed = safeParsePostgresUrl(raw);
  if (!parsed) {
    logResolveDatabaseConnectionDebug({
      route: 'rebuild',
      source: 'DATABASE_URL',
      host: '(unparsed)',
      user: '(unparsed)',
      port: '(unparsed)',
      ...envFlags,
      rebuildReason: 'database_url_unparsed',
    });
    return raw;
  }

  if (isCompletePoolerConnectionString(parsed)) {
    logResolveDatabaseConnectionDebug({
      route: 'passthrough',
      source: 'DATABASE_URL',
      host: parsed.host,
      user: parsed.user,
      port: parsed.port,
      ...envFlags,
    });
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
  const shard = ensureSupabasePoolerShard();

  if (parsed.host.includes('pooler.supabase.com') && projectRef && password) {
    const hostParts = extractPoolerHostParts(parsed.host);
    if (
      !hostParts ||
      hostParts.region !== region ||
      hostParts.shard !== shard ||
      parsed.port !== DEFAULT_POOLER_PORT ||
      !parsed.user.startsWith('postgres.')
    ) {
      const resolved = buildSupabasePoolerUrl({
        projectRef,
        password,
        region,
        shard,
        port: DEFAULT_POOLER_PORT,
        database: parsed.database || 'postgres',
      });
      logResolveDatabaseConnectionDebug({
        route: 'rebuild',
        source: 'DATABASE_URL',
        ...connectionMetaFromString(resolved),
        ...envFlags,
        rebuildReason: 'pooler_host_normalize',
      });
      return resolved;
    }
    const resolved = rebuildPostgresUrl(parsed);
    logResolveDatabaseConnectionDebug({
      route: 'rebuild',
      source: 'DATABASE_URL',
      ...connectionMetaFromString(resolved),
      ...envFlags,
      rebuildReason: 'pooler_reencode',
    });
    return resolved;
  }

  if (!projectRef || !password) {
    const resolved = rebuildPostgresUrl(parsed);
    logResolveDatabaseConnectionDebug({
      route: 'rebuild',
      source: 'DATABASE_URL',
      ...connectionMetaFromString(resolved),
      ...envFlags,
      rebuildReason: 'missing_project_ref_or_password',
    });
    return resolved;
  }

  const resolved = buildSupabasePoolerUrl({
    projectRef,
    password,
    region,
    shard,
    port: DEFAULT_POOLER_PORT,
    database: parsed.database || 'postgres',
  });
  logResolveDatabaseConnectionDebug({
    route: 'rebuild',
    source: 'DATABASE_URL',
    ...connectionMetaFromString(resolved),
    ...envFlags,
    rebuildReason: 'build_from_parts',
  });
  return resolved;
}

function ensureTransactionPoolerUrl(connectionString: string): string {
  ensureSupabasePoolerRegion();
  const trimmed = connectionString.trim();
  const parsed = safeParsePostgresUrl(trimmed);
  if (!parsed) {
    return trimmed;
  }

  if (isCompletePoolerConnectionString(parsed)) {
    return trimmed;
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
    const shard = ensureSupabasePoolerShard();
    return buildSupabasePoolerUrl({
      projectRef,
      password: parsed.password,
      region,
      shard,
      port: DEFAULT_POOLER_PORT,
      database: parsed.database,
    });
  }

  return rebuildPostgresUrl(parsed);
}
