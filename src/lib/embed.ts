import { leaderboard, META, occupationPath } from './data';
import { BAND_LABELS, scoreBand } from './ledger';

export const EMBED_PATH = '/embed/';
export const EMBED_HEIGHT = 640;

/** Compact leaderboard row shipped inside the embed page; keys are short to keep the inline JSON small. */
export type EmbedEntry = {
  /** leaderboard rank */
  r: number;
  /** occupation title */
  t: string;
  /** OBS score */
  o: number;
  /** OBS band label */
  b: string;
  /** official BLS AI exposure category */
  c: string | null;
  /** BLS projected employment change 2025-35, percent */
  p: number | null;
  /** absolute occupation page URL */
  u: string;
};

export function embedEntries(site: URL): EmbedEntry[] {
  return leaderboard().map((o) => {
    const obs = o.scores.obs.value ?? 0;
    return {
      r: o.leaderboardRank!,
      t: o.title,
      o: obs,
      b: BAND_LABELS[scoreBand(obs)],
      c: o.blsCategory.value,
      p: o.projectedChange.percent.value,
      u: new URL(occupationPath(o.slug), site).href,
    };
  });
}

/** JSON safe to drop inside a <script> element. */
export function embedJson(entries: EmbedEntry[]): string {
  return JSON.stringify(entries).replace(/</g, '\\u003c');
}

export function embedSnippet(site: URL): string {
  const src = new URL(EMBED_PATH, site).href;
  const home = new URL('/', site).href;
  return [
    `<iframe src="${src}" title="Human Obsolescence Index: live ticker and occupation score lookup" width="100%" height="${EMBED_HEIGHT}" style="border:0;max-width:680px" loading="lazy"></iframe>`,
    `<p style="font:12px monospace">Scores: <a href="${home}">Human Obsolescence Index</a>, ${META.edition} edition</p>`,
  ].join('\n');
}
