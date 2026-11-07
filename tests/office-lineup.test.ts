import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_LINEUP_COPY, BOSS_FIRST_QUIPS, BOSS_LAST_QUIPS, HEADLINE_ALL_TIED, HEADLINE_TOP_TIE, LINEUP_QUIPS, ROBOT_TIE, TIE_QUIPS } from '../src/data/lineup';
import { BANNED_ROAST_PHRASES, WORKER_MOCKING_PHRASES } from '../src/data/roasts';
import {
  MAX_COWORKERS,
  MAX_NAME_FRAGMENT,
  hasLineupLink,
  lineupPath,
  lineupProblem,
  lineupView,
  parseLineupLink,
  rankLineup,
  resolveLineup,
  type LineupPick,
  type LineupSlot,
} from '../src/lib/lineup';
import { lineupCardAlt, lineupCardFileName, lineupCardText } from '../src/lib/lineup-card';
import { NAME_MAX, sanitizeName } from '../src/lib/name';
import { NAV_ITEMS } from '../src/lib/site';
import { sitePaths } from '../src/lib/seo';
import { SITE_DOMAIN } from '../src/lib/site';
import { VERDICTS, verdictBySlug, type Verdict } from '../src/lib/verdicts';
import { mockingMatches, panicLineProblems } from '../scripts/lib/panic-scan.mjs';

const root = join(__dirname, '..');
const v = (slug: string): Verdict => {
  const r = verdictBySlug(slug);
  if (!r) throw new Error(`no verdict ${slug}`);
  return r;
};
const cw = (slug: string, name = ''): LineupSlot<Verdict> => ({ role: 'coworker', pick: v(slug), name });
const boss = (slug: string, name = ''): LineupSlot<Verdict> => ({ role: 'boss', pick: v(slug), name });
const bySlug = new Map(VERDICTS.map((x) => [x.slug, x]));

/** Two different occupations with the same committed Doom Score. */
function realTie(): [Verdict, Verdict] {
  const seen = new Map<number, Verdict>();
  for (const x of VERDICTS) {
    const o = seen.get(x.obs);
    if (o) return [o, x];
    seen.set(x.obs, x);
  }
  throw new Error('no tie in verdicts.json');
}

describe('ranking', () => {
  it('orders a mixed lineup by committed Doom Score, highest first', () => {
    const slots = [cw('registered-nurses', 'Ana'), cw('telemarketers', 'Bo'), cw('lawyers'), cw('electricians', 'Dee')];
    const ranked = rankLineup(slots);
    const scores = ranked.map((e) => e.obs);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    for (const e of ranked) {
      expect(e.obs).toBe(v(e.slug).obs);
      expect(e.title).toBe(v(e.slug).title);
      expect(e.band).toBe(v(e.slug).band);
    }
    expect(ranked[0].slug).toBe('telemarketers');
    expect(ranked[0].rank).toBe(1);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3, 4].slice(0, ranked.length).map((_, i) => 1 + ranked.filter((o) => o.obs > ranked[i].obs).length));
  });

  it('keeps every name with its own slot after sorting', () => {
    const slots = [cw('registered-nurses', 'Ana'), cw('telemarketers', 'Bo'), boss('chief-executives', 'Pat')];
    const ranked = rankLineup(slots);
    for (const e of ranked) {
      expect(e.name).toBe(slots[e.slot].name);
      expect(e.slug).toBe(slots[e.slot].pick.slug);
      expect(e.role).toBe(slots[e.slot].role);
    }
  });

  it('shares a rank on equal scores without inventing an order, and keeps slot order inside the tie', () => {
    const [a, b] = realTie();
    const higher = VERDICTS.find((x) => x.obs > a.obs)!;
    const ranked = rankLineup([cw(b.slug, 'Bee'), cw(higher.slug), cw(a.slug, 'Ay')]);
    expect(ranked.map((e) => e.slug)).toEqual([higher.slug, b.slug, a.slug]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 2]);
    expect(ranked.map((e) => e.tied)).toEqual([false, true, true]);
    expect(ranked.map((e) => e.placard)).toEqual(['#1', 'Tied #2', 'Tied #2']);
  });

  it('treats the same occupation in two slots as two people with the same sourced score', () => {
    const ranked = rankLineup([cw('cashiers', 'Sam'), cw('cashiers', 'Lee'), cw('plumbers-pipefitters-and-steamfitters')]);
    const cashiers = ranked.filter((e) => e.slug === 'cashiers');
    expect(cashiers).toHaveLength(2);
    expect(cashiers.map((e) => e.name).sort()).toEqual(['Lee', 'Sam']);
    expect(new Set(cashiers.map((e) => e.obs))).toEqual(new Set([v('cashiers').obs]));
    expect(cashiers.every((e) => e.tied && e.rank === cashiers[0].rank)).toBe(true);
  });

  it('labels unnamed people by role and slot', () => {
    const ranked = rankLineup([cw('lawyers'), cw('lawyers'), boss('chief-executives')]);
    expect(ranked.map((e) => e.who).sort()).toEqual(['Coworker 1', 'Coworker 2', 'The boss']);
  });
});

