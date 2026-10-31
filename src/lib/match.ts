/**
 * Job-title matcher for the "Type your job" search. Pure and synchronous: it only reads the search index it is
 * given and never touches the network.
 */

export type SearchEntry = { soc: string; slug: string; title: string; obs: number; aliases: string[] };
export type SlangAlias = { alias: string; soc: string; note: string };
export type SearchIndex = { entries: SearchEntry[]; slang: SlangAlias[] };

export type MatchKind = 'title' | 'slang' | 'alias';
export type Suggestion = {
  soc: string;
  slug: string;
  title: string;
  obs: number;
  /** The title, alias or slang term that matched the query. */
  matched: string;
  kind: MatchKind;
  /** Set for slang matches: why the curated term points at this occupation. */
  note?: string;
  score: number;
};

export const MAX_SUGGESTIONS = 5;
/** Typo tolerance (one edit) applies only to query tokens at least this long. */
export const TYPO_MIN_LENGTH = 5;

const STOPWORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'for', 'to', 'all', 'other', 'or', 'i', 'am', 'im', 'my', 'job']);
const EXACT_BONUS: Record<MatchKind, number> = { title: 1000, slang: 600, alias: 500 };
const KIND_BONUS: Record<MatchKind, number> = { title: 0.3, slang: 0.2, alias: 0 };

/** Lowercase, strip accents and punctuation, "&" -> "and", collapse whitespace. */
export function normalize(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Folds simple English plurals so "accountant" meets "Accountants". */
export function stem(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

export function tokens(input: string): string[] {
  return normalize(input).split(' ').filter(Boolean);
}

/** Damerau-Levenshtein (optimal string alignment) distance of at most one: one insertion, deletion, substitution or adjacent transposition. */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let i = 0;
    while (i < la && a[i] === b[i]) i++;
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  const [s, l] = la < lb ? [a, b] : [b, a];
  let i = 0;
  while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);
}

/**
 * 3 exact, 2 prefix, 1.5 one-edit typo, 0 no match. Typo eligibility follows the token as the user typed it
 * (`typed`, before plural folding), so "nures" (5 letters, folded to "nure") still meets "nurse" while a typed
 * 4-letter token never matches fuzzily.
 */
export function tokenScore(query: string, name: string, typed: string = query): number {
  if (query === name) return 3;
  if (query.length >= 2 && name.startsWith(query)) return 2;
  if (typed.length >= TYPO_MIN_LENGTH && (withinOneEdit(query, name) || withinOneEdit(typed, name))) return 1.5;
  return 0;
}

type Name = { text: string; norm: string; toks: string[]; key: string; kind: MatchKind; note?: string };
type Prepared = { entry: SearchEntry; names: Name[] };

function contentWords(toks: string[]): string[] {
  const kept = toks.filter((t) => !STOPWORDS.has(t));
  return kept.length ? kept : toks;
}

function content(toks: string[]): string[] {
  return contentWords(toks).map(stem);
}

function prepareName(text: string, kind: MatchKind, note?: string): Name {
  const norm = normalize(text);
  const toks = content(norm.split(' ').filter(Boolean));
  return { text, norm, toks, key: toks.join(' '), kind, note };
}

/** Exact means the same content words after normalizing, plural folding and dropping filler words. */
function scoreName(qNorm: string, qToks: string[], qTyped: string[], name: Name): number {
  if (qToks.join(' ') === name.key) return EXACT_BONUS[name.kind] + qToks.length * 3;
  const used = new Set<number>();
  let total = 0;
  for (let k = 0; k < qToks.length; k++) {
    const q = qToks[k];
    let best = 0;
    for (let i = 0; i < name.toks.length; i++) {
      const s = tokenScore(q, name.toks[i], qTyped[k]);
      if (s > 0) used.add(i);
      if (s > best) best = s;
    }
    if (best === 0) return 0;
    total += best;
  }
  const coverage = used.size / Math.max(1, name.toks.length);
  const phrase = name.norm.startsWith(qNorm) ? 1 : 0;
  return total + coverage + phrase + KIND_BONUS[name.kind];
}

export type Matcher = (query: string, limit?: number) => Suggestion[];

/** Precomputes token lists once so each keystroke only scores. */
export function createMatcher(index: SearchIndex): Matcher {
  const bySoc = new Map<string, Prepared>();
  for (const entry of index.entries) {
    bySoc.set(entry.soc, {
      entry,
      names: [prepareName(entry.title, 'title'), ...entry.aliases.map((a) => prepareName(a, 'alias'))],
    });
  }
  for (const s of index.slang) bySoc.get(s.soc)?.names.push(prepareName(s.alias, 'slang', s.note));
  const prepared = [...bySoc.values()];

  return (query, limit = MAX_SUGGESTIONS) => {
    const qNorm = normalize(query);
    if (qNorm.length < 2) return [];
    const qTyped = contentWords(qNorm.split(' '));
    const qToks = qTyped.map(stem);
    const out: Suggestion[] = [];
    for (const { entry, names } of prepared) {
      let best: { score: number; name: Name } | null = null;
      for (const name of names) {
        const score = scoreName(qNorm, qToks, qTyped, name);
        if (score > 0 && (!best || score > best.score)) best = { score, name };
      }
      if (!best) continue;
      // Breaks ties between equally good alias hits in favour of occupations whose official title also matches.
      const titleScore = best.name.kind === 'title' ? 0 : scoreName(qNorm, qToks, qTyped, names[0]);
      out.push({
        soc: entry.soc,
        slug: entry.slug,
        title: entry.title,
        obs: entry.obs,
        matched: best.name.text,
        kind: best.name.kind,
        ...(best.name.note ? { note: best.name.note } : {}),
        score: Math.round((best.score + 0.05 * Math.min(titleScore, 20)) * 1000) / 1000,
      });
    }
    out.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title) || a.soc.localeCompare(b.soc));
    return out.slice(0, limit);
  };
}

/** One-shot convenience wrapper around createMatcher. */
export function match(index: SearchIndex, query: string, limit = MAX_SUGGESTIONS): Suggestion[] {
  return createMatcher(index)(query, limit);
}
