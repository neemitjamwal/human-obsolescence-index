import { SOC_RE } from './parse.mjs';
import { aggregateBeta } from './score.mjs';

/**
 * Joins every input onto the EP Line-item universe by SOC 2018 code. O*NET-keyed inputs go through the BLS
 * crosswalk. Titles are carried from EP only and never used as a key.
 */
export function buildUniverse({ ep, aiExposure, oews, crosswalk, microsoft, eloundou }) {
  const seen = new Set();
  return ep.occupations.map((o) => {
    if (!SOC_RE.test(o.soc)) throw new Error(`universe: invalid SOC code ${o.soc}`);
    if (seen.has(o.soc)) throw new Error(`universe: duplicate SOC code ${o.soc}`);
    seen.add(o.soc);
    const onetCodes = crosswalk.socToOnet.get(o.soc) ?? [];
    const eldCodes = onetCodes.filter((c) => eloundou.has(c));
    const oes = oews.detailed.get(o.soc) ?? oews.other.get(o.soc) ?? null;
    return {
      soc: o.soc,
      title: o.title,
      ep: o,
      blsCategory: aiExposure.bySoc.get(o.soc) ?? null,
      oes,
      msft: microsoft.get(o.soc) ?? null,
      eld: aggregateBeta(eldCodes.map((c) => eloundou.get(c))),
      eldOnetCodes: eldCodes,
      onetCodes,
      oohUrl: crosswalk.oohBySoc.get(o.soc) ?? null,
    };
  });
}

export function slugify(title) {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Slugs are unique across the universe; collisions get the SOC code appended. */
export function assignSlugs(universe) {
  const counts = new Map();
  for (const u of universe) counts.set(slugify(u.title), (counts.get(slugify(u.title)) ?? 0) + 1);
  for (const u of universe) {
    const base = slugify(u.title);
    u.slug = counts.get(base) > 1 ? `${base}-${u.soc}` : base;
  }
}
