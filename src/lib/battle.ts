import { BATTLE_PAIRS, BATTLE_QUIPS, REFEREE_SAME, REFEREE_TIE, REFEREE_WIN, TIE_QUIPS } from '../data/battles.ts';
import { hashKey } from '../data/roasts.ts';
import { formatSignedPercent } from './format.ts';
import type { ScoreBand } from './ledger';

/** The verdict fields a battle prints. Every scored verdict record satisfies it. */
export type Fighter = {
  slug: string;
  title: string;
  obs: number;
  band: ScoreBand;
  projectedChangePct: number | null;
};

export type Side = 'a' | 'b';

/** Lower Doom Score is the safer job. */
export type BattleOutcome =
  | { kind: 'win'; winner: Side; loser: Side; margin: number }
  | { kind: 'tie' }
  | { kind: 'same' };

export function battleOutcome(a: Pick<Fighter, 'slug' | 'obs'>, b: Pick<Fighter, 'slug' | 'obs'>): BattleOutcome {
  if (a.slug === b.slug) return { kind: 'same' };
  if (a.obs === b.obs) return { kind: 'tie' };
  const winner: Side = a.obs < b.obs ? 'a' : 'b';
  return { kind: 'win', winner, loser: winner === 'a' ? 'b' : 'a', margin: Math.abs(a.obs - b.obs) };
}

/** A corner's stored pick counts only while its input still shows that job; any edit or clear withdraws it. */
export function committedPick<T extends { title: string }>(pick: T | null, typed: string): T | null {
  return pick && typed.trim() === pick.title ? pick : null;
}

/** Both corners committed, or null. */
export function committedPair<T extends { title: string }>(picks: Record<Side, T | null>, typed: Record<Side, string>): { a: T; b: T } | null {
  const a = committedPick(picks.a, typed.a);
  const b = committedPick(picks.b, typed.b);
  return a && b ? { a, b } : null;
}

export const BATTLE_FINE =
  'AI exposure ≠ job loss. "Safer" only means a lower Doom Score (65% AI exposure research + 35% BLS 2025–35 projection), not a forecast for anyone\'s job.';

export function pairKey(a: string, b: string): string {
  return `${a}-vs-${b}`;
}

export function battlePairPath(a: string, b: string): string {
  return `/vs/${pairKey(a, b)}/`;
}

export function battleQueryPath(a: string, b: string): string {
  return `/vs/?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`;
}

/** A fighter's /v/ verdict page (same as verdictPath, without loading the verdict data into the browser). */
export function fighterPath(slug: string): string {
  return `/v/${slug}/`;
}

export function battleOgPath(a: string, b: string): string {
  return `/og/vs/${pairKey(a, b)}.png`;
}

const curated = new Set(BATTLE_PAIRS.map(([a, b]) => pairKey(a, b)));

export function isCuratedPair(a: string, b: string): boolean {
  return curated.has(pairKey(a, b));
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** ?a=<slug>&b=<slug> from a battle URL. Anything that is not a plain slug is ignored. */
export function parseBattleQuery(search: string): { a: string | null; b: string | null } {
  const q = new URLSearchParams(search);
  const clean = (v: string | null) => (v && v.length <= 120 && SLUG.test(v) ? v : null);
  return { a: clean(q.get('a')), b: clean(q.get('b')) };
}

export type FighterView = {
  slug: string;
  title: string;
  score: string;
  band: ScoreBand;
  /** 'safer' for the winner, 'pinkslip' for the other corner, 'even' on a tie. */
  fate: 'safer' | 'pinkslip' | 'even';
  tag: string;
  changeLine: string;
};

export type BattleView = {
  key: string;
  a: FighterView;
  b: FighterView;
  outcome: BattleOutcome;
  headline: string;
  /** The safer job's title, or empty on a tie. */
  winnerTitle: string;
  pinkSlipTitle: string;
  quip: string;
  quipId: string;
  referee: string;
  projectionLine: string;
  scoreLine: string;
  fine: string;
};

function changeLine(f: Fighter): string {
  return f.projectedChangePct == null ? 'BLS: no projection' : `BLS: ${formatSignedPercent(f.projectedChangePct)} by 2035`;
}

function fighterView(f: Fighter, fate: FighterView['fate']): FighterView {
  return {
    slug: f.slug,
    title: f.title,
    score: String(f.obs),
    band: f.band,
    fate,
    tag: fate === 'safer' ? 'Safer' : fate === 'pinkslip' ? 'Pink slip' : 'Dead heat',
    changeLine: changeLine(f),
  };
}

function projection(f: Fighter): string {
  return f.projectedChangePct == null ? `no BLS projection for ${f.title}` : `${f.title} ${formatSignedPercent(f.projectedChangePct)}`;
}

/** Every string a battle surface prints, straight from the two verdicts. Shared by the pages, the cards and the OG images. */
export function battleView(a: Fighter, b: Fighter): BattleView {
  const outcome = battleOutcome(a, b);
  const key = pairKey(a.slug, b.slug);
  const fates: Record<Side, FighterView['fate']> =
    outcome.kind === 'win' ? { [outcome.winner]: 'safer', [outcome.loser]: 'pinkslip' } as Record<Side, FighterView['fate']> : { a: 'even', b: 'even' };
  const sides = { a, b };
  const quips = outcome.kind === 'win' ? BATTLE_QUIPS : TIE_QUIPS;
  const quip = quips[hashKey(`battle:${key}`) % quips.length];
  const winner = outcome.kind === 'win' ? sides[outcome.winner] : null;
  const pinkSlip = outcome.kind === 'win' ? sides[outcome.loser] : null;
  return {
    key,
    a: fighterView(a, fates.a),
    b: fighterView(b, fates.b),
    outcome,
    headline:
      outcome.kind === 'win'
        ? `${winner!.title} win by ${outcome.margin}`
        : outcome.kind === 'tie'
          ? `Dead heat at Doom Score ${a.obs}`
          : 'Same job in both corners',
    winnerTitle: winner?.title ?? '',
    pinkSlipTitle: pinkSlip?.title ?? '',
    quip: outcome.kind === 'same' ? 'Pick two different jobs to start a fight.' : quip.text,
    quipId: outcome.kind === 'same' ? 'same' : quip.id,
    referee: outcome.kind === 'win' ? REFEREE_WIN.replace('{job}', pinkSlip!.title) : outcome.kind === 'tie' ? REFEREE_TIE : REFEREE_SAME,
    projectionLine: `BLS projected employment change, 2025–35: ${projection(a)}; ${projection(b)}.`,
    scoreLine: `Doom Score ${a.obs} vs ${b.obs}`,
    fine: BATTLE_FINE,
  };
}

/** Meta description for a battle page. */
export function battleDescription(v: BattleView): string {
  const verdict = v.outcome.kind === 'win' ? `${v.winnerTitle} are the safer job by ${v.outcome.margin} points.` : `${v.headline}.`;
  return `Who's safer? ${v.a.title} (Doom Score ${v.a.score}) vs ${v.b.title} (Doom Score ${v.b.score}). ${verdict} AI exposure is not job loss; every number has its source.`;
}

export function battleTitle(v: BattleView): string {
  return `${v.a.title} vs ${v.b.title}: who's safer?`;
}
