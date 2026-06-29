import type { ValuationStrategyKind } from './sector_methodology_matrix';

/** DCF vs multiples split — decimals summing to 1.0. */
export interface SubSectorBlendWeightEntry {
  dcf: number;
  multiple: number;
}

/** Engine EV blend legs — maps registry `multiple` to ebitda and/or rev. */
export interface EngineBlendWeights {
  dcf: number;
  ebitda: number;
  rev: number;
}

/** Tier-1 default when sub-sector is missing or unmapped. */
export const DEFAULT_VALUATION_BLEND_WEIGHTS: SubSectorBlendWeightEntry = {
  dcf: 0.7,
  multiple: 0.3,
};

const WEIGHT_SUM_TOLERANCE = 1e-6;

/** Runtime verification — dcf + multiple must equal 100%. */
export function assertSubSectorBlendWeightsSum(
  entry: SubSectorBlendWeightEntry,
  context?: string,
): void {
  const sum = entry.dcf + entry.multiple;
  if (Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE) {
    throw new Error(
      `Valuation blend weights must sum to 1.0 (got ${sum.toFixed(6)}${
        context ? ` for ${context}` : ''
      })`,
    );
  }
}

/**
 * Big-4 style DCF / multiples weights keyed by wizard `subSector` id.
 * Aliases (e.g. hotel_boutique → boutique_hotel) are resolved at lookup time.
 */
const WIZARD_SUB_SECTOR_BLEND_WEIGHTS: Record<string, SubSectorBlendWeightEntry> = {
  // Hospitality (hotels only)
  boutique_hotel: { dcf: 0.5, multiple: 0.5 },
  hotel_chain: { dcf: 0.6, multiple: 0.4 },
  vacation: { dcf: 0.4, multiple: 0.6 },
  airbnb_mgmt: { dcf: 0.45, multiple: 0.55 },
  // Food service
  restaurant_qsr: { dcf: 0.4, multiple: 0.6 },
  cafe: { dcf: 0.4, multiple: 0.6 },
  catering: { dcf: 0.4, multiple: 0.6 },
  franchise: { dcf: 0.4, multiple: 0.6 },
  delivery: { dcf: 0.4, multiple: 0.6 },
  restaurant: { dcf: 0.4, multiple: 0.6 },
  'restaurants-fb': { dcf: 0.4, multiple: 0.6 },
  events: { dcf: 0.4, multiple: 0.6 },
  // SaaS / Tech
  b2b_saas: { dcf: 0.3, multiple: 0.7 },
  b2c_saas: { dcf: 0.2, multiple: 0.8 },
  devtools: { dcf: 0.4, multiple: 0.6 },
  marketplace: { dcf: 0.3, multiple: 0.7 },
  // Fintech
  payments: { dcf: 0.3, multiple: 0.7 },
  lending: { dcf: 0.5, multiple: 0.5 },
  insurtech: { dcf: 0.4, multiple: 0.6 },
  wealth: { dcf: 0.3, multiple: 0.7 },
  // Cyber
  enterprise: { dcf: 0.3, multiple: 0.7 },
  cloud: { dcf: 0.25, multiple: 0.75 },
  ot: { dcf: 0.4, multiple: 0.6 },
  services_cyber: { dcf: 0.2, multiple: 0.8 },
  // Life Sciences
  medtech: { dcf: 0.5, multiple: 0.5 },
  biotech: { dcf: 0.8, multiple: 0.2 },
  digital_health: { dcf: 0.35, multiple: 0.65 },
  services_health: { dcf: 0.3, multiple: 0.7 },
  // Professional Services
  consulting: { dcf: 0.2, multiple: 0.8 },
  legal: { dcf: 0.15, multiple: 0.85 },
  accounting: { dcf: 0.2, multiple: 0.8 },
  marketing: { dcf: 0.25, multiple: 0.75 },
  // Industrial
  manufacturing: { dcf: 0.7, multiple: 0.3 },
  distribution: { dcf: 0.6, multiple: 0.4 },
  food_bev: { dcf: 0.5, multiple: 0.5 },
  traditional: { dcf: 0.6, multiple: 0.4 },
  // Retail / Commerce
  d2c: { dcf: 0.35, multiple: 0.65 },
  marketplace_ecom: { dcf: 0.3, multiple: 0.7 },
  specialty: { dcf: 0.35, multiple: 0.65 },
  retail: { dcf: 0.4, multiple: 0.6 },
  'retail-supermarkets': { dcf: 0.4, multiple: 0.6 },
  'retail-fashion': { dcf: 0.35, multiple: 0.65 },
  subscription: { dcf: 0.3, multiple: 0.7 },
  // Energy
  solar: { dcf: 0.8, multiple: 0.2 },
  storage: { dcf: 0.7, multiple: 0.3 },
  wind: { dcf: 0.8, multiple: 0.2 },
  services_energy: { dcf: 0.5, multiple: 0.5 },
  // Aerospace / Defense
  defense_manufacturing: { dcf: 0.6, multiple: 0.4 },
  aviation_space: { dcf: 0.55, multiple: 0.45 },
  defense_tech: { dcf: 0.5, multiple: 0.5 },
  // Real Estate
  re_development: { dcf: 0.75, multiple: 0.25 },
  re_income: { dcf: 0, multiple: 1 },
  construction_contracting: { dcf: 0.4, multiple: 0.6 },
  proptech: { dcf: 0.3, multiple: 0.7 },
};