describe('boss slot', () => {
  it('is ranked by its real Doom Score under the same rule as everyone else', () => {
    const slots = [cw('telemarketers'), cw('registered-nurses'), boss('chief-executives', 'Pat')];
    const view = lineupView(slots);
    const b = view.entries.find((e) => e.role === 'boss')!;
    expect(view.hasBoss).toBe(true);
    expect(b.obs).toBe(v('chief-executives').obs);
    expect(b.rank).toBe(1 + slots.filter((s) => s.pick.obs > b.obs).length);
    expect(view.entries.filter((e) => e.role === 'boss')).toHaveLength(1);
  });

  it('leaves no phantom boss when omitted', () => {
    const view = lineupView([cw('telemarketers'), cw('registered-nurses')]);
    expect(view.hasBoss).toBe(false);
    expect(view.entries.some((e) => e.role === 'boss')).toBe(false);
    const card = lineupCardText(view, 'X');
    expect(card.rows.some((r) => r.boss)).toBe(false);
    expect(JSON.stringify(card.rows)).not.toMatch(/BOSS/);
    expect(lineupCardAlt(view, 'post')).not.toMatch(/boss/i);
  });

  it('picks boss quips only when the boss is alone at the top or bottom', () => {
    const top = VERDICTS[0];
    const low = VERDICTS[VERDICTS.length - 1];
    const mid = VERDICTS.find((x) => x.obs < top.obs && x.obs > low.obs)!;
    expect(BOSS_FIRST_QUIPS.map((q) => q.text)).toContain(lineupView([cw(mid.slug), cw(low.slug), boss(top.slug)]).quip);
    expect(BOSS_LAST_QUIPS.map((q) => q.text)).toContain(lineupView([cw(mid.slug), cw(top.slug), boss(low.slug)]).quip);
    expect(LINEUP_QUIPS.map((q) => q.text)).toContain(lineupView([cw(top.slug), cw(low.slug), boss(mid.slug)]).quip);
  });
});

