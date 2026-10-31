import { formatJobs, formatScore, formatSignedPercent, formatUsd } from './format';
import { BAND_LABELS, type BlsCategory, type ScoreBand } from './ledger';
import { possessive } from './name';
import { SITE_DOMAIN } from './site';

/** The verdict fields the reveal, the /v/ pages and the share cards print. Built at build time for every scored occupation. */
export type VerdictRecord = {
  soc: string;
  slug: string;
  title: string;
  obs: number;
  band: ScoreBand;
  blsCategory: BlsCategory | null;
  exposure: number | null;
  projectedChangePct: number | null;
  employment: number | null;
  medianWage: number | null;
  hasFullPage: boolean;
  /** Rank on the published leaderboard, null when the occupation is not on it. */
  boardRank: number | null;
  roast: string;
  roastId: string;
  /** Number-free panic layer (src/data/roasts.ts). headlineNamed keeps a {name} placeholder. */
  headline: string;
  headlineNamed: string;
  stinger: string;
  robotLine: string;
};

export type VerdictFeed = { edition: string; boardSize: number; verdicts: VerdictRecord[] };

export const DISCLAIMER_SHORT = 'AI exposure ≠ job loss';
export const FORMULA_LINE = 'Doom Score = 65% AI exposure (Microsoft + OpenAI research) + 35% BLS 2025–35 projection';

export type VerdictView = {
  slug: string;
  soc: string;
  title: string;
  score: string;
  band: ScoreBand;
  bandLabel: string;
  kicker: string;
  headline: string;
  who: string;
  rankLine: string;
  rankShort: string;
  changeLine: string;
  changeShort: string;
  employmentLine: string;
  exposureLine: string;
  blsLine: string;
  blsCategory: string;
  roast: string;
  stinger: string;
  robotLine: string;
  fine: string;
  url: string;
  edition: string;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** The front-page headline; the sanitized name replaces {name} as plain text (never markup). */
export function headlineFor(v: Pick<VerdictRecord, 'headline' | 'headlineNamed'>, name: string): string {
  return name ? v.headlineNamed.replace('{name}', name) : capitalize(v.headline);
}

/** Every string a verdict surface shows, straight from the record. Shared by the server pages and the browser. */
export function verdictView(v: VerdictRecord, feed: Pick<VerdictFeed, 'edition' | 'boardSize'>, name = ''): VerdictView {
  const change = formatSignedPercent(v.projectedChangePct);
  return {
    slug: v.slug,
    soc: v.soc,
    title: v.title,
    score: String(v.obs),
    band: v.band,
    bandLabel: BAND_LABELS[v.band],
    kicker: `Exclusive · Job No. ${v.soc}`,
    headline: headlineFor(v, name),
    who: name ? `${possessive(name)} job` : 'Your job',
    rankLine: v.boardRank != null ? `#${v.boardRank} of ${feed.boardSize} on the Doom Index` : `Scored, but off the top-${feed.boardSize} board`,
    rankShort: v.boardRank != null ? `#${v.boardRank} most doomed of ${feed.boardSize}` : `Off the top-${feed.boardSize} board`,
    changeLine:
      v.projectedChangePct == null ? 'BLS publishes no 2025–35 projection for this occupation' : `BLS projects ${change} employment change, 2025–35`,
    changeShort: v.projectedChangePct == null ? 'BLS: no projection' : `BLS: ${change} by 2035`,
    employmentLine: `${formatJobs(v.employment)} jobs in 2025 · median wage ${formatUsd(v.medianWage)}`,
    exposureLine: `AI exposure (percentile): ${formatScore(v.exposure)} of 100`,
    blsLine: `BLS official AI exposure category: ${v.blsCategory ?? 'Not rated'}`,
    blsCategory: v.blsCategory ?? 'Not rated',
    roast: v.roast,
    stinger: v.stinger,
    robotLine: v.robotLine,
    fine: `${DISCLAIMER_SHORT}. ${FORMULA_LINE}.`,
    url: SITE_DOMAIN,
    edition: feed.edition,
  };
}

/** /v/<slug>/ plus ?n=<name> when a name is set. */
export function sharePath(slug: string, name = ''): string {
  return `/v/${slug}/${name ? `?n=${encodeURIComponent(name)}` : ''}`;
}
