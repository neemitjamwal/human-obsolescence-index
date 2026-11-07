import {
  BOSS_FIRST_QUIPS,
  BOSS_LAST_QUIPS,
  HEADLINE_ALL_TIED,
  HEADLINE_ONE,
  HEADLINE_TOP_TIE,
  LINEUP_FINE,
  LINEUP_QUIPS,
  ROBOT_PICK,
  ROBOT_TIE,
  TIE_QUIPS,
  type LineupLine,
} from '../data/lineup.ts';
import { hashKey } from '../data/roasts.ts';
import type { ScoreBand } from './ledger';
import { nameFromLink, sanitizeName } from './name.ts';

export const MIN_COWORKERS = 2;
export const MAX_COWORKERS = 4;
export const LINEUP_PATH = '/office-lineup/';
/** Longest `#n=` fragment we will read: five worst-case encoded names plus separators. Anything longer is dropped. */
export const MAX_NAME_FRAGMENT = 600;
const MAX_SLUG = 120;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type LineupRole = 'coworker' | 'boss';

/** The verdict fields a lineup prints. Every scored verdict record satisfies it. */
export type LineupPick = { slug: string; title: string; obs: number; band: ScoreBand };

/** One person in the lineup, in slot order: coworkers first, then the boss when one was added. */
export type LineupSlot<T extends LineupPick = LineupPick> = { role: LineupRole; pick: T; name: string };

export type RankedEntry = {
  /** Index in slot order, so a name stays with its role whatever the ranking does. */
  slot: number;
  role: LineupRole;
  slug: string;
  title: string;
  obs: number;
  band: ScoreBand;
  name: string;
  /** The name, or "The boss" / "Coworker N" when no name was given. */
  who: string;
  /** Standard competition rank: 1 + the number of people with a strictly higher Doom Score. */
  rank: number;
  /** True when someone else in the lineup has exactly the same Doom Score. */
  tied: boolean;
  placard: string;
};

export type LineupView = {
  key: string;
  entries: RankedEntry[];
  count: number;
  hasBoss: boolean;
  topTied: boolean;
  headline: string;
  subhead: string;
  quip: string;
  quipId: string;
  robotLine: string;
  scoreLine: string;
  fine: string;
};

/** Why a set of slots cannot be lined up yet, or null when it can. */
export function lineupProblem(slots: { role: LineupRole }[]): string | null {
  const coworkers = slots.filter((s) => s.role === 'coworker').length;
  const bosses = slots.filter((s) => s.role === 'boss').length;
  if (coworkers < MIN_COWORKERS) return 'Pick at least two coworkers.';
  if (coworkers > MAX_COWORKERS) return 'A lineup holds at most four coworkers.';
  if (bosses > 1) return 'A lineup has at most one boss.';
  return null;
}

export function slotLabel(role: LineupRole, slot: number): string {
  return role === 'boss' ? 'The boss' : `Coworker ${slot + 1}`;
}

/** Highest Doom Score first. Equal scores keep slot order and share a rank; nothing else breaks a tie. */
export function rankLineup<T extends LineupPick>(slots: LineupSlot<T>[]): RankedEntry[] {
  const entries = slots.map((s, slot) => ({ s, slot }));
  entries.sort((x, y) => y.s.pick.obs - x.s.pick.obs || x.slot - y.slot);
  return entries.map(({ s, slot }) => {
    const rank = 1 + slots.filter((o) => o.pick.obs > s.pick.obs).length;
    const tied = slots.some((o, j) => j !== slot && o.pick.obs === s.pick.obs);
    const name = sanitizeName(s.name);
    return {
      slot,
      role: s.role,
      slug: s.pick.slug,
      title: s.pick.title,
      obs: s.pick.obs,
      band: s.pick.band,
      name,
      who: name || slotLabel(s.role, slot),
      rank,
      tied,
      placard: tied ? `Tied #${rank}` : `#${rank}`,
    };
  });
}

function pick(bank: LineupLine[], key: string): LineupLine {
  return bank[hashKey(`lineup:${key}`) % bank.length];
}

function headlineWho(e: RankedEntry): string {
  return e.name || (e.role === 'boss' ? 'the boss' : `coworker ${e.slot + 1}`);
}

/** Every string a lineup surface prints, straight from the chosen verdicts. Shared by the page and the cards. */
export function lineupView<T extends LineupPick>(slots: LineupSlot<T>[]): LineupView {
  const entries = rankLineup(slots);
  const top = entries.filter((e) => e.rank === 1);
  const bottomRank = entries[entries.length - 1].rank;
  const bottom = entries.filter((e) => e.rank === bottomRank);
  const boss = entries.find((e) => e.role === 'boss') ?? null;
  const topTied = top.length > 1;
  const allTied = top.length === entries.length;
  const key = entries
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((e) => `${e.role === 'boss' ? 'B' : 'C'}:${e.slug}`)
    .join('|');
  let line: LineupLine;
  if (topTied) line = pick(TIE_QUIPS, key);
  else if (boss && top[0] === boss) line = pick(BOSS_FIRST_QUIPS, key);
  else if (boss && bottom.length === 1 && bottom[0] === boss) line = pick(BOSS_LAST_QUIPS, key);
  else line = pick(LINEUP_QUIPS, key);
  return {
    key,
    entries,
    count: entries.length,
    hasBoss: boss != null,
    topTied,
    headline: allTied ? HEADLINE_ALL_TIED : topTied ? HEADLINE_TOP_TIE : HEADLINE_ONE.replace('{who}', headlineWho(top[0])),
    subhead: topTied ? `${top.length} tied at Doom Score ${top[0].obs}` : `${top[0].title} · Doom Score ${top[0].obs}`,
    quip: line.text,
    quipId: line.id,
    robotLine: topTied ? ROBOT_TIE : ROBOT_PICK,
    scoreLine: `Doom Scores, highest first: ${entries.map((e) => e.obs).join(' · ')}`,
    fine: LINEUP_FINE,
  };
}