describe('lineup view', () => {
  it('headlines the first pick by name or slot and prints its real title and score', () => {
    const named = lineupView([cw('registered-nurses', 'Ana'), cw('telemarketers', 'Bo')]);
    expect(named.headline).toBe('The robots pick Bo first');
    expect(named.subhead).toBe(`${v('telemarketers').title} · Doom Score ${v('telemarketers').obs}`);
    const unnamed = lineupView([cw('registered-nurses'), cw('telemarketers')]);
    expect(unnamed.headline).toBe('The robots pick coworker 2 first');
    const bossFirst = lineupView([cw('registered-nurses'), cw('electricians'), boss('telemarketers')]);
    expect(bossFirst.headline).toBe('The robots pick the boss first');
    expect(named.scoreLine).toBe(`Doom Scores, highest first: ${v('telemarketers').obs} · ${v('registered-nurses').obs}`);
  });

  it('calls a tie at the top a dead heat', () => {
    const [a, b] = realTie();
    const lower = VERDICTS.find((x) => x.obs < a.obs)!;
    const view = lineupView([cw(lower.slug), cw(a.slug), cw(b.slug)]);
    expect(view.topTied).toBe(true);
    expect(view.headline).toBe(HEADLINE_TOP_TIE);
    expect(view.subhead).toBe(`2 tied at Doom Score ${a.obs}`);
    expect(view.robotLine).toBe(ROBOT_TIE);
    expect(TIE_QUIPS.map((q) => q.text)).toContain(view.quip);
    expect(lineupView([cw('cashiers'), cw('cashiers')]).headline).toBe(HEADLINE_ALL_TIED);
  });

  it('validates the coworker and boss counts', () => {
    expect(lineupProblem([{ role: 'coworker' }])).toMatch(/two coworkers/);
    expect(lineupProblem([{ role: 'coworker' }, { role: 'boss' }])).toMatch(/two coworkers/);
    expect(lineupProblem([{ role: 'coworker' }, { role: 'coworker' }])).toBeNull();
    expect(lineupProblem(Array.from({ length: 5 }, () => ({ role: 'coworker' as const })))).toMatch(/four/);
    expect(lineupProblem([{ role: 'coworker' }, { role: 'coworker' }, { role: 'boss' }, { role: 'boss' }])).toMatch(/one boss/);
  });
});

describe('share links', () => {
  it('round-trips occupations, names, duplicates and the boss, with names only in #n=', () => {
    const slots = [cw('cashiers', 'Ana'), cw('cashiers', "O'Neil"), cw('lawyers'), boss('chief-executives', 'Mary-Jo')];
    const path = lineupPath(slots.map((s) => ({ role: s.role, slug: s.pick.slug, name: s.name })));
    const [beforeHash, hash] = path.split('#');
    expect(beforeHash).toBe('/office-lineup/?c=cashiers,cashiers,lawyers&boss=chief-executives');
    for (const n of ['Ana', 'Neil', 'Mary']) expect(beforeHash).not.toContain(n);
    expect(hash.startsWith('n=')).toBe(true);
    const url = new URL(path, 'https://humanobsolescenceindex.com');
    const link = parseLineupLink(url.search, url.hash);
    const resolved = resolveLineup(link, bySlug);
    expect(resolved.ready).toBe(true);
    expect(resolved.dropped).toBe(0);
    expect(resolved.slots.map((s) => [s.role, s.pick.slug, s.name])).toEqual(slots.map((s) => [s.role, s.pick.slug, s.name]));
    expect(lineupView(resolved.slots).entries).toEqual(lineupView(slots).entries);
  });

  it('writes no fragment for an unnamed lineup and keeps empty name positions', () => {
    expect(lineupPath([{ role: 'coworker', slug: 'a' }, { role: 'coworker', slug: 'b' }])).toBe('/office-lineup/?c=a,b');
    const bossOnly = lineupPath([{ role: 'coworker', slug: 'a' }, { role: 'coworker', slug: 'b' }, { role: 'boss', slug: 'c', name: 'Pat' }]);
    expect(bossOnly).toBe('/office-lineup/?c=a,b&boss=c#n=,,Pat');
    const link = parseLineupLink('?c=a,b&boss=c', '#n=,,Pat');
    expect(link.coworkers.map((s) => s.name)).toEqual(['', '']);
    expect(link.boss).toEqual({ slug: 'c', name: 'Pat' });
  });

  it('ignores ?n= and reads names only from the fragment', () => {
    const link = parseLineupLink('?c=lawyers,cashiers&n=Ana,Bo', '');
    expect(link.coworkers.map((s) => s.name)).toEqual(['', '']);
    expect(hasLineupLink('?c=lawyers')).toBe(true);
    expect(hasLineupLink('?n=Ana')).toBe(false);
  });

  it('drops hostile, over-long and undecodable names without shifting the others', () => {
    const hostile = encodeURIComponent('<img src=x onerror=alert(1)>');
    const link = parseLineupLink('?c=lawyers,cashiers,electricians,telemarketers&boss=chief-executives', `#n=${hostile},Bo,%E0%A4%A,${'x'.repeat(60)},Pat`);
    expect(link.coworkers.map((s) => s.name)).toEqual(['', 'Bo', '', '']);
    expect(link.boss?.name).toBe('Pat');
    const script = parseLineupLink('?c=lawyers,cashiers', `#n=${encodeURIComponent('"><script>alert(1)</script>')},${encodeURIComponent('Zoë')}`);
    expect(script.coworkers.map((s) => s.name)).toEqual(['', 'Zoë']);
  });

  it('drops every name when the fragment is oversized or has more names than slots', () => {
    const big = parseLineupLink('?c=lawyers,cashiers', `#n=Ana,Bo${','.repeat(MAX_NAME_FRAGMENT)}`);
    expect(big.namesDropped).toBe(true);
    expect(big.coworkers.map((s) => s.name)).toEqual(['', '']);
    const extra = parseLineupLink('?c=lawyers,cashiers', '#n=Ana,Bo,Cy');
    expect(extra.namesDropped).toBe(true);
    expect(extra.coworkers.map((s) => s.name)).toEqual(['', '']);
  });

  it('an encoded comma cannot shift names into the wrong slot', () => {
    const link = parseLineupLink('?c=lawyers,cashiers', `#n=${encodeURIComponent('Ana,Bo')},Cy`);
    expect(link.coworkers.map((s) => s.name)).toEqual(['', 'Cy']);
  });

  it('reads at most four coworkers and drops the names of a padded link', () => {
    const link = parseLineupLink('?c=a,b,c,d,e', '#n=A,B,C,D,E');
    expect(link.coworkers).toHaveLength(MAX_COWORKERS);
    expect(link.extraDropped).toBe(true);
    expect(link.coworkers.every((s) => s.name === '')).toBe(true);
  });

  it('drops stale and malformed slots together with their own names only', () => {
    const link = parseLineupLink('?c=lawyers,not-a-real-job,cashiers,%3Cscript%3E&boss=chief-executives', '#n=Ana,Ghost,Bo,Evil,Pat');
    const r = resolveLineup(link, bySlug);
    expect(r.dropped).toBe(2);
    expect(r.ready).toBe(true);
    expect(r.slots.map((s) => [s.role, s.pick.slug, s.name])).toEqual([
      ['coworker', 'lawyers', 'Ana'],
      ['coworker', 'cashiers', 'Bo'],
      ['boss', 'chief-executives', 'Pat'],
    ]);
    const partial = resolveLineup(parseLineupLink('?c=lawyers,gone-job', '#n=Ana,Bo'), bySlug);
    expect(partial.ready).toBe(false);
    expect(partial.slots.map((s) => s.name)).toEqual(['Ana']);
  });

  it('an empty boss parameter means no boss', () => {
    expect(parseLineupLink('?c=a,b&boss=', '').boss).toBeNull();
    expect(parseLineupLink('?c=a,b&boss=Bad%20Slug', '').boss).toEqual({ slug: null, name: '' });
  });
});

