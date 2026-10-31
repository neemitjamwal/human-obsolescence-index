import { BATTLE_PAIRS, FEATURED_BATTLE } from '../data/battles';
import { battleOgPath, battlePairPath, battleQueryPath, battleView, pairKey, type BattleView, type Fighter } from './battle';
import { verdictBySlug, type Verdict } from './verdicts';

export type CuratedBattle = {
  key: string;
  a: Verdict;
  b: Verdict;
  fighters: { a: Fighter; b: Fighter };
  view: BattleView;
  path: string;
  queryPath: string;
  og: string;
};

export function fighter(v: Verdict): Fighter {
  return { slug: v.slug, title: v.title, obs: v.obs, band: v.band, projectedChangePct: v.projectedChangePct };
}

function verdictOrThrow(slug: string): Verdict {
  const v = verdictBySlug(slug);
  if (!v) throw new Error(`battle pair names ${slug}, which has no verdict`);
  return v;
}

export function battleFor(aSlug: string, bSlug: string): CuratedBattle {
  const a = verdictOrThrow(aSlug);
  const b = verdictOrThrow(bSlug);
  const fighters = { a: fighter(a), b: fighter(b) };
  return {
    key: pairKey(a.slug, b.slug),
    a,
    b,
    fighters,
    view: battleView(fighters.a, fighters.b),
    path: battlePairPath(a.slug, b.slug),
    queryPath: battleQueryPath(a.slug, b.slug),
    og: battleOgPath(a.slug, b.slug),
  };
}

/** The curated static matchups, in fight-card order. */
export const CURATED_BATTLES: CuratedBattle[] = BATTLE_PAIRS.map(([a, b]) => battleFor(a, b));

export const FEATURED: CuratedBattle = battleFor(...FEATURED_BATTLE);
