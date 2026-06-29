import type { Industry } from './multiples';
import type { EquifySectorKey } from '../valuation';

/**
 * Maps legacy multiples-table industry keys to the 2026 taxonomy.
 * Restaurants must never inherit hotel multiples (3–5× vs 8–12× EBITDA).
 */
export function migrateLegacyIndustryKey(legacyKey: string): Industry {
  const migrations: Record<string, Industry> = {
    food: 'food_service',
    retail: 'retail_unified',
    ecom: 'retail_unified',
    retail_trade: 'retail_unified',
  };
  const key = legacyKey.trim();
  return (migrations[key] ?? key) as Industry;
}

/** Maps legacy Equify wizard sector keys to the unified taxonomy. */
export function migrateLegacyEquifySectorKey(legacyKey: string): EquifySectorKey {
  const migrations: Record<string, EquifySectorKey> = {
    ecom: 'retail_unified',
    retail_trade: 'retail_unified',
  };
  const key = legacyKey.trim();
  if (key in migrations) return migrations[key]!;
  return key as EquifySectorKey;
}

/** Resolves any industry string to a valid {@link Industry} row in ISRAEL_MULTIPLES_2026. */
export function resolveIndustryKey(key: string): Industry {
  const migrated = migrateLegacyIndustryKey(key);
  const valid: Industry[] = [
    'saas',
    'fintech',
    'healthtech',
    'cyber',
    'realestate',
    'construction',
    'manufacturing',
    'retail_unified',
    'food_service',
    'hospitality',
    'professional_services',
    'defense',
    'energy',
    'other',
  ];
  return valid.includes(migrated) ? migrated : 'other';
}