describe('share links at the name limit', () => {
  const people = (names: string[]) => [
    cw('cashiers', names[0]),
    cw('lawyers', names[1]),
    cw('cashiers', names[2]),
    cw('telemarketers', names[3]),
    boss('chief-executives', names[4]),
  ];
  const run = (from: number, to: number, offset: number) =>
    Array.from({ length: NAME_MAX }, (_, j) => String.fromCodePoint(from + ((offset * 7 + j) % (to - from + 1)))).join('');
  const greek = [0, 1, 2, 3, 4].map((i) => run(0x3b1, 0x3c9, i));
  const astral = [0, 1, 2, 3, 4].map((i) => run(0x10400, 0x1044f, i));

  for (const [label, names] of [
    ['Greek', greek],
    ['astral-plane', astral],
  ] as const) {
    it(`restores five distinct ${NAME_MAX}-letter ${label} names with their roles, slugs and boss`, () => {
      expect(new Set(names).size).toBe(5);
      for (const n of names) {
        expect(Array.from(n)).toHaveLength(NAME_MAX);
        expect(sanitizeName(n)).toBe(n);
      }
      const slots = people(names);
      const path = lineupPath(slots.map((s) => ({ role: s.role, slug: s.pick.slug, name: s.name })));
      const url = new URL(path, 'https://humanobsolescenceindex.com');
      for (const n of names) expect(url.search).not.toContain(encodeURIComponent(n));
      expect(url.hash.length).toBeLessThanOrEqual(MAX_NAME_FRAGMENT);
      const link = parseLineupLink(url.search, url.hash);
      expect(link.namesDropped).toBe(false);
      expect(link.boss).toEqual({ slug: 'chief-executives', name: names[4] });
      const resolved = resolveLineup(link, bySlug);
      expect(resolved.ready).toBe(true);
      expect(resolved.dropped).toBe(0);
      expect(resolved.slots.map((s) => [s.role, s.pick.slug, s.name])).toEqual(slots.map((s) => [s.role, s.pick.slug, s.name]));
      expect(lineupView(resolved.slots).entries).toEqual(lineupView(slots).entries);
      expect(lineupCardText(lineupView(resolved.slots), '2026-Q4')).toEqual(lineupCardText(lineupView(slots), '2026-Q4'));
    });
  }

  it('bounds the fragment by the worst-case encoding of five full names', () => {
    const worst = `#n=${Array.from({ length: MAX_COWORKERS + 1 }, () => encodeURIComponent(String.fromCodePoint(0x10400).repeat(NAME_MAX))).join(',')}`;
    expect(worst.length).toBe(MAX_NAME_FRAGMENT);
    const over = parseLineupLink('?c=lawyers,cashiers', `#n=Ana,Bo,${'%F0%90%90%80'.repeat(MAX_NAME_FRAGMENT)}`);
    expect(over.namesDropped).toBe(true);
    expect(over.coworkers.map((s) => s.name)).toEqual(['', '']);
  });
});

