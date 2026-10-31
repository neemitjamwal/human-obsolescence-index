import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CITE_ONLY, LICENSING_CREDITS } from '../src/data/credits';
import { SOURCES } from '../src/lib/data';
import {
  RED_LIST,
  filesWithLocalUrls,
  filesWithRedListOutsideCiteLinks,
  listFiles,
  stripCiteOnlyLinks,
  unexpectedDataFiles,
} from '../scripts/lib/dist-hygiene.mjs';

const root = join(__dirname, '..');
const dist = join(root, 'dist');
const CITE_ONLY_OR_OUTSIDE = /weforum|layoffs\.fyi|canar|digitaleconomy\.stanford|siepr\.stanford|adp\.com/i;

describe('licensing credits', () => {
  it('credits each dataset with its exact, versioned license', () => {
    const byId = (id: string) => LICENSING_CREDITS.find((c) => c.id === id)!;
    expect(byId('onet').who).toBe('O*NET 31.0 Database');
    expect(byId('onet').what).toContain('O*NET 31.0 Database');
    expect(byId('onet').license).toBe('CC BY 4.0');
    expect(byId('microsoft').who).toMatch(/^Microsoft/);
    expect(byId('microsoft').license).toBe('CC BY 4.0');
    expect(byId('openai').who).toMatch(/^OpenAI/);
    expect(byId('openai').license).toMatch(/^MIT/);
    expect(byId('bls').who).toBe('U.S. Bureau of Labor Statistics');
    expect(byId('bls').license).toMatch(/public domain/i);
  });
});

describe('red-list discipline', () => {
  it('lists exactly the two red-list sources as cite-only', () => {
    expect(CITE_ONLY.map((c) => c.url)).toEqual([
      'https://www.weforum.org/publications/the-future-of-jobs-report-2025/',
      'https://layoffs.fyi/',
    ]);
  });

  it('never feeds red-list or outside-evidence sources into the pipeline', () => {
    for (const s of SOURCES) expect(`${s.id} ${s.url}`).not.toMatch(CITE_ONLY_OR_OUTSIDE);
    const config = readFileSync(join(root, 'scripts/lib/config.mjs'), 'utf8');
    expect(config).not.toMatch(CITE_ONLY_OR_OUTSIDE);
    const occupations = readFileSync(join(root, 'src/data/occupations.json'), 'utf8');
    expect(occupations).not.toMatch(CITE_ONLY_OR_OUTSIDE);
  });

  it('ships no raw data files in public/ beyond the generated stat pack', () => {
    expect(unexpectedDataFiles(join(root, 'public'), ['stat-pack/hoi-top50.csv'])).toEqual([]);
  });

  it('treats only labeled cite-only anchors as allowed mentions', () => {
    expect(RED_LIST.test(stripCiteOnlyLinks('<a class="underline" href="https://layoffs.fyi/" data-cite-only>layoffs.fyi</a>'))).toBe(false);
    expect(RED_LIST.test(stripCiteOnlyLinks('<a href="https://www.weforum.org/x">WEF</a>'))).toBe(true);
  });
});

describe.skipIf(!existsSync(join(dist, 'index.html')))('built output', () => {
  it('contains no localhost or 127.0.0.1 URLs in any text file', () => {
    expect(filesWithLocalUrls(dist)).toEqual([]);
  });

  it('mentions red-list sources only inside cite-only links on /about/', () => {
    expect(filesWithRedListOutsideCiteLinks(dist)).toEqual([]);
  });

  it('re-hosts no raw data (no Stanford Canaries files)', () => {
    expect(unexpectedDataFiles(dist, ['stat-pack/hoi-top50.csv'])).toEqual([]);
    expect(listFiles(dist).length).toBeGreaterThan(0);
  });
});
