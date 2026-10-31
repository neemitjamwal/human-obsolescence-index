import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createMatcher, match, normalize, stem, tokenScore, withinOneEdit, type SearchIndex } from '../src/lib/match';

const root = join(__dirname, '..');
const live: SearchIndex = JSON.parse(readFileSync(join(root, 'public/data/search-index.json'), 'utf8'));
const liveMatch = createMatcher(live);
const socs = (q: string) => liveMatch(q).map((s) => s.soc);

const fixture: SearchIndex = {
  entries: [
    { soc: '13-2011', slug: 'accountants-and-auditors', title: 'Accountants and auditors', obs: 80, aliases: ['Accountant', 'CPA', 'Cost Accountant'] },
    { soc: '13-2031', slug: 'budget-analysts', title: 'Budget analysts', obs: 84, aliases: ['Cost Accountant'] },
    { soc: '23-1011', slug: 'lawyers', title: 'Lawyers', obs: 70, aliases: ['Attorney', 'Lawyer'] },
    { soc: '23-1012', slug: 'judicial-law-clerks', title: 'Judicial law clerks', obs: 75, aliases: ['Lawyers Assistant', 'Law Clerk'] },
    { soc: '35-2014', slug: 'cooks-restaurant', title: 'Cooks, restaurant', obs: 20, aliases: ['Line Cook'] },
    { soc: '15-1252', slug: 'software-developers', title: 'Software developers', obs: 62, aliases: ['Software Engineer'] },
    { soc: '29-2072', slug: 'medical-records-specialists', title: 'Medical records specialists', obs: 61, aliases: ['Coder'] },
  ],
  slang: [{ alias: 'coder', soc: '15-1252', note: 'Everyday name for software developers.' }],
};

describe('normalize', () => {
  it('folds case, punctuation, accents, "&" and whitespace', () => {
    expect(normalize('  ACCOUNTANTS   &  Auditors!! ')).toBe('accountants and auditors');
    expect(normalize('Police and sheriff’s patrol officers')).toBe('police and sheriffs patrol officers');
    expect(normalize('Café\tbarista\n')).toBe('cafe barista');
    expect(normalize('Helpers--electricians')).toBe('helpers electricians');
    expect(normalize('Driver/sales workers')).toBe('driver sales workers');
  });

  it('folds plurals for comparison', () => {
    expect(stem('accountants')).toBe('accountant');
    expect(stem('secretaries')).toBe('secretary');
    expect(stem('actress')).toBe('actress');
  });

  it('treats differently formatted queries identically', () => {
    expect(match(fixture, 'ACCOUNTANT!!')).toEqual(match(fixture, '  accountant '));
  });
});

describe('token and prefix scoring', () => {
  it('ranks exact over prefix over typo over nothing', () => {
    expect(tokenScore('lawyer', 'lawyer')).toBe(3);
    expect(tokenScore('law', 'lawyer')).toBe(2);
    expect(tokenScore('lawyre', 'lawyer')).toBe(1.5);
    expect(tokenScore('plumber', 'lawyer')).toBe(0);
  });

  it('matches partially typed words by prefix', () => {
    expect(match(fixture, 'accou')[0].soc).toBe('13-2011');
    expect(match(fixture, 'soft dev')[0].soc).toBe('15-1252');
  });

  it('requires every query word to match something', () => {
    expect(match(fixture, 'software plumber')).toEqual([]);
  });
});

describe('exact SOC title wins', () => {
  it('beats every alias and fuzzy match', () => {
    const r = match(fixture, 'lawyers');
    expect(r[0]).toMatchObject({ soc: '23-1011', kind: 'title' });
    expect(r[0].score).toBeGreaterThan(r[1].score);
    expect(match(fixture, 'Accountants and auditors')[0]).toMatchObject({ soc: '13-2011', kind: 'title' });
  });

  it('wins on the live index too', () => {
    for (const [q, soc] of [['Cashiers', '41-2011'], ['Telemarketers', '41-9041'], ['registered nurses', '29-1141'], ['Lawyers', '23-1011']]) {
      expect(liveMatch(q)[0], q).toMatchObject({ soc, kind: 'title' });
    }
  });
});

describe('typo tolerance (Damerau-Levenshtein <= 1, tokens of 5+ characters)', () => {
  it('accepts one transposition, insertion, deletion or substitution', () => {
    expect(withinOneEdit('acocuntant', 'accountant')).toBe(true); // transposition
    expect(withinOneEdit('accountantt', 'accountant')).toBe(true); // insertion
    expect(withinOneEdit('acountant', 'accountant')).toBe(true); // deletion
    expect(withinOneEdit('accuuntant', 'accountant')).toBe(true); // substitution
    expect(withinOneEdit('acountnat', 'accountant')).toBe(false); // two edits
  });

  it('finds the occupation for each kind of single typo', () => {
    for (const q of ['acountant', 'accoutnant', 'accountantt', 'accuuntant']) expect(match(fixture, q)[0]?.soc, q).toBe('13-2011');
  });

  it('does not tolerate typos in tokens under 5 characters', () => {
    expect(tokenScore('cokk', 'cook')).toBe(0);
    expect(match(fixture, 'cokk')).toEqual([]);
    expect(match(fixture, 'cook')[0].soc).toBe('35-2014');
  });

  it('live: "acountant" surfaces accountants and auditors first', () => {
    expect(socs('acountant')[0]).toBe('13-2011');
  });
});

describe('aliases and slang', () => {
  it('live: real O*NET alternate/reported titles find their occupation', () => {
    expect(socs('attorney')[0]).toBe('23-1011');
    expect(socs('CPA')).toContain('13-2011');
    expect(socs('paralegal')[0]).toBe('23-2011');
  });

  it('live: slang "coder" ranks software developers first, with its note', () => {
    const [top] = liveMatch('coder');
    expect(top).toMatchObject({ soc: '15-1252', kind: 'slang', matched: 'coder' });
    expect(top.note).toMatch(/software developers/i);
  });

  it('slang beats an O*NET alias with the same text', () => {
    expect(match(fixture, 'coder').map((s) => s.soc)).toEqual(['15-1252', '29-2072']);
  });
});

describe('suggestions', () => {
  it('returns at most 5, deterministically ordered', () => {
    const a = liveMatch('manager');
    expect(a).toHaveLength(5);
    expect(liveMatch('manager')).toEqual(a);
    for (let i = 1; i < a.length; i++) expect(a[i - 1].score).toBeGreaterThanOrEqual(a[i].score);
    expect(match(fixture, 'cost accountant').map((s) => s.soc)).toEqual(['13-2011', '13-2031']);
  });

  it('returns the honest empty list for unknown strings', () => {
    expect(liveMatch('qwxzzk')).toEqual([]);
    expect(liveMatch('zzzzzzzzzz')).toEqual([]);
    expect(liveMatch('')).toEqual([]);
    expect(liveMatch('a')).toEqual([]);
  });

  it('makes no network call', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('XMLHttpRequest', vi.fn());
    createMatcher(live)('software developer');
    match(fixture, 'coder');
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
    const src = readFileSync(join(root, 'src/lib/match.ts'), 'utf8');
    expect(src).not.toMatch(/\bfetch\(|XMLHttpRequest|import\(/);
  });
});