/** Alternate schema keys → canonical wizard sub-sector id. */
const SUB_SECTOR_WEIGHT_ALIASES: Record<string, keyof typeof WIZARD_SUB_SECTOR_BLEND_WEIGHTS> =
  {
    hotel_boutique: 'boutique_hotel',
    restaurants: 'restaurant_qsr',
    restaurant: 'restaurant_qsr',
    'restaurants-fb': 'restaurant_qsr',
    restaurants_fb: 'restaurant_qsr',
    events_leisure: 'vacation',
    events: 'vacation',
    b2c_tech: 'b2c_saas',
    devtools_infra: 'devtools',
    marketplace_tech: 'marketplace',
    fintech_payments: 'payments',
    fintech_lending: 'lending',
    wealth_management: 'wealth',
    enterprise_security: 'enterprise',
    cloud_zerotrust: 'cloud',
    cyber_ot_ics: 'ot',
    cyber_services: 'services_cyber',
    biotech_pharma: 'biotech',
    healthcare_services: 'services_health',
    marketing_media: 'marketing',
    logistics_distribution: 'distribution',
    food_beverage: 'food_bev',
    traditional_industry: 'traditional',
    d2c_brand: 'd2c',
    marketplace_retail: 'marketplace',
    marketplace_ecom: 'marketplace',
    physical_retail: 'specialty',
    retail_supermarkets: 'retail-supermarkets',
    retail_fashion: 'retail-fashion',
    subscriptions_box: 'subscription',
    solar_energy: 'solar',
    energy_storage: 'storage',
    wind_energy: 'wind',
    energy_services: 'services_energy',
    defense_hardware: 'defense_manufacturing',
    aerospace: 'aviation_space',
    real_estate_development: 're_development',
    real_estate_income: 're_income',
    construction_infrastructure: 'construction_contracting',
  };

function buildRegistry(): Record<string, SubSectorBlendWeightEntry> {
  const registry: Record<string, SubSectorBlendWeightEntry> = {
    ...WIZARD_SUB_SECTOR_BLEND_WEIGHTS,
  };

  for (const [alias, canonical] of Object.entries(SUB_SECTOR_WEIGHT_ALIASES)) {
    registry[alias] = WIZARD_SUB_SECTOR_BLEND_WEIGHTS[canonical];
  }

  return registry;
}

export const VALUATION_WEIGHTS_REGISTRY: Record<string, SubSectorBlendWeightEntry> =
  buildRegistry();

function validateRegistryAtLoad(): void {
  assertSubSectorBlendWeightsSum(DEFAULT_VALUATION_BLEND_WEIGHTS, 'default');
  for (const [id, entry] of Object.entries(VALUATION_WEIGHTS_REGISTRY)) {
    assertSubSectorBlendWeightsSum(entry, id);
  }
}

validateRegistryAtLoad();

export function lookupSubSectorBlendWeights(
  subSectorId: string | undefined,
): SubSectorBlendWeightEntry {
  if (!subSectorId) {
    return DEFAULT_VALUATION_BLEND_WEIGHTS;
  }

  const direct = VALUATION_WEIGHTS_REGISTRY[subSectorId];
  if (direct) {
    assertSubSectorBlendWeightsSum(direct, subSectorId);
    return direct;
  }

  return DEFAULT_VALUATION_BLEND_WEIGHTS;
}

export interface ResolveValuationBlendWeightsParams {
  subSectorId?: string;
  strategy: ValuationStrategyKind;
}

/**
 * Resolves EV blend legs for:
 *   EV = (DCF × w_dcf) + (EBITDA mult × w_ebitda) + (Rev mult × w_rev)
 *
 * Registry `multiple` routes to EBITDA or revenue leg per methodology strategy.
 */
export function resolveValuationBlendWeights(
  params: ResolveValuationBlendWeightsParams,
): EngineBlendWeights {
  const entry = lookupSubSectorBlendWeights(params.subSectorId);
  assertSubSectorBlendWeightsSum(entry, params.subSectorId ?? 'default');

  if (params.strategy === 'current_run_rate_revenue') {
    return { dcf: entry.dcf, ebitda: 0, rev: entry.multiple };
  }

  return { dcf: entry.dcf, ebitda: entry.multiple, rev: 0 };
}
