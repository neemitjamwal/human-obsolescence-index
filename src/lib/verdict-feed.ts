import { META, OCCUPATIONS } from './data';
import { panicFor } from '../data/roasts';
import { renderRoast } from './roast';
import { VERDICTS, VERDICTS_META, type Verdict } from './verdicts';
import type { VerdictFeed, VerdictRecord } from './verdict-view';

const boardRank = new Map(OCCUPATIONS.map((o) => [o.slug, o.leaderboardRank]));

export function verdictRecord(v: Verdict): VerdictRecord {
  const roast = renderRoast(v);
  return {
    soc: v.soc,
    slug: v.slug,
    title: v.title,
    obs: v.obs,
    band: v.band,
    blsCategory: v.blsCategory,
    exposure: v.exposure,
    projectedChangePct: v.projectedChangePct,
    employment: v.employment,
    medianWage: v.medianWage,
    hasFullPage: v.hasFullPage,
    boardRank: boardRank.get(v.slug) ?? null,
    roast: roast.text,
    roastId: roast.id,
    ...panicFor(v),
  };
}

/** The lazily fetched /data/verdicts.json: every scored occupation, highest Doom Score first. */
export function verdictFeed(): VerdictFeed {
  return { edition: VERDICTS_META.edition, boardSize: META.leaderboard.size, verdicts: VERDICTS.map(verdictRecord) };
}
