export type ScoreBand = 'severe' | 'elevated' | 'moderate' | 'low';
export type BlsCategory = 'Very high' | 'High' | 'Moderate' | 'Low';
export type DeltaDirection = 'up' | 'down' | 'flat';

export const BLS_CATEGORIES: BlsCategory[] = ['Very high', 'High', 'Moderate', 'Low'];

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** Display band for the composite OBS score (0-100). Distinct from the BLS official category. */
export function scoreBand(score: number): ScoreBand {
  const s = clampScore(score);
  if (s >= 75) return 'severe';
  if (s >= 50) return 'elevated';
  if (s >= 25) return 'moderate';
  return 'low';
}

export const BAND_LABELS: Record<ScoreBand, string> = {
  severe: 'Severe',
  elevated: 'Elevated',
  moderate: 'Moderate',
  low: 'Low',
};

export const SCORE_BANDS: ScoreBand[] = ['severe', 'elevated', 'moderate', 'low'];
export type BandFilter = ScoreBand | 'all';

/** Leaderboard filter predicate. Keys on the composite OBS band only, never the BLS category. */
export function matchesBandFilter(band: string | undefined, filter: string | undefined): boolean {
  return filter === 'all' || band === filter;
}

/**
 * Trajectory is a 0-100 percentile where higher means weaker projected change, so below 50 means the
 * occupation's projected growth beats most others.
 */
export function relativeGrowth(trajectory: number): 'stronger' | 'weaker' {
  return trajectory < 50 ? 'stronger' : 'weaker';
}

/** A positive delta means the occupation became more obsolete. */
export function deltaDirection(delta: number | null | undefined): DeltaDirection {
  if (delta == null || !Number.isFinite(delta) || delta === 0) return 'flat';
  return delta > 0 ? 'up' : 'down';
}

export function deltaGlyph(direction: DeltaDirection): string {
  return direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■';
}

export function formatDelta(delta: number | null | undefined): string {
  const dir = deltaDirection(delta);
  if (dir === 'flat') return delta == null ? 'n/a' : '0';
  return `${dir === 'up' ? '+' : '−'}${Math.abs(delta as number)}`;
}

export function categoryClass(category: BlsCategory | null | undefined): string {
  if (!category) return 'category-none';
  return `category-${category.toLowerCase().replace(/\s+/g, '-')}`;
}
