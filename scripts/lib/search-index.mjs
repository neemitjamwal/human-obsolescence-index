import { normalize } from '../../src/lib/match.ts';

export const MAX_ALIASES = 25;
const MAX_ALIAS_LENGTH = 60;

const primaryFirst = (codes) => [...codes].sort((a, b) => Number(b.endsWith('.00')) - Number(a.endsWith('.00')) || a.localeCompare(b));

/**
 * Aliases for one SOC occupation from its O*NET-SOC codes (primary code first): every Sample of Reported Titles
 * entry (those shown in My Next Move first), then Job Titles (the former "Alternate Titles" file) shortest first,
 * because short generic titles are what people type. Deduped on the matcher's normalized form, title excluded.
 */
export function aliasesFor(title, onetCodes, titles, max = MAX_ALIASES) {
  const seen = new Set([normalize(title)]);
  const out = [];
  const push = (text) => {
    if (out.length >= max || !text || text.length > MAX_ALIAS_LENGTH) return;
    const key = normalize(text);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(text);
  };
  const codes = primaryFirst(onetCodes);
  for (const code of codes) {
    const reported = titles.reportedByOnet.get(code) ?? [];
    for (const r of reported.filter((r) => r.shown)) push(r.title);
    for (const r of reported.filter((r) => !r.shown)) push(r.title);
  }
  const jobTitles = codes.flatMap((code, rank) =>
    (titles.jobTitlesByOnet.get(code) ?? []).flatMap((t) => [t.title, t.short].filter(Boolean).map((text) => ({ text, rank }))),
  );
  jobTitles.sort((a, b) => a.text.length - b.text.length || a.rank - b.rank || a.text.localeCompare(b.text));
  for (const t of jobTitles) push(t.text);
  return out;
}

/** The lazy-loaded client search index: every scored occupation with its aliases, plus curated slang. */
export function buildSearchIndex({ verdicts, universe, titles, slang, edition }) {
  const bySoc = new Map(universe.map((u) => [u.soc, u]));
  const scored = new Set(verdicts.map((v) => v.soc));
  for (const s of slang) {
    if (!scored.has(s.soc)) throw new Error(`slang alias "${s.alias}" points at ${s.soc}, which has no scored verdict`);
  }
  const entries = [...verdicts]
    .sort((a, b) => a.soc.localeCompare(b.soc))
    .map((v) => ({
      soc: v.soc,
      slug: v.slug,
      title: v.title,
      obs: v.obs,
      aliases: aliasesFor(v.title, bySoc.get(v.soc).onetCodes, titles),
    }));
  return {
    edition,
    attribution:
      'Aliases from the O*NET 31.0 Database (Sample of Reported Titles; Job Titles, formerly Alternate Titles) by USDOL/ETA, used under CC BY 4.0, mapped to SOC 2018 with the BLS O*NET-SOC crosswalk. Slang aliases are hand-curated by the Human Obsolescence Index.',
    sourceIds: ['onet-31', 'bls-crosswalk'],
    entries,
    slang: slang.map((s) => ({ alias: s.alias, soc: s.soc, note: s.note })),
  };
}