/**
 * `/office-lineup/?c=<slug>,<slug>[&boss=<slug>]`, plus `#n=<name>,<name>,...` in slot order (coworkers, then the boss)
 * when anyone has a name. Names live only in the fragment, which browsers never send in HTTP requests.
 */
export function lineupPath(slots: { role: LineupRole; slug: string; name?: string }[]): string {
  const coworkers = slots.filter((s) => s.role === 'coworker');
  const boss = slots.find((s) => s.role === 'boss');
  const ordered = boss ? [...coworkers, boss] : coworkers;
  const query = `?c=${coworkers.map((s) => encodeURIComponent(s.slug)).join(',')}${boss ? `&boss=${encodeURIComponent(boss.slug)}` : ''}`;
  const names = ordered.map((s) => sanitizeName(s.name ?? ''));
  while (names.length && !names[names.length - 1]) names.pop();
  const hash = names.length ? `#n=${names.map((n) => encodeURIComponent(n)).join(',')}` : '';
  return `${LINEUP_PATH}${query}${hash}`;
}

export type LinkSlot = { slug: string | null; name: string };
export type LineupLink = {
  coworkers: LinkSlot[];
  boss: LinkSlot | null;
  /** The link listed more coworkers than a lineup holds; only the first MAX_COWORKERS were read. */
  extraDropped: boolean;
  /** The link's names could not be matched to its slots (too many, or an oversized fragment), so none were read. */
  namesDropped: boolean;
};

function cleanSlug(v: string | null | undefined): string | null {
  return v && v.length <= MAX_SLUG && SLUG.test(v) ? v : null;
}

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

/** The raw `n=` value of a fragment, split on the separator before decoding so an encoded comma cannot shift names. */
function rawNames(hash: string): string[] | null {
  if (!hash.startsWith('#')) return null;
  const part = hash
    .slice(1)
    .split('&')
    .find((p) => p.startsWith('n='));
  return part == null ? null : part.slice(2).split(',');
}

/** Reads a lineup link. Slugs come from the query, names only from the `#n=` fragment; a `?n=` query is ignored. */
export function parseLineupLink(search: string, hash: string): LineupLink {
  const q = new URLSearchParams(search);
  const listed = (q.get('c') ?? '').split(',').filter((s) => s !== '');
  const extraDropped = listed.length > MAX_COWORKERS;
  const coworkerSlugs = listed.slice(0, MAX_COWORKERS).map(cleanSlug);
  const bossRaw = q.get('boss');
  const bossSlug = bossRaw == null || bossRaw === '' ? undefined : cleanSlug(bossRaw);
  const slotCount = coworkerSlugs.length + (bossSlug === undefined ? 0 : 1);

  let names: string[] = [];
  let namesDropped = false;
  const raw = typeof hash === 'string' && hash.length <= MAX_NAME_FRAGMENT ? rawNames(hash) : null;
  if (typeof hash === 'string' && hash.length > MAX_NAME_FRAGMENT && hash.includes('n=')) namesDropped = true;
  else if (raw && (raw.length > slotCount || extraDropped)) namesDropped = raw.some((r) => r !== '');
  else if (raw) names = raw.map((r) => nameFromLink(safeDecode(r)));

  return {
    coworkers: coworkerSlugs.map((slug, i) => ({ slug, name: names[i] ?? '' })),
    boss: bossSlug === undefined ? null : { slug: bossSlug, name: names[coworkerSlugs.length] ?? '' },
    extraDropped,
    namesDropped,
  };
}

export type ResolvedLineup<T extends LineupPick> = {
  /** The link's slots that name a real scored occupation, in slot order, each with its own name. */
  slots: LineupSlot<T>[];
  /** Slots dropped because their slug is malformed or not a scored occupation (stale links). */
  dropped: number;
  ready: boolean;
};

/** Matches a parsed link against the verdict data. Unknown slots are dropped together with their names. */
export function resolveLineup<T extends LineupPick>(link: LineupLink, bySlug: Map<string, T>): ResolvedLineup<T> {
  const slots: LineupSlot<T>[] = [];
  let dropped = 0;
  const add = (role: LineupRole, s: LinkSlot) => {
    const found = s.slug ? bySlug.get(s.slug) : undefined;
    if (found) slots.push({ role, pick: found, name: s.name });
    else dropped += 1;
  };
  link.coworkers.forEach((s) => add('coworker', s));
  if (link.boss) add('boss', link.boss);
  return { slots, dropped, ready: lineupProblem(slots) === null };
}

/** True when a URL carries a lineup to restore. */
export function hasLineupLink(search: string): boolean {
  const q = new URLSearchParams(search);
  return q.has('c') || q.has('boss');
}
