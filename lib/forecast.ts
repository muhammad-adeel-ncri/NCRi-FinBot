const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function periodKeyToMonth(pk: number): string {
  let year = Math.floor(pk / 12);
  let m = pk % 12;
  if (m === 0) { m = 12; year--; }
  return `${MONTH_NAMES[m - 1]} ${year}`;
}

export interface HistoricalPoint {
  month: string;
  periodKey: number;
  total: number;
  byRegion: Record<string, number>;
}

export interface ForecastPoint {
  month: string;
  periodKey: number;
  total: number;
  byRegion: Record<string, number>;
}

export type Confidence = 'High' | 'Medium' | 'Low';

export interface ForecastResult {
  historical: HistoricalPoint[];
  predictions: ForecastPoint[];
  avgGrowthRate: number;
  volatility: number;
  confidence: Confidence;
  monthsOfData: number;
}

export interface ForecastRow {
  region: string;
  netPayable: number;
  periodKey: number;
}

export function computeForecast(rows: ForecastRow[], predictMonths = 3): ForecastResult {
  const periodMap: Record<number, { total: number; byRegion: Record<string, number> }> = {};
  rows.forEach((r) => {
    if (!periodMap[r.periodKey]) periodMap[r.periodKey] = { total: 0, byRegion: {} };
    periodMap[r.periodKey].total += r.netPayable;
    periodMap[r.periodKey].byRegion[r.region] = (periodMap[r.periodKey].byRegion[r.region] ?? 0) + r.netPayable;
  });

  const sortedKeys = Object.keys(periodMap).map(Number).sort((a, b) => a - b);

  const historical: HistoricalPoint[] = sortedKeys.map((pk) => ({
    month: periodKeyToMonth(pk),
    periodKey: pk,
    total: periodMap[pk].total,
    byRegion: periodMap[pk].byRegion,
  }));

  if (historical.length < 2) {
    return { historical, predictions: [], avgGrowthRate: 0, volatility: 0, confidence: 'Low', monthsOfData: historical.length };
  }

  const growthRates: number[] = [];
  for (let i = 1; i < historical.length; i++) {
    if (historical[i - 1].total > 0) {
      growthRates.push((historical[i].total - historical[i - 1].total) / historical[i - 1].total);
    }
  }

  const weights = growthRates.map((_, i) => i + 1);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const avgGrowthRate = growthRates.reduce((s, r, i) => s + r * weights[i], 0) / totalWeight;

  const mean = growthRates.reduce((s, r) => s + r, 0) / growthRates.length;
  const volatility = Math.sqrt(growthRates.reduce((s, r) => s + (r - mean) ** 2, 0) / growthRates.length);

  let confidence: Confidence = 'High';
  if (volatility > 0.05 || historical.length < 3) confidence = 'Low';
  else if (volatility > 0.02 || historical.length < 4) confidence = 'Medium';

  const regions = [...new Set(rows.map((r) => r.region))];
  const regionGrowthRates: Record<string, number> = {};
  regions.forEach((region) => {
    const regionRates: number[] = [];
    for (let i = 1; i < historical.length; i++) {
      const prev = historical[i - 1].byRegion[region] ?? 0;
      const curr = historical[i].byRegion[region] ?? 0;
      if (prev > 0) regionRates.push((curr - prev) / prev);
    }
    if (regionRates.length > 0) {
      const rW = regionRates.map((_, i) => i + 1);
      const rTotal = rW.reduce((s, w) => s + w, 0);
      regionGrowthRates[region] = regionRates.reduce((s, r, i) => s + r * rW[i], 0) / rTotal;
    } else {
      regionGrowthRates[region] = avgGrowthRate;
    }
  });

  const predictions: ForecastPoint[] = [];
  let last = historical[historical.length - 1];

  for (let m = 0; m < predictMonths; m++) {
    const nextPK = last.periodKey + 1;
    const nextByRegion: Record<string, number> = {};
    regions.forEach((region) => {
      const prev = last.byRegion[region] ?? 0;
      nextByRegion[region] = Math.round(prev * (1 + (regionGrowthRates[region] ?? avgGrowthRate)));
    });
    const nextTotal = Object.values(nextByRegion).reduce((s, v) => s + v, 0);
    const pred: ForecastPoint = { month: periodKeyToMonth(nextPK), periodKey: nextPK, total: nextTotal, byRegion: nextByRegion };
    predictions.push(pred);
    last = pred;
  }

  return { historical, predictions, avgGrowthRate, volatility, confidence, monthsOfData: historical.length };
}
