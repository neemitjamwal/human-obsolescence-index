import occupationsFile from '../data/occupations.json';
import sourcesFile from '../data/sources.json';
import type { BlsCategory } from './ledger';

export type Sourced<T> = { value: T; sourceId: string };

export type Source = {
  id: string;
  name: string;
  publisher: string;
  url: string;
  methodologyUrl?: string;
  file?: string;
  retrievedAt: string;
  sha256: string | null;
  bytes?: number;
  license: string;
  licenseUrl?: string;
  citation: string;
  derivedFrom?: string[];
};

export type Task = { id: string; text: string; type: string; importance: number | null; onetCode: string; sourceId: string };

export type AdjacentRole = {
  soc: string;
  title: string;
  slug: string;
  onIndex: boolean;
  onetCode: string;
  relatedness: string;
  sourceId: string;
  projectedChangePercent: Sourced<number>;
  obs: Sourced<number | null>;
};

export type Component = {
  label: string;
  raw: number | null;
  percentile: number | null;
  weight?: number;
  sourceId: string;
  onetCodes?: string[];
  aggregation?: string | null;
  crosswalkSourceId?: string;
};

export type Occupation = {
  soc: string;
  slug: string;
  title: string;
  titleSourceId: string;
  rank: number;
  leaderboardRank: number | null;
  inclusion: string[];
  scores: {
    obs: Sourced<number | null> & { inputs: string[] };
    exposure: Sourced<number | null> & { inputs: string[] };
    trajectory: Sourced<number | null> & { inputs: string[] };
  };
  components: { microsoft: Component; eloundou: Component; employmentChange: Component };
  blsCategory: Sourced<BlsCategory | null>;
  employment: Sourced<number | null> & { year: number };
  oesEmployment: Sourced<number | null> & { reference: string };
  projectedChange: {
    numeric: Sourced<number | null>;
    percent: Sourced<number | null>;
    employment2035: Sourced<number | null>;
  };
  openings: Sourced<number | null> & { period: string };
  medianWage: Sourced<number | null> & { topCoded: boolean; reference: string };
  oohUrl: Sourced<string | null>;
  tasks: Task[];
  adjacentRoles: AdjacentRole[];
  coverage: { complete: boolean; missing: string[]; notes: { field: string; message: string }[] };
};

export type UniverseEntry = {
  soc: string;
  slug: string;
  title: string;
  blsCategory: BlsCategory | null;
  msft: number | null;
  eld: number | null;
  changePercent: number | null;
  oesEmployment: number | null;
  obs: number | null;
  missing: string[];
};

export type Meta = {
  edition: string;
  dataAsOf: string;
  formula: {
    exposure: string;
    trajectory: string;
    obs: string;
    weights: { microsoft: number; eloundou: number; exposure: number; trajectory: number };
    percentile: string;
    eloundouAggregation: string;
    rounding: string;
  };
  universe: {
    size: number;
    source: string;
    microsoftCovered: number;
    microsoftMissing: number;
    microsoftOutsideUniverse: string[];
    eloundouCovered: number;
    bothExposureComponents: number;
    oesCovered: number;
    blsCategoryCovered: number;
    obsScored: number;
  };
  leaderboard: { rule: string; minOesEmployment: number; size: number; eligible: number; cutoffObs: number };
  forcedInclusions: {
    fastestDeclining: { source: string; sourceId: string; socs: string[] };
    contrast: { reason: string; socs: string[] };
    museumPrecedent: { reason: string; socs: string[] };
  };
  selectedCount: number;
};

const file = occupationsFile as unknown as { meta: Meta; occupations: Occupation[]; universe: UniverseEntry[] };

export const META: Meta = file.meta;
export const OCCUPATIONS: Occupation[] = file.occupations;
export const UNIVERSE: UniverseEntry[] = file.universe;
export const SOURCES: Source[] = (sourcesFile as unknown as { sources: Source[] }).sources;

const sourceMap = new Map(SOURCES.map((s) => [s.id, s]));

export function sourceById(id: string): Source {
  const s = sourceMap.get(id);
  if (!s) throw new Error(`Unknown sourceId "${id}" (not in sources.json)`);
  return s;
}

export function occupationPath(slug: string): string {
  return `/occupations/${slug}/`;
}

/** The ranked board, in published rank order. */
export function leaderboard(): Occupation[] {
  return OCCUPATIONS.filter((o) => o.leaderboardRank != null).sort((a, b) => a.leaderboardRank! - b.leaderboardRank!);
}

/** Forced inclusions that missed the board (fastest-declining, contrast and museum-linked picks), highest OBS first. */
export function alsoTracked(): Occupation[] {
  return OCCUPATIONS.filter((o) => o.leaderboardRank == null).sort(
    (a, b) => (b.scores.obs.value ?? -1) - (a.scores.obs.value ?? -1) || a.title.localeCompare(b.title),
  );
}

export function occupationBySlug(slug: string): Occupation | undefined {
  return OCCUPATIONS.find((o) => o.slug === slug);
}

/** Every sourceId an occupation page cites, in a stable reading order. */
export function occupationSourceIds(o: Occupation): string[] {
  const ids = [
    o.scores.obs.sourceId,
    o.components.microsoft.sourceId,
    o.components.eloundou.sourceId,
    o.components.eloundou.crosswalkSourceId,
    o.components.employmentChange.sourceId,
    o.blsCategory.sourceId,
    o.employment.sourceId,
    o.oesEmployment.sourceId,
    o.medianWage.sourceId,
    ...o.tasks.map((t) => t.sourceId),
    ...o.adjacentRoles.flatMap((r) => [r.sourceId, r.projectedChangePercent.sourceId]),
    o.oohUrl.value ? o.oohUrl.sourceId : undefined,
  ].filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

export function inclusionLabel(reason: string): string {
  switch (reason) {
    case 'leaderboard':
      return 'Leaderboard';
    case 'fastest-declining':
      return 'BLS fastest-declining';
    case 'contrast':
      return 'Contrast pick';
    case 'museum-precedent':
      return 'Museum of Extinct Jobs exhibit';
    default:
      return reason;
  }
}

/** The quarter after an edition label such as "2026-Q4". */
export function nextEdition(edition: string): string {
  const m = /^(\d{4})-Q([1-4])$/.exec(edition);
  if (!m) throw new Error(`Unexpected edition label "${edition}"`);
  const year = Number(m[1]);
  const q = Number(m[2]);
  return q === 4 ? `${year + 1}-Q1` : `${year}-Q${q + 1}`;
}
