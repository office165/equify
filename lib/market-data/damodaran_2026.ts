/**
 * Damodaran market data with source (round 2, part A). GENERATED, do not edit by hand.
 * Built by scripts/damodaran/build_damodaran_ts.py from files downloaded on 2026-11-17.
 * The downloaded files are not in git. Every value carries its source key, which names the
 * file, URL, data date and region in DAMODARAN_SOURCES.
 * Used by methodology 2 (METHOD_V2) and by the report's sector-multiple footnote.
 */

export type DamodaranSourceKey =
  | 'betaGlobal'
  | 'betaEmerging'
  | 'vebitdaGlobal'
  | 'vebitdaEmerging'
  | 'psGlobal'
  | 'psEmerging'
  | 'ctryprem'
  | 'histimpl'
  | 'boiZeroCurve';

export interface DamodaranSource {
  file: string;
  url: string;
  /** Date the source states for its data (ISO). */
  dataDate: string;
  region: string;
  downloaded: string;
}

export const DAMODARAN_SOURCES: Record<DamodaranSourceKey, DamodaranSource> = {
  betaGlobal: { file: 'betaGlobal.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/betaGlobal.xls', dataDate: '2026-01-05', region: 'Global', downloaded: '2026-11-17' },
  betaEmerging: { file: 'betaemerg.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/betaemerg.xls', dataDate: '2026-01-05', region: 'Emerging Markets', downloaded: '2026-11-17' },
  vebitdaGlobal: { file: 'vebitdaGlobal.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/vebitdaGlobal.xls', dataDate: '2026-01-05', region: 'Global', downloaded: '2026-11-17' },
  vebitdaEmerging: { file: 'vebitdaemerg.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/vebitdaemerg.xls', dataDate: '2026-01-05', region: 'Emerging Markets', downloaded: '2026-11-17' },
  psGlobal: { file: 'psGlobal.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/psGlobal.xls', dataDate: '2026-01-05', region: 'Global', downloaded: '2026-11-17' },
  psEmerging: { file: 'psemerg.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/psemerg.xls', dataDate: '2026-01-05', region: 'Emerging Markets', downloaded: '2026-11-17' },
  ctryprem: { file: 'ctrypremJuly26.xlsx', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/ctrypremJuly26.xlsx', dataDate: '2026-07-01', region: 'Israel', downloaded: '2026-11-17' },
  histimpl: { file: 'histimpl.xls', url: 'https://pages.stern.nyu.edu/~adamodar/pc/datasets/histimpl.xls', dataDate: '2026-01-01', region: 'US (S&P 500, mature market)', downloaded: '2026-11-17' },
  boiZeroCurve: { file: 'BOI.STATISTICS/ZCM ZC_TSB_ZND_10Y_MA', url: 'https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0/ZC_TSB_ZND_10Y_MA', dataDate: '2026-10-31', region: 'Israel', downloaded: '2026-11-17' },
};

export interface Sourced {
  value: number;
  source: DamodaranSourceKey;
}

export interface DamodaranIndustryValues {
  /** Damodaran industry name, exactly as in the source file. */
  industry: string;
  region: 'Global' | 'Emerging Markets';
  firms: number;
  beta: Sourced;
  deRatio: Sourced;
  effectiveTax: Sourced;
  unleveredBeta: Sourced;
  unleveredBetaCash: Sourced;
  /** EV/EBITDA, only firms with positive EBITDA. */
  evEbitda: Sourced;
  /** EV/EBITDA, all firms. Null where Damodaran reports no value. */
  evEbitdaAll: Sourced | null;
  evSales: Sourced;
}

export const DAMODARAN_INDUSTRIES: Record<string, { global: DamodaranIndustryValues; emerging: DamodaranIndustryValues }> = {
  "Advertising": {
    global: {
      industry: "Advertising", region: 'Global', firms: 419,
      beta: { value: 1.272832, source: 'betaGlobal' },
      deRatio: { value: 0.405549, source: 'betaGlobal' },
      effectiveTax: { value: 0.134711, source: 'betaGlobal' },
      unleveredBeta: { value: 0.977101, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.086116, source: 'betaGlobal' },
      evEbitda: { value: 11.079834, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 14.401645, source: 'vebitdaGlobal' },
      evSales: { value: 1.522019, source: 'psGlobal' },
    },
    emerging: {
      industry: "Advertising", region: 'Emerging Markets', firms: 184,
      beta: { value: 1.439916, source: 'betaEmerging' },
      deRatio: { value: 0.31585, source: 'betaEmerging' },
      effectiveTax: { value: 0.102805, source: 'betaEmerging' },
      unleveredBeta: { value: 1.163283, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.280985, source: 'betaEmerging' },
      evEbitda: { value: 24.720433, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 46.872879, source: 'vebitdaEmerging' },
      evSales: { value: 1.91233, source: 'psEmerging' },
    },
  },
  "Aerospace/Defense": {
    global: {
      industry: "Aerospace/Defense", region: 'Global', firms: 319,
      beta: { value: 1.230945, source: 'betaGlobal' },
      deRatio: { value: 0.130004, source: 'betaGlobal' },
      effectiveTax: { value: 0.109258, source: 'betaGlobal' },
      unleveredBeta: { value: 1.122078, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.166684, source: 'betaGlobal' },
      evEbitda: { value: 22.398823, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 31.940876, source: 'vebitdaGlobal' },
      evSales: { value: 3.385246, source: 'psGlobal' },
    },
    emerging: {
      industry: "Aerospace/Defense", region: 'Emerging Markets', firms: 151,
      beta: { value: 1.282566, source: 'betaEmerging' },
      deRatio: { value: 0.120301, source: 'betaEmerging' },
      effectiveTax: { value: 0.107443, source: 'betaEmerging' },
      unleveredBeta: { value: 1.176046, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.256269, source: 'betaEmerging' },
      evEbitda: { value: 29.700613, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 39.942241, source: 'vebitdaEmerging' },
      evSales: { value: 3.849294, source: 'psEmerging' },
    },
  },
  "Building Materials": {
    global: {
      industry: "Building Materials", region: 'Global', firms: 469,
      beta: { value: 1.00483, source: 'betaGlobal' },
      deRatio: { value: 0.227795, source: 'betaGlobal' },
      effectiveTax: { value: 0.167168, source: 'betaGlobal' },
      unleveredBeta: { value: 0.858827, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.902721, source: 'betaGlobal' },
      evEbitda: { value: 12.41049, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 13.427634, source: 'vebitdaGlobal' },
      evSales: { value: 1.885104, source: 'psGlobal' },
    },
    emerging: {
      industry: "Building Materials", region: 'Emerging Markets', firms: 281,
      beta: { value: 1.005171, source: 'betaEmerging' },
      deRatio: { value: 0.2882, source: 'betaEmerging' },
      effectiveTax: { value: 0.147949, source: 'betaEmerging' },
      unleveredBeta: { value: 0.825951, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.890683, source: 'betaEmerging' },
      evEbitda: { value: 14.297471, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 15.218288, source: 'vebitdaEmerging' },
      evSales: { value: 1.798067, source: 'psEmerging' },
    },
  },
  "Business & Consumer Services": {
    global: {
      industry: "Business & Consumer Services", region: 'Global', firms: 994,
      beta: { value: 0.992146, source: 'betaGlobal' },
      deRatio: { value: 0.206069, source: 'betaGlobal' },
      effectiveTax: { value: 0.158174, source: 'betaGlobal' },
      unleveredBeta: { value: 0.859902, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.90833, source: 'betaGlobal' },
      evEbitda: { value: 14.086673, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 16.273999, source: 'vebitdaGlobal' },
      evSales: { value: 2.038494, source: 'psGlobal' },
    },
    emerging: {
      industry: "Business & Consumer Services", region: 'Emerging Markets', firms: 379,
      beta: { value: 1.097231, source: 'betaEmerging' },
      deRatio: { value: 0.152913, source: 'betaEmerging' },
      effectiveTax: { value: 0.121601, source: 'betaEmerging' },
      unleveredBeta: { value: 0.98395, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.110808, source: 'betaEmerging' },
      evEbitda: { value: 17.731521, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 27.380156, source: 'vebitdaEmerging' },
      evSales: { value: 1.683338, source: 'psEmerging' },
    },
  },
  "Computer Services": {
    global: {
      industry: "Computer Services", region: 'Global', firms: 1225,
      beta: { value: 1.11669, source: 'betaGlobal' },
      deRatio: { value: 0.150134, source: 'betaGlobal' },
      effectiveTax: { value: 0.165809, source: 'betaGlobal' },
      unleveredBeta: { value: 1.004177, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.071577, source: 'betaGlobal' },
      evEbitda: { value: 14.621894, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 16.787534, source: 'vebitdaGlobal' },
      evSales: { value: 1.462692, source: 'psGlobal' },
    },
    emerging: {
      industry: "Computer Services", region: 'Emerging Markets', firms: 693,
      beta: { value: 1.101243, source: 'betaEmerging' },
      deRatio: { value: 0.101882, source: 'betaEmerging' },
      effectiveTax: { value: 0.137783, source: 'betaEmerging' },
      unleveredBeta: { value: 1.022788, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.082244, source: 'betaEmerging' },
      evEbitda: { value: 18.304361, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 21.026117, source: 'vebitdaEmerging' },
      evSales: { value: 1.579099, source: 'psEmerging' },
    },
  },
  "Drugs (Biotechnology)": {
    global: {
      industry: "Drugs (Biotechnology)", region: 'Global', firms: 1193,
      beta: { value: 1.23079, source: 'betaGlobal' },
      deRatio: { value: 0.123499, source: 'betaGlobal' },
      effectiveTax: { value: 0.020812, source: 'betaGlobal' },
      unleveredBeta: { value: 1.126925, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.180809, source: 'betaGlobal' },
      evEbitda: { value: 16.713926, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 61.717487, source: 'vebitdaGlobal' },
      evSales: { value: 7.941243, source: 'psGlobal' },
    },
    emerging: {
      industry: "Drugs (Biotechnology)", region: 'Emerging Markets', firms: 382,
      beta: { value: 1.423716, source: 'betaEmerging' },
      deRatio: { value: 0.084475, source: 'betaEmerging' },
      effectiveTax: { value: 0.032739, source: 'betaEmerging' },
      unleveredBeta: { value: 1.33858, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.413424, source: 'betaEmerging' },
      evEbitda: { value: 32.102212, source: 'vebitdaEmerging' },
      evEbitdaAll: null, // not reported by Damodaran (aggregate EBITDA not positive)
      evSales: { value: 10.811172, source: 'psEmerging' },
    },
  },
  "Engineering/Construction": {
    global: {
      industry: "Engineering/Construction", region: 'Global', firms: 1390,
      beta: { value: 1.001049, source: 'betaGlobal' },
      deRatio: { value: 0.765519, source: 'betaGlobal' },
      effectiveTax: { value: 0.176579, source: 'betaGlobal' },
      unleveredBeta: { value: 0.637081, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.759317, source: 'betaGlobal' },
      evEbitda: { value: 11.256762, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 13.080618, source: 'vebitdaGlobal' },
      evSales: { value: 0.833142, source: 'psGlobal' },
    },
    emerging: {
      industry: "Engineering/Construction", region: 'Emerging Markets', firms: 999,
      beta: { value: 1.020138, source: 'betaEmerging' },
      deRatio: { value: 1.444944, source: 'betaEmerging' },
      effectiveTax: { value: 0.15916, source: 'betaEmerging' },
      unleveredBeta: { value: 0.488596, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.612949, source: 'betaEmerging' },
      evEbitda: { value: 10.836103, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 12.145363, source: 'vebitdaEmerging' },
      evSales: { value: 0.701253, source: 'psEmerging' },
    },
  },
  "Financial Svcs. (Non-bank & Insurance)": {
    global: {
      industry: "Financial Svcs. (Non-bank & Insurance)", region: 'Global', firms: 1138,
      beta: { value: 0.823488, source: 'betaGlobal' },
      deRatio: { value: 2.648145, source: 'betaGlobal' },
      effectiveTax: { value: 0.159055, source: 'betaGlobal' },
      unleveredBeta: { value: 0.276681, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.295115, source: 'betaGlobal' },
      evEbitda: { value: 43.421409, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 85.76847, source: 'vebitdaGlobal' },
      evSales: { value: 13.715456, source: 'psGlobal' },
    },
    emerging: {
      industry: "Financial Svcs. (Non-bank & Insurance)", region: 'Emerging Markets', firms: 697,
      beta: { value: 0.698908, source: 'betaEmerging' },
      deRatio: { value: 1.166351, source: 'betaEmerging' },
      effectiveTax: { value: 0.170842, source: 'betaEmerging' },
      unleveredBeta: { value: 0.372127, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.404143, source: 'betaEmerging' },
      evEbitda: { value: 16.041146, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 99.344173, source: 'vebitdaEmerging' },
      evSales: { value: 8.378803, source: 'psEmerging' },
    },
  },
  "Food Processing": {
    global: {
      industry: "Food Processing", region: 'Global', firms: 1450,
      beta: { value: 0.673724, source: 'betaGlobal' },
      deRatio: { value: 0.371026, source: 'betaGlobal' },
      effectiveTax: { value: 0.163516, source: 'betaGlobal' },
      unleveredBeta: { value: 0.527626, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.560225, source: 'betaGlobal' },
      evEbitda: { value: 11.072076, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 11.801585, source: 'vebitdaGlobal' },
      evSales: { value: 1.343451, source: 'psGlobal' },
    },
    emerging: {
      industry: "Food Processing", region: 'Emerging Markets', firms: 1030,
      beta: { value: 0.720449, source: 'betaEmerging' },
      deRatio: { value: 0.380045, source: 'betaEmerging' },
      effectiveTax: { value: 0.163605, source: 'betaEmerging' },
      unleveredBeta: { value: 0.560165, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.608327, source: 'betaEmerging' },
      evEbitda: { value: 11.052898, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 12.200053, source: 'vebitdaEmerging' },
      evSales: { value: 1.316635, source: 'psEmerging' },
    },
  },
  "Green & Renewable Energy": {
    global: {
      industry: "Green & Renewable Energy", region: 'Global', firms: 258,
      beta: { value: 0.836653, source: 'betaGlobal' },
      deRatio: { value: 0.714296, source: 'betaGlobal' },
      effectiveTax: { value: 0.110033, source: 'betaGlobal' },
      unleveredBeta: { value: 0.545734, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.5668, source: 'betaGlobal' },
      evEbitda: { value: 14.174838, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 15.829172, source: 'vebitdaGlobal' },
      evSales: { value: 7.38457, source: 'psGlobal' },
    },
    emerging: {
      industry: "Green & Renewable Energy", region: 'Emerging Markets', firms: 154,
      beta: { value: 0.855087, source: 'betaEmerging' },
      deRatio: { value: 0.662238, source: 'betaEmerging' },
      effectiveTax: { value: 0.131764, source: 'betaEmerging' },
      unleveredBeta: { value: 0.570591, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.590552, source: 'betaEmerging' },
      evEbitda: { value: 15.182834, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 16.693801, source: 'vebitdaEmerging' },
      evSales: { value: 10.111425, source: 'psEmerging' },
    },
  },
  "Healthcare Products": {
    global: {
      industry: "Healthcare Products", region: 'Global', firms: 842,
      beta: { value: 1.181954, source: 'betaGlobal' },
      deRatio: { value: 0.138614, source: 'betaGlobal' },
      effectiveTax: { value: 0.084512, source: 'betaGlobal' },
      unleveredBeta: { value: 1.071146, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.11651, source: 'betaGlobal' },
      evEbitda: { value: 18.549205, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 21.613089, source: 'vebitdaGlobal' },
      evSales: { value: 4.172189, source: 'psGlobal' },
    },
    emerging: {
      industry: "Healthcare Products", region: 'Emerging Markets', firms: 380,
      beta: { value: 1.381342, source: 'betaEmerging' },
      deRatio: { value: 0.09221, source: 'betaEmerging' },
      effectiveTax: { value: 0.087492, source: 'betaEmerging' },
      unleveredBeta: { value: 1.291667, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.433944, source: 'betaEmerging' },
      evEbitda: { value: 21.059589, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 27.859537, source: 'vebitdaEmerging' },
      evSales: { value: 4.508846, source: 'psEmerging' },
    },
  },
  "Healthcare Support Services": {
    global: {
      industry: "Healthcare Support Services", region: 'Global', firms: 478,
      beta: { value: 0.916559, source: 'betaGlobal' },
      deRatio: { value: 0.381262, source: 'betaGlobal' },
      effectiveTax: { value: 0.146225, source: 'betaGlobal' },
      unleveredBeta: { value: 0.713533, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.778672, source: 'betaGlobal' },
      evEbitda: { value: 11.287497, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 12.22271, source: 'vebitdaGlobal' },
      evSales: { value: 0.490231, source: 'psGlobal' },
    },
    emerging: {
      industry: "Healthcare Support Services", region: 'Emerging Markets', firms: 256,
      beta: { value: 0.968471, source: 'betaEmerging' },
      deRatio: { value: 0.616251, source: 'betaEmerging' },
      effectiveTax: { value: 0.142581, source: 'betaEmerging' },
      unleveredBeta: { value: 0.661535, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.778451, source: 'betaEmerging' },
      evEbitda: { value: 11.111207, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 13.969157, source: 'vebitdaEmerging' },
      evSales: { value: 0.575412, source: 'psEmerging' },
    },
  },
  "Heathcare Information and Technology": {
    global: {
      industry: "Heathcare Information and Technology", region: 'Global', firms: 430,
      beta: { value: 1.28992, source: 'betaGlobal' },
      deRatio: { value: 0.139584, source: 'betaGlobal' },
      effectiveTax: { value: 0.078581, source: 'betaGlobal' },
      unleveredBeta: { value: 1.168224, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.207249, source: 'betaGlobal' },
      evEbitda: { value: 20.956994, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 27.299613, source: 'vebitdaGlobal' },
      evSales: { value: 5.32244, source: 'psGlobal' },
    },
    emerging: {
      industry: "Heathcare Information and Technology", region: 'Emerging Markets', firms: 146,
      beta: { value: 1.559137, source: 'betaEmerging' },
      deRatio: { value: 0.065866, source: 'betaEmerging' },
      effectiveTax: { value: 0.081961, source: 'betaEmerging' },
      unleveredBeta: { value: 1.485471, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.562276, source: 'betaEmerging' },
      evEbitda: { value: 25.410154, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 41.015532, source: 'vebitdaEmerging' },
      evSales: { value: 8.300899, source: 'psEmerging' },
    },
  },
  "Hotel/Gaming": {
    global: {
      industry: "Hotel/Gaming", region: 'Global', firms: 656,
      beta: { value: 0.79843, source: 'betaGlobal' },
      deRatio: { value: 0.402402, source: 'betaGlobal' },
      effectiveTax: { value: 0.150648, source: 'betaGlobal' },
      unleveredBeta: { value: 0.614029, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.656224, source: 'betaGlobal' },
      evEbitda: { value: 13.868182, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 16.027784, source: 'vebitdaGlobal' },
      evSales: { value: 3.448704, source: 'psGlobal' },
    },
    emerging: {
      industry: "Hotel/Gaming", region: 'Emerging Markets', firms: 427,
      beta: { value: 0.704398, source: 'betaEmerging' },
      deRatio: { value: 0.453709, source: 'betaEmerging' },
      effectiveTax: { value: 0.156291, source: 'betaEmerging' },
      unleveredBeta: { value: 0.525044, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.579802, source: 'betaEmerging' },
      evEbitda: { value: 13.590456, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 14.730899, source: 'vebitdaEmerging' },
      evSales: { value: 3.09019, source: 'psEmerging' },
    },
  },
  "Information Services": {
    global: {
      industry: "Information Services", region: 'Global', firms: 86,
      beta: { value: 1.023721, source: 'betaGlobal' },
      deRatio: { value: 0.319803, source: 'betaGlobal' },
      effectiveTax: { value: 0.198179, source: 'betaGlobal' },
      unleveredBeta: { value: 0.826468, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.873736, source: 'betaGlobal' },
      evEbitda: { value: 10.769732, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 12.019845, source: 'vebitdaGlobal' },
      evSales: { value: 1.882718, source: 'psGlobal' },
    },
    emerging: {
      industry: "Information Services", region: 'Emerging Markets', firms: 49,
      beta: { value: 1.065802, source: 'betaEmerging' },
      deRatio: { value: 0.14123, source: 'betaEmerging' },
      effectiveTax: { value: 0.179827, source: 'betaEmerging' },
      unleveredBeta: { value: 0.963365, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.02913, source: 'betaEmerging' },
      evEbitda: { value: 12.922552, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 15.688421, source: 'vebitdaEmerging' },
      evSales: { value: 2.022037, source: 'psEmerging' },
    },
  },
  "Insurance (General)": {
    global: {
      industry: "Insurance (General)", region: 'Global', firms: 204,
      beta: { value: 0.510236, source: 'betaGlobal' },
      deRatio: { value: 0.300615, source: 'betaGlobal' },
      effectiveTax: { value: 0.153815, source: 'betaGlobal' },
      unleveredBeta: { value: 0.41674, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.473078, source: 'betaGlobal' },
      evEbitda: { value: 9.002255, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 12.346226, source: 'vebitdaGlobal' },
      evSales: { value: 1.563539, source: 'psGlobal' },
    },
    emerging: {
      industry: "Insurance (General)", region: 'Emerging Markets', firms: 140,
      beta: { value: 0.37417, source: 'betaEmerging' },
      deRatio: { value: 0.308826, source: 'betaEmerging' },
      effectiveTax: { value: 0.143771, source: 'betaEmerging' },
      unleveredBeta: { value: 0.303583, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.363839, source: 'betaEmerging' },
      evEbitda: { value: 7.978691, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 10.941687, source: 'vebitdaEmerging' },
      evSales: { value: 1.34115, source: 'psEmerging' },
    },
  },
  "Investments & Asset Management": {
    global: {
      industry: "Investments & Asset Management", region: 'Global', firms: 1315,
      beta: { value: 0.74834, source: 'betaGlobal' },
      deRatio: { value: 0.603389, source: 'betaGlobal' },
      effectiveTax: { value: 0.072832, source: 'betaGlobal' },
      unleveredBeta: { value: 0.515987, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.565713, source: 'betaGlobal' },
      evEbitda: { value: 19.002309, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 26.647045, source: 'vebitdaGlobal' },
      evSales: { value: 5.445434, source: 'psGlobal' },
    },
    emerging: {
      industry: "Investments & Asset Management", region: 'Emerging Markets', firms: 486,
      beta: { value: 0.668714, source: 'betaEmerging' },
      deRatio: { value: 0.894394, source: 'betaEmerging' },
      effectiveTax: { value: 0.088836, source: 'betaEmerging' },
      unleveredBeta: { value: 0.399616, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.414602, source: 'betaEmerging' },
      evEbitda: { value: 16.12283, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 48.537325, source: 'vebitdaEmerging' },
      evSales: { value: 10.017524, source: 'psEmerging' },
    },
  },
  "Machinery": {
    global: {
      industry: "Machinery", region: 'Global', firms: 1553,
      beta: { value: 1.369474, source: 'betaGlobal' },
      deRatio: { value: 0.135557, source: 'betaGlobal' },
      effectiveTax: { value: 0.159921, source: 'betaGlobal' },
      unleveredBeta: { value: 1.243658, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.329622, source: 'betaGlobal' },
      evEbitda: { value: 16.88409, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 19.742757, source: 'vebitdaGlobal' },
      evSales: { value: 2.613749, source: 'psGlobal' },
    },
    emerging: {
      industry: "Machinery", region: 'Emerging Markets', firms: 987,
      beta: { value: 1.511374, source: 'betaEmerging' },
      deRatio: { value: 0.121978, source: 'betaEmerging' },
      effectiveTax: { value: 0.14079, source: 'betaEmerging' },
      unleveredBeta: { value: 1.384249, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.495569, source: 'betaEmerging' },
      evEbitda: { value: 24.978185, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 34.500437, source: 'vebitdaEmerging' },
      evSales: { value: 3.235024, source: 'psEmerging' },
    },
  },
  "R.E.I.T.": {
    global: {
      industry: "R.E.I.T.", region: 'Global', firms: 643,
      beta: { value: 0.564916, source: 'betaGlobal' },
      deRatio: { value: 0.800745, source: 'betaGlobal' },
      effectiveTax: { value: 0.039721, source: 'betaGlobal' },
      unleveredBeta: { value: 0.353604, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.361711, source: 'betaGlobal' },
      evEbitda: { value: 19.695829, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 24.322705, source: 'vebitdaGlobal' },
      evSales: { value: 10.834232, source: 'psGlobal' },
    },
    emerging: {
      industry: "R.E.I.T.", region: 'Emerging Markets', firms: 208,
      beta: { value: 0.447675, source: 'betaEmerging' },
      deRatio: { value: 0.57268, source: 'betaEmerging' },
      effectiveTax: { value: 0.024724, source: 'betaEmerging' },
      unleveredBeta: { value: 0.312803, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.321537, source: 'betaEmerging' },
      evEbitda: { value: 16.849182, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 26.060233, source: 'vebitdaEmerging' },
      evSales: { value: 11.269588, source: 'psEmerging' },
    },
  },
  "Real Estate (Development)": {
    global: {
      industry: "Real Estate (Development)", region: 'Global', firms: 895,
      beta: { value: 0.925596, source: 'betaGlobal' },
      deRatio: { value: 1.911843, source: 'betaGlobal' },
      effectiveTax: { value: 0.145205, source: 'betaGlobal' },
      unleveredBeta: { value: 0.381405, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.445943, source: 'betaGlobal' },
      evEbitda: { value: 14.08181, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 39.788163, source: 'vebitdaGlobal' },
      evSales: { value: 2.082497, source: 'psGlobal' },
    },
    emerging: {
      industry: "Real Estate (Development)", region: 'Emerging Markets', firms: 786,
      beta: { value: 0.959009, source: 'betaEmerging' },
      deRatio: { value: 1.967436, source: 'betaEmerging' },
      effectiveTax: { value: 0.141965, source: 'betaEmerging' },
      unleveredBeta: { value: 0.386497, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.452216, source: 'betaEmerging' },
      evEbitda: { value: 14.155164, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 41.534555, source: 'vebitdaEmerging' },
      evSales: { value: 2.089519, source: 'psEmerging' },
    },
  },
  "Real Estate (Operations & Services)": {
    global: {
      industry: "Real Estate (Operations & Services)", region: 'Global', firms: 752,
      beta: { value: 0.781762, source: 'betaGlobal' },
      deRatio: { value: 0.825024, source: 'betaGlobal' },
      effectiveTax: { value: 0.142715, source: 'betaGlobal' },
      unleveredBeta: { value: 0.483849, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.514124, source: 'betaGlobal' },
      evEbitda: { value: 18.464484, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 23.639521, source: 'vebitdaGlobal' },
      evSales: { value: 4.149272, source: 'psGlobal' },
    },
    emerging: {
      industry: "Real Estate (Operations & Services)", region: 'Emerging Markets', firms: 406,
      beta: { value: 0.791719, source: 'betaEmerging' },
      deRatio: { value: 0.613223, source: 'betaEmerging' },
      effectiveTax: { value: 0.14093, source: 'betaEmerging' },
      unleveredBeta: { value: 0.541644, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.58981, source: 'betaEmerging' },
      evEbitda: { value: 14.773798, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 17.031088, source: 'vebitdaEmerging' },
      evSales: { value: 4.409239, source: 'psEmerging' },
    },
  },
  "Restaurant/Dining": {
    global: {
      industry: "Restaurant/Dining", region: 'Global', firms: 410,
      beta: { value: 0.754704, source: 'betaGlobal' },
      deRatio: { value: 0.26014, source: 'betaGlobal' },
      effectiveTax: { value: 0.152123, source: 'betaGlobal' },
      unleveredBeta: { value: 0.632005, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.660626, source: 'betaGlobal' },
      evEbitda: { value: 16.596544, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 18.522948, source: 'vebitdaGlobal' },
      evSales: { value: 2.473223, source: 'psGlobal' },
    },
    emerging: {
      industry: "Restaurant/Dining", region: 'Emerging Markets', firms: 184,
      beta: { value: 0.819396, source: 'betaEmerging' },
      deRatio: { value: 0.134276, source: 'betaEmerging' },
      effectiveTax: { value: 0.123084, source: 'betaEmerging' },
      unleveredBeta: { value: 0.744164, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.81797, source: 'betaEmerging' },
      evEbitda: { value: 20.691669, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 17.291585, source: 'vebitdaEmerging' },
      evSales: { value: 1.826457, source: 'psEmerging' },
    },
  },
  "Retail (Distributors)": {
    global: {
      industry: "Retail (Distributors)", region: 'Global', firms: 1079,
      beta: { value: 0.813594, source: 'betaGlobal' },
      deRatio: { value: 0.483356, source: 'betaGlobal' },
      effectiveTax: { value: 0.174825, source: 'betaGlobal' },
      unleveredBeta: { value: 0.597911, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.642787, source: 'betaGlobal' },
      evEbitda: { value: 14.414583, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 15.648112, source: 'vebitdaGlobal' },
      evSales: { value: 0.971487, source: 'psGlobal' },
    },
    emerging: {
      industry: "Retail (Distributors)", region: 'Emerging Markets', firms: 731,
      beta: { value: 0.757748, source: 'betaEmerging' },
      deRatio: { value: 0.878973, source: 'betaEmerging' },
      effectiveTax: { value: 0.15445, source: 'betaEmerging' },
      unleveredBeta: { value: 0.455986, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.532707, source: 'betaEmerging' },
      evEbitda: { value: 14.158554, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 15.287215, source: 'vebitdaEmerging' },
      evSales: { value: 0.583559, source: 'psEmerging' },
    },
  },
  "Retail (General)": {
    global: {
      industry: "Retail (General)", region: 'Global', firms: 252,
      beta: { value: 0.982546, source: 'betaGlobal' },
      deRatio: { value: 0.130445, source: 'betaGlobal' },
      effectiveTax: { value: 0.176739, source: 'betaGlobal' },
      unleveredBeta: { value: 0.895379, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.937278, source: 'betaGlobal' },
      evEbitda: { value: 17.096736, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 20.390368, source: 'vebitdaGlobal' },
      evSales: { value: 1.932231, source: 'psGlobal' },
    },
    emerging: {
      industry: "Retail (General)", region: 'Emerging Markets', firms: 147,
      beta: { value: 1.034361, source: 'betaEmerging' },
      deRatio: { value: 0.366482, source: 'betaEmerging' },
      effectiveTax: { value: 0.160107, source: 'betaEmerging' },
      unleveredBeta: { value: 0.810676, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.890169, source: 'betaEmerging' },
      evEbitda: { value: 14.860055, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 17.630872, source: 'vebitdaEmerging' },
      evSales: { value: 1.421429, source: 'psEmerging' },
    },
  },
  "Retail (Grocery and Food)": {
    global: {
      industry: "Retail (Grocery and Food)", region: 'Global', firms: 215,
      beta: { value: 0.873527, source: 'betaGlobal' },
      deRatio: { value: 0.459612, source: 'betaGlobal' },
      effectiveTax: { value: 0.208093, source: 'betaGlobal' },
      unleveredBeta: { value: 0.650426, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.690517, source: 'betaGlobal' },
      evEbitda: { value: 10.342817, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 11.321263, source: 'vebitdaGlobal' },
      evSales: { value: 0.667738, source: 'psGlobal' },
    },
    emerging: {
      industry: "Retail (Grocery and Food)", region: 'Emerging Markets', firms: 97,
      beta: { value: 1.013993, source: 'betaEmerging' },
      deRatio: { value: 0.37794, source: 'betaEmerging' },
      effectiveTax: { value: 0.175296, source: 'betaEmerging' },
      unleveredBeta: { value: 0.789376, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.856215, source: 'betaEmerging' },
      evEbitda: { value: 12.704912, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 14.706314, source: 'vebitdaEmerging' },
      evSales: { value: 0.841461, source: 'psEmerging' },
    },
  },
  "Retail (Special Lines)": {
    global: {
      industry: "Retail (Special Lines)", region: 'Global', firms: 649,
      beta: { value: 0.960416, source: 'betaGlobal' },
      deRatio: { value: 0.18365, source: 'betaGlobal' },
      effectiveTax: { value: 0.169212, source: 'betaGlobal' },
      unleveredBeta: { value: 0.84465, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.903639, source: 'betaGlobal' },
      evEbitda: { value: 13.109713, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 16.909429, source: 'vebitdaGlobal' },
      evSales: { value: 1.49498, source: 'psGlobal' },
    },
    emerging: {
      industry: "Retail (Special Lines)", region: 'Emerging Markets', firms: 282,
      beta: { value: 0.896298, source: 'betaEmerging' },
      deRatio: { value: 0.194503, source: 'betaEmerging' },
      effectiveTax: { value: 0.161152, source: 'betaEmerging' },
      unleveredBeta: { value: 0.781809, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.853284, source: 'betaEmerging' },
      evEbitda: { value: 15.318931, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 19.664896, source: 'vebitdaEmerging' },
      evSales: { value: 1.415627, source: 'psEmerging' },
    },
  },
  "Software (Internet)": {
    global: {
      industry: "Software (Internet)", region: 'Global', firms: 150,
      beta: { value: 1.392132, source: 'betaGlobal' },
      deRatio: { value: 0.100125, source: 'betaGlobal' },
      effectiveTax: { value: 0.113249, source: 'betaGlobal' },
      unleveredBeta: { value: 1.29534, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.33704, source: 'betaGlobal' },
      evEbitda: { value: 40.550719, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 79.587777, source: 'vebitdaGlobal' },
      evSales: { value: 7.728498, source: 'psGlobal' },
    },
    emerging: {
      industry: "Software (Internet)", region: 'Emerging Markets', firms: 49,
      beta: { value: 1.417843, source: 'betaEmerging' },
      deRatio: { value: 0.158353, source: 'betaEmerging' },
      effectiveTax: { value: 0.122558, source: 'betaEmerging' },
      unleveredBeta: { value: 1.266809, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.329191, source: 'betaEmerging' },
      evEbitda: { value: 42.388013, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 48.294611, source: 'vebitdaEmerging' },
      evSales: { value: 3.167211, source: 'psEmerging' },
    },
  },
  "Software (System & Application)": {
    global: {
      industry: "Software (System & Application)", region: 'Global', firms: 1532,
      beta: { value: 1.353955, source: 'betaGlobal' },
      deRatio: { value: 0.058356, source: 'betaGlobal' },
      effectiveTax: { value: 0.090352, source: 'betaGlobal' },
      unleveredBeta: { value: 1.29745, source: 'betaGlobal' },
      unleveredBetaCash: { value: 1.33095, source: 'betaGlobal' },
      evEbitda: { value: 24.639465, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 33.215565, source: 'vebitdaGlobal' },
      evSales: { value: 9.912803, source: 'psGlobal' },
    },
    emerging: {
      industry: "Software (System & Application)", region: 'Emerging Markets', firms: 548,
      beta: { value: 1.584698, source: 'betaEmerging' },
      deRatio: { value: 0.052717, source: 'betaEmerging' },
      effectiveTax: { value: 0.082055, source: 'betaEmerging' },
      unleveredBeta: { value: 1.524201, source: 'betaEmerging' },
      unleveredBetaCash: { value: 1.63966, source: 'betaEmerging' },
      evEbitda: { value: 40.570853, source: 'vebitdaEmerging' },
      evEbitdaAll: null, // not reported by Damodaran (aggregate EBITDA not positive)
      evSales: { value: 5.886117, source: 'psEmerging' },
    },
  },
  "Total Market (without financials)": {
    global: {
      industry: "Total Market (without financials)", region: 'Global', firms: 43056,
      beta: { value: 1.077443, source: 'betaGlobal' },
      deRatio: { value: 0.259493, source: 'betaGlobal' },
      effectiveTax: { value: 0.131254, source: 'betaGlobal' },
      unleveredBeta: { value: 0.902639, source: 'betaGlobal' },
      unleveredBetaCash: { value: 0.955364, source: 'betaGlobal' },
      evEbitda: { value: 13.697249, source: 'vebitdaGlobal' },
      evEbitdaAll: { value: 15.7736, source: 'vebitdaGlobal' },
      evSales: { value: 2.330394, source: 'psGlobal' },
    },
    emerging: {
      industry: "Total Market (without financials)", region: 'Emerging Markets', firms: 24760,
      beta: { value: 1.123049, source: 'betaEmerging' },
      deRatio: { value: 0.327753, source: 'betaEmerging' },
      effectiveTax: { value: 0.137221, source: 'betaEmerging' },
      unleveredBeta: { value: 0.90077, source: 'betaEmerging' },
      unleveredBetaCash: { value: 0.987799, source: 'betaEmerging' },
      evEbitda: { value: 12.281499, source: 'vebitdaEmerging' },
      evEbitdaAll: { value: 14.374735, source: 'vebitdaEmerging' },
      evSales: { value: 1.885807, source: 'psEmerging' },
    },
  },
};

/** Israel country risk and market inputs. */
export const DAMODARAN_ISRAEL = {
  /** Moody's sovereign rating used by Damodaran. */
  rating: 'Baa1',
  /** Country risk premium, rating-based (decimal). */
  crp: { value: 0.019783, source: 'ctryprem' } as Sourced,
  /** Country risk premium from the sovereign CDS, net of the Swiss CDS (decimal). For comparison. */
  crpCds: { value: 0.013369, source: 'ctryprem' } as Sourced,
  /** Total equity risk premium for Israel (mature ERP plus CRP, decimal). */
  totalErp: { value: 0.061783, source: 'ctryprem' } as Sourced,
  /** Implied ERP for the S&P 500 at the end of 2025 (FCFE model, decimal). */
  impliedErp: { value: 0.0423, source: 'histimpl' } as Sourced,
} as const;

/**
 * Risk-free rate: Bank of Israel nominal zero-coupon government yield, 10 years, monthly average.
 * Verified 2026-11-17 (October 2026 average). Methodology 1 keeps 4.5% (capm_wacc.ts).
 */
export const ISRAEL_RISK_FREE = { value: 0.042379, source: 'boiZeroCurve' as DamodaranSourceKey, verified: true, asOf: '2026-10' } as const;

export interface SubSectorMapping {
  sector: string;
  subSector: string;
  industry: string;
  reason: string;
}

/** Each of the 50 wizard sub-sectors mapped to one Damodaran industry, with a one-line reason. */
export const DAMODARAN_SUBSECTOR_MAP: SubSectorMapping[] = [
  { sector: 'hospitality', subSector: 'boutique_hotel', industry: "Hotel/Gaming", reason: "מלון בוטיק הוא לינה ואירוח, הענף של מלונות אצל Damodaran" },
  { sector: 'hospitality', subSector: 'hotel_chain', industry: "Hotel/Gaming", reason: "רשת מלונות, אותו ענף כמו מלון בודד" },
  { sector: 'hospitality', subSector: 'vacation', industry: "Hotel/Gaming", reason: "נופש ואתרי לינה, הכנסה מאירוח" },
  { sector: 'hospitality', subSector: 'airbnb_mgmt', industry: "Real Estate (Operations & Services)", reason: "ניהול נכסים להשכרה קצרה, שירות על נדל\"ן של אחרים ולא בעלות על מלון" },
  { sector: 'saas', subSector: 'b2b_saas', industry: "Software (System & Application)", reason: "תוכנה עסקית במנוי" },
  { sector: 'saas', subSector: 'b2c_saas', industry: "Software (Internet)", reason: "תוכנה לצרכן שנמכרת ברשת" },
  { sector: 'saas', subSector: 'devtools', industry: "Software (System & Application)", reason: "כלי פיתוח ותשתית תוכנה" },
  { sector: 'saas', subSector: 'marketplace', industry: "Software (Internet)", reason: "פלטפורמת מסחר מקוונת שמרוויחה מעמלות" },
  { sector: 'fintech', subSector: 'payments', industry: "Information Services", reason: "עיבוד תשלומים הוא שירות מידע ותוכנה, בלי מאזן אשראי של בנק" },
  { sector: 'fintech', subSector: 'lending', industry: "Financial Svcs. (Non-bank & Insurance)", reason: "אשראי חוץ בנקאי" },
  { sector: 'fintech', subSector: 'insurtech', industry: "Insurance (General)", reason: "חברת ביטוח מבוססת טכנולוגיה" },
  { sector: 'fintech', subSector: 'wealth', industry: "Investments & Asset Management", reason: "ניהול הון והשקעות" },
  { sector: 'cyber', subSector: 'enterprise', industry: "Software (System & Application)", reason: "תוכנת אבטחה לארגונים" },
  { sector: 'cyber', subSector: 'cloud', industry: "Software (System & Application)", reason: "אבטחת ענן היא תוכנה במנוי" },
  { sector: 'cyber', subSector: 'ot', industry: "Software (System & Application)", reason: "אבטחת מערכות תעשייתיות, בעיקר תוכנה" },
  { sector: 'cyber', subSector: 'services_cyber', industry: "Computer Services", reason: "שירותי אבטחה ויישום, שירותי מחשוב" },
  { sector: 'health', subSector: 'medtech', industry: "Healthcare Products", reason: "מכשור רפואי" },
  { sector: 'health', subSector: 'biotech', industry: "Drugs (Biotechnology)", reason: "פיתוח תרופות ביולוגיות" },
  { sector: 'health', subSector: 'digital_health', industry: "Heathcare Information and Technology", reason: "תוכנה ומידע רפואי" },
  { sector: 'health', subSector: 'services_health', industry: "Healthcare Support Services", reason: "מתן שירותי בריאות ותמיכה" },
  { sector: 'services', subSector: 'consulting', industry: "Business & Consumer Services", reason: "שירותים מקצועיים לעסקים" },
  { sector: 'services', subSector: 'legal', industry: "Business & Consumer Services", reason: "משרד עורכי דין, שירות מקצועי לעסקים" },
  { sector: 'services', subSector: 'accounting', industry: "Business & Consumer Services", reason: "משרד רואי חשבון, שירות מקצועי לעסקים" },
  { sector: 'services', subSector: 'marketing', industry: "Advertising", reason: "שיווק ומדיה, הענף של משרדי פרסום" },
  { sector: 'industry', subSector: 'manufacturing', industry: "Machinery", reason: "ייצור תעשייתי כללי, הענף התעשייתי הרחב והקרוב" },
  { sector: 'industry', subSector: 'distribution', industry: "Retail (Distributors)", reason: "הפצה וסיטונאות" },
  { sector: 'industry', subSector: 'food_bev', industry: "Food Processing", reason: "ייצור מזון ומשקאות" },
  { sector: 'industry', subSector: 'traditional', industry: "Building Materials", reason: "תעשייה מסורתית עתירת הון (מתכת, פלסטיק, בנייה), הקירוב הקרוב ביותר" },
  { sector: 'retail_unified', subSector: 'retail-supermarkets', industry: "Retail (Grocery and Food)", reason: "קמעונאות מזון" },
  { sector: 'retail_unified', subSector: 'd2c', industry: "Retail (General)", reason: "מכירה ישירה לצרכן, קמעונאות כללית" },
  { sector: 'retail_unified', subSector: 'retail-fashion', industry: "Retail (Special Lines)", reason: "חנויות אופנה, קמעונאות ייעודית" },
  { sector: 'retail_unified', subSector: 'marketplace', industry: "Software (Internet)", reason: "מרקטפלייס מקוון, פלטפורמה ולא מלאי" },
  { sector: 'retail_unified', subSector: 'specialty', industry: "Retail (Special Lines)", reason: "קמעונאות ייעודית" },
  { sector: 'food_service', subSector: 'restaurant', industry: "Restaurant/Dining", reason: "מסעדה" },
  { sector: 'food_service', subSector: 'cafe', industry: "Restaurant/Dining", reason: "בית קפה, מסעדנות" },
  { sector: 'food_service', subSector: 'catering', industry: "Restaurant/Dining", reason: "קייטרינג, מסעדנות" },
  { sector: 'food_service', subSector: 'franchise', industry: "Restaurant/Dining", reason: "רשת זכיינות מזון" },
  { sector: 'food_service', subSector: 'delivery', industry: "Restaurant/Dining", reason: "משלוחי מזון ומטבחים, מסעדנות" },
  { sector: 'energy', subSector: 'solar', industry: "Green & Renewable Energy", reason: "ייצור חשמל סולארי" },
  { sector: 'energy', subSector: 'storage', industry: "Green & Renewable Energy", reason: "אגירת אנרגיה מתחדשת" },
  { sector: 'energy', subSector: 'wind', industry: "Green & Renewable Energy", reason: "ייצור חשמל מרוח" },
  { sector: 'energy', subSector: 'services_energy', industry: "Engineering/Construction", reason: "הקמה ותחזוקה של מתקני אנרגיה, עבודות הנדסה" },
  { sector: 'defense_aerospace', subSector: 'defense_manufacturing', industry: "Aerospace/Defense", reason: "ייצור ביטחוני" },
  { sector: 'defense_aerospace', subSector: 'aviation_space', industry: "Aerospace/Defense", reason: "תעופה וחלל" },
  { sector: 'defense_aerospace', subSector: 'defense_tech', industry: "Aerospace/Defense", reason: "טכנולוגיה ביטחונית" },
  { sector: 'real_estate', subSector: 're_development', industry: "Real Estate (Development)", reason: "ייזום נדל\"ן" },
  { sector: 'real_estate', subSector: 're_income', industry: "R.E.I.T.", reason: "נדל\"ן מניב, הכנסה משכירות כמו בקרנות ריט" },
  { sector: 'real_estate', subSector: 'construction_contracting', industry: "Engineering/Construction", reason: "קבלנות ביצוע" },
  { sector: 'real_estate', subSector: 'proptech', industry: "Real Estate (Operations & Services)", reason: "שירותי נדל\"ן מבוססי טכנולוגיה" },
  { sector: 'other', subSector: 'general', industry: "Total Market (without financials)", reason: "אין ענף ספציפי, ממוצע השוק בלי פיננסים" },
];

export function damodaranMappingFor(sector: string, subSector: string): SubSectorMapping | undefined {
  return DAMODARAN_SUBSECTOR_MAP.find((m) => m.sector === sector && m.subSector === subSector);
}

/** Industry values for a wizard sub-sector, or undefined when it is not mapped. */
export function damodaranIndustryFor(sector: string, subSector: string) {
  const m = damodaranMappingFor(sector, subSector);
  return m ? DAMODARAN_INDUSTRIES[m.industry] : undefined;
}

/** Low and high of a multiple across the Global and Emerging Markets values. */
export function damodaranRange(sector: string, subSector: string, field: 'evEbitda' | 'evSales'): { low: number; high: number } | undefined {
  const v = damodaranIndustryFor(sector, subSector);
  if (!v) return undefined;
  const a = v.global[field].value;
  const b = v.emerging[field].value;
  return { low: Math.min(a, b), high: Math.max(a, b) };
}
