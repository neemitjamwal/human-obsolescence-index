import { describe, expect, it } from 'vitest';
import { BATTLE_PAIRS, BATTLE_QUIPS, FEATURED_BATTLE, REFEREE_SAME, REFEREE_TIE, REFEREE_WIN, TIE_QUIPS } from '../src/data/battles';
import { BANNED_ROAST_PHRASES, WORKER_MOCKING_PHRASES } from '../src/data/roasts';
import { battleOutcome, battleQueryPath, committedPair, committedPick, battleView, isCuratedPair, pairKey, parseBattleQuery, type Fighter } from '../src/lib/battle';
import { battleCardAlt, battleCardFileName, battleCardText } from '../src/lib/battle-card';
import { CURATED_BATTLES, FEATURED, fighter } from '../src/lib/battle-data';
import { SITE_DOMAIN } from '../src/lib/site';
import { VERDICTS, verdictBySlug } from '../src/lib/verdicts';
import { renderBattleSvg } from '../scripts/lib/verdict-cards.mjs';

const f = (slug: string): Fighter => fighter(verdictBySlug(slug)!);
const NUMBER = /\d/;

describe('battle outcome', () => {
  it('the lower Doom Score is the safer job, whichever corner it is in', () => {
    expect(battleOutcome({ slug: 'x', obs: 30 }, { slug: 'y', obs: 70 })).toEqual({ kind: 'win', winner: 'a', loser: 'b', margin: 40 });
    expect(battleOutcome({ slug: 'x', obs: 70 }, { slug: 'y', obs: 30 })).toEqual({ kind: 'win', winner: 'b', loser: 'a', margin: 40 });
  });

  it('handles a tie and the same job in both corners', () => {
    expect(battleOutcome({ slug: 'x', obs: 50 }, { slug: 'y', obs: 50 })).toEqual({ kind: 'tie' });
    expect(battleOutcome({ slug: 'x', obs: 50 }, { slug: 'x', obs: 50 })).toEqual({ kind: 'same' });
  });

  it('a real tie between two verdicts reads as a dead heat with no pink slip', () => {
    const byObs = new Map<number, string>();
    let pair: [string, string] | null = null;
    for (const v of VERDICTS) {
      const other = byObs.get(v.obs);
      if (other) {
        pair = [other, v.slug];
        break;
      }
      byObs.set(v.obs, v.slug);
    }
    expect(pair).not.toBeNull();
    const view = battleView(f(pair![0]), f(pair![1]));
    expect(view.outcome.kind).toBe('tie');
    expect([view.a.fate, view.b.fate]).toEqual(['even', 'even']);
    expect(view.pinkSlipTitle).toBe('');
    expect(view.referee).toBe(REFEREE_TIE);
    expect(TIE_QUIPS.map((q) => q.text)).toContain(view.quip);
  });

  it('same job twice asks for a real opponent', () => {
    const view = battleView(f('lawyers'), f('lawyers'));
    expect(view.outcome.kind).toBe('same');
    expect(view.referee).toBe(REFEREE_SAME);
  });
});

describe('battle views use verdicts.json numbers', () => {
  it.each([
    ['lawyers', 'plumbers-pipefitters-and-steamfitters'],
    ['software-developers', 'electricians'],
    ['accountants-and-auditors', 'registered-nurses'],
    ['telemarketers', 'plumbers-pipefitters-and-steamfitters'],
  ])('%s vs %s', (a, b) => {
    const va = verdictBySlug(a)!;
    const vb = verdictBySlug(b)!;
    const view = battleView(fighter(va), fighter(vb));
    expect(view.a.score).toBe(String(va.obs));
    expect(view.b.score).toBe(String(vb.obs));
    const safer = va.obs < vb.obs ? va : vb;
    const other = safer === va ? vb : va;
    expect(view.winnerTitle).toBe(safer.title);
    expect(view.pinkSlipTitle).toBe(other.title);
    expect(view.headline).toBe(`${safer.title} win by ${Math.abs(va.obs - vb.obs)}`);
    expect(view.referee).toBe(REFEREE_WIN.replace('{job}', other.title));
    expect(view.scoreLine).toBe(`Doom Score ${va.obs} vs ${vb.obs}`);
  });
});

