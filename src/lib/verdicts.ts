import verdictsFile from '../data/verdicts.json';
import type { BlsCategory, ScoreBand } from './ledger';

export type VerdictField =
  | 'title'
  | 'obs'
  | 'band'
  | 'blsCategory'
  | 'exposure'
  | 'trajectory'
  | 'projectedChangePct'
  | 'employment'
  | 'medianWage'
  | 'topTask';

/** Compact verdict for one scored occupation; every field traces to sources.json through sourceIds. */
export type Verdict = {
  soc: string;
  slug: string;
  title: string;
  obs: number;
  band: ScoreBand;
  blsCategory: BlsCategory | null;
  exposure: number | null;
  trajectory: number | null;
  projectedChangePct: number | null;
  employment: number | null;
  medianWage: number | null;
  topTask: string | null;
  hasFullPage: boolean;
  sourceIds: Partial<Record<VerdictField, string>>;
};

export type VerdictsMeta = { edition: string; dataAsOf: string; count: number; published: number };

const file = verdictsFile as unknown as { meta: VerdictsMeta; verdicts: Verdict[] };

export const VERDICTS_META: VerdictsMeta = file.meta;
/** Highest Doom Score first. */
export const VERDICTS: Verdict[] = file.verdicts;

const bySlug = new Map(VERDICTS.map((v) => [v.slug, v]));

export function verdictBySlug(slug: string): Verdict | undefined {
  return bySlug.get(slug);
}

export function verdictPath(slug: string): string {
  return `/v/${slug}/`;
}