describe('share links with empty occupation positions', () => {
  it('keeps each name with its own position when an occupation entry is empty', () => {
    const link = parseLineupLink('?c=,cashiers,lawyers', '#n=,Bo');
    expect(link.namesDropped).toBe(false);
    expect(link.coworkers).toEqual([
      { slug: 'cashiers', name: 'Bo' },
      { slug: 'lawyers', name: '' },
    ]);
    const r = resolveLineup(link, bySlug);
    expect(r.slots.map((s) => [s.role, s.pick.slug, s.name])).toEqual([
      ['coworker', 'cashiers', 'Bo'],
      ['coworker', 'lawyers', ''],
    ]);
  });

  it('discards a name paired with an empty position instead of moving it', () => {
    const link = parseLineupLink('?c=cashiers,,lawyers', '#n=Ana,Ghost,Cy');
    expect(link.coworkers).toEqual([
      { slug: 'cashiers', name: 'Ana' },
      { slug: 'lawyers', name: 'Cy' },
    ]);
  });

  it('keeps the boss name at the boss position after empty occupation entries', () => {
    const trailing = parseLineupLink('?c=cashiers,lawyers,&boss=chief-executives', '#n=Ana,Bo,,Pat');
    expect(trailing.coworkers.map((s) => s.name)).toEqual(['Ana', 'Bo']);
    expect(trailing.boss).toEqual({ slug: 'chief-executives', name: 'Pat' });
    const leading = parseLineupLink('?c=,cashiers,lawyers&boss=chief-executives', '#n=,Bo,Cy,Pat');
    expect(leading.coworkers.map((s) => [s.slug, s.name])).toEqual([
      ['cashiers', 'Bo'],
      ['lawyers', 'Cy'],
    ]);
    expect(leading.boss).toEqual({ slug: 'chief-executives', name: 'Pat' });
    const bossOnlyName = parseLineupLink('?c=,cashiers,lawyers&boss=chief-executives', '#n=,,,Pat');
    expect(bossOnlyName.coworkers.map((s) => s.name)).toEqual(['', '']);
    expect(bossOnlyName.boss?.name).toBe('Pat');
    expect(resolveLineup(bossOnlyName, bySlug).slots.find((s) => s.role === 'boss')?.name).toBe('Pat');
  });

  it('a missing or empty c still means no coworkers', () => {
    for (const search of ['?boss=chief-executives', '?c=&boss=chief-executives']) {
      const link = parseLineupLink(search, '#n=Pat');
      expect(link.coworkers).toEqual([]);
      expect(link.boss).toEqual({ slug: 'chief-executives', name: 'Pat' });
      expect(link.namesDropped).toBe(false);
      expect(resolveLineup(link, bySlug).ready).toBe(false);
    }
    expect(parseLineupLink('?c=', '').coworkers).toEqual([]);
  });
});
describe('lineup copy and cards', () => {
  it('carries no numbers, predictions or real names, and never mocks workers', () => {
    for (const text of ALL_LINEUP_COPY) {
      expect(panicLineProblems(text), text).toEqual([]);
      expect(mockingMatches(text), text).toEqual([]);
      for (const re of [...BANNED_ROAST_PHRASES, ...WORKER_MOCKING_PHRASES]) expect(text, `${text} ${re}`).not.toMatch(re);
    }
  });

  it('the card prints every role, name, real score and boss flag in ranked order, with the URL and no disclaimer', () => {
    const slots = [cw('registered-nurses', 'Ana'), cw('telemarketers'), cw('telemarketers', 'Bo'), boss('chief-executives', 'Pat')];
    const view = lineupView(slots);
    const t = lineupCardText(view, '2026-Q4');
    expect(t.rows.map((r) => r.score)).toEqual(view.entries.map((e) => String(v(e.slug).obs)));
    expect(t.rows.map((r) => r.title)).toEqual(view.entries.map((e) => v(e.slug).title.toUpperCase()));
    expect(t.rows.map((r) => r.who)).toEqual(view.entries.map((e) => (e.name || (e.role === 'boss' ? 'The boss' : `Coworker ${e.slot + 1}`)).toUpperCase()));
    expect(t.rows.filter((r) => r.boss)).toHaveLength(1);
    expect(t.rows.find((r) => r.boss)!.who).toBe('PAT');
    expect(t.url).toBe(SITE_DOMAIN);
    expect(JSON.stringify(t)).not.toContain('≠');
    expect(lineupCardFileName(view, 'story')).toMatch(/^daily-doom-office-lineup-[a-z0-9-]+-4-story\.png$/);
    const alt = lineupCardAlt(view, 'post');
    for (const e of view.entries) expect(alt).toContain(`${e.title}, Doom Score ${e.obs}`);
  });

  it('every number a card prints is a committed Doom Score, a rank or the edition', () => {
    const view = lineupView([cw('lawyers', 'Ana'), cw('cashiers'), boss('electricians')]);
    const t = lineupCardText(view, '2026-Q4');
    const allowed = new Set([...view.entries.map((e) => String(e.obs)), ...view.entries.map((e) => String(e.rank)), '2026', '4', String(view.entries.length)]);
    const text = [t.headline, t.subhead, t.scoreLine, t.robotLine, t.quip, t.strap, ...t.rows.flatMap((r) => [r.placard, r.who, r.score])].join(' ');
    for (const n of text.match(/\d+/g) ?? []) expect(allowed.has(n), n).toBe(true);
  });
});

describe('office lineup is a real page', () => {
  it('is linked from the main navigation and listed in the sitemap', () => {
    expect(NAV_ITEMS.find((i) => i.href === '/office-lineup/')?.label).toBe('Office lineup');
    expect(sitePaths()).toContain('/office-lineup/');
    expect(existsSync(join(root, 'src/pages/office-lineup.astro'))).toBe(true);
  });

  it('server-renders no names and sends no data anywhere but its own static files', () => {
    const page = readFileSync(join(root, 'src/pages/office-lineup.astro'), 'utf8');
    const script = readFileSync(join(root, 'src/lib/lineup-page.ts'), 'utf8');
    expect(page).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    expect(script).not.toMatch(/localStorage|sessionStorage|document\.cookie|sendBeacon|XMLHttpRequest|innerHTML/);
    expect([...script.matchAll(/fetchJson<[^>]+>\('([^']+)'\)/g)].map((m) => m[1]).sort()).toEqual(['/data/search-index.json', '/data/verdicts.json']);
  });
});