describe('curated battles', () => {
  it('has about 40 unique pairs of real, distinct verdicts', () => {
    expect(BATTLE_PAIRS.length).toBe(40);
    const keys = BATTLE_PAIRS.map(([a, b]) => pairKey(a, b));
    expect(new Set(keys).size).toBe(keys.length);
    const unordered = BATTLE_PAIRS.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(unordered).size).toBe(unordered.length);
    for (const [a, b] of BATTLE_PAIRS) {
      expect(a).not.toBe(b);
      expect(verdictBySlug(a), a).toBeDefined();
      expect(verdictBySlug(b), b).toBeDefined();
    }
  });

  it('includes the launch matchups and the featured fight', () => {
    for (const [a, b] of [
      ['lawyers', 'plumbers-pipefitters-and-steamfitters'],
      ['software-developers', 'electricians'],
      ['accountants-and-auditors', 'registered-nurses'],
    ]) {
      expect(isCuratedPair(a, b), `${a} vs ${b}`).toBe(true);
    }
    expect(isCuratedPair(...FEATURED_BATTLE)).toBe(true);
    expect(FEATURED.view.outcome.kind).toBe('win');
  });

  it('every curated battle names the lower Doom Score as safer and links its own page and card', () => {
    for (const b of CURATED_BATTLES) {
      expect(b.path).toBe(`/vs/${b.key}/`);
      expect(b.og).toBe(`/og/vs/${b.key}.png`);
      const o = b.view.outcome;
      if (o.kind === 'win') {
        const safer = o.winner === 'a' ? b.a : b.b;
        const other = o.winner === 'a' ? b.b : b.a;
        expect(safer.obs).toBeLessThan(other.obs);
        expect(b.view[o.loser].fate).toBe('pinkslip');
        expect(b.view[o.winner].fate).toBe('safer');
      } else {
        expect(b.a.obs).toBe(b.b.obs);
      }
    }
  });
});

describe('committed picks', () => {
  const lawyers = { slug: 'lawyers', title: 'Lawyers' };
  const plumbers = { slug: 'plumbers', title: 'Plumbers, pipefitters, and steamfitters' };
  it('a pick counts only while its input still shows that job', () => {
    expect(committedPick(lawyers, 'Lawyers')).toBe(lawyers);
    expect(committedPick(lawyers, '  Lawyers ')).toBe(lawyers);
    expect(committedPick(lawyers, '')).toBeNull();
    expect(committedPick(lawyers, 'Lawyer')).toBeNull();
    expect(committedPick(null, 'Lawyers')).toBeNull();
  });

  it('clearing the red corner after choosing it withdraws the matchup', () => {
    const picks = { a: lawyers, b: plumbers };
    expect(committedPair(picks, { a: 'Lawyers', b: plumbers.title })).toEqual({ a: lawyers, b: plumbers });
    expect(committedPair(picks, { a: '', b: plumbers.title })).toBeNull();
    expect(committedPair(picks, { a: 'Law', b: plumbers.title })).toBeNull();
    expect(committedPair({ a: lawyers, b: null }, { a: 'Lawyers', b: plumbers.title })).toBeNull();
  });
});

describe('battle query', () => {
  it('round-trips ?a=&b= and ignores anything that is not a slug', () => {
    const path = battleQueryPath('lawyers', 'electricians');
    expect(parseBattleQuery(path.split('?')[1])).toEqual({ a: 'lawyers', b: 'electricians' });
    expect(parseBattleQuery('?a=<script>&b=Lawyers')).toEqual({ a: null, b: null });
    expect(parseBattleQuery('')).toEqual({ a: null, b: null });
  });
});

describe('battle copy and cards', () => {
  const copy = [...BATTLE_QUIPS.map((q) => q.text), ...TIE_QUIPS.map((q) => q.text), REFEREE_WIN, REFEREE_TIE, REFEREE_SAME];

  it('carries no numbers and never mocks workers', () => {
    for (const text of copy) {
      expect(text, text).not.toMatch(NUMBER);
      for (const re of [...BANNED_ROAST_PHRASES, ...WORKER_MOCKING_PHRASES]) expect(text, `${text} ${re}`).not.toMatch(re);
    }
  });

  it('the canvas card text has both names, both scores and the site URL, but no disclaimer', () => {
    for (const b of CURATED_BATTLES.slice(0, 5)) {
      const t = battleCardText(b.view, 'X');
      expect(t.a.title).toBe(b.a.title.toUpperCase());
      expect(t.b.title).toBe(b.b.title.toUpperCase());
      expect(t.a.score).toBe(String(b.a.obs));
      expect(t.b.score).toBe(String(b.b.obs));
      expect(t.url).toBe(SITE_DOMAIN);
      expect(JSON.stringify(t)).not.toContain('≠');
      expect(battleCardFileName(b.view, 'post')).toMatch(/\.png$/);
      expect(battleCardAlt(b.view, 'post')).toContain(b.a.title);
    }
  });

  it('the OG battle SVG puts the pink slip on the higher Doom Score and carries the site URL', () => {
    for (const b of CURATED_BATTLES) {
      const svg = renderBattleSvg({ ...b.view, edition: 'X' }, {});
      expect(svg).toContain(`data-obs="${b.a.obs}"`);
      expect(svg).toContain(`data-obs="${b.b.obs}"`);
      expect(svg).toContain(SITE_DOMAIN);
      const o = b.view.outcome;
      if (o.kind === 'win') expect(svg).toContain(`data-pink-slip="${o.loser}"`);
      for (const re of BANNED_ROAST_PHRASES) expect(svg).not.toMatch(re);
    }
  });
});
