import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { SLANG_ALIASES } from '../src/data/slang-aliases';
import { normalize, type SearchIndex } from '../src/lib/match';
import { VERDICTS } from '../src/lib/verdicts';

const root = join(__dirname, '..');
const raw = readFileSync(join(root, 'public/data/search-index.json'));
const index: SearchIndex & { attribution: string; sourceIds: string[] } = JSON.parse(raw.toString('utf8'));
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
const universe = new Map<string, any>(data.universe.map((u: any) => [u.soc, u]));
const cache = join(root, '.cache/raw');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]));
}

describe('public/data/search-index.json', () => {
  it('is at most 150 KB gzip', () => {
    const gz = gzipSync(raw).length;
    expect(gz).toBeLessThanOrEqual(150 * 1024);
  });

  it('has one entry per scored occupation, each resolving to the universe', () => {
    expect(index.entries).toHaveLength(VERDICTS.length);
    for (const e of index.entries) {
      const u = universe.get(e.soc);
      expect(u, e.soc).toBeDefined();
      expect(e.slug).toBe(u.slug);
      expect(e.title).toBe(u.title);
      expect(e.obs).toBe(u.obs);
    }
  });

  it('keeps at most 25 deduped aliases per occupation, none repeating the title', () => {
    let total = 0;
    for (const e of index.entries) {
      expect(e.aliases.length).toBeLessThanOrEqual(25);
      const keys = e.aliases.map(normalize);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys).not.toContain(normalize(e.title));
      total += e.aliases.length;
    }
    expect(total).toBeGreaterThan(10000);
  });

  it('credits O*NET 31.0 and the BLS crosswalk', () => {
    expect(index.attribution).toContain('O*NET 31.0 Database');
    expect(index.attribution).toContain('CC BY 4.0');
    expect(index.sourceIds).toEqual(['onet-31', 'bls-crosswalk']);
  });

  it('includes every curated slang alias, each pointing at a scored occupation with a note', () => {
    expect(index.slang).toEqual(SLANG_ALIASES.map((s) => ({ alias: s.alias, soc: s.soc, note: s.note })));
    for (const s of SLANG_ALIASES) {
      expect(universe.get(s.soc)?.obs, s.alias).not.toBeNull();
      expect(s.note.length).toBeGreaterThan(10);
    }
    expect(SLANG_ALIASES.find((s) => s.alias === 'coder')?.soc).toBe('15-1252');
    expect(new Set(SLANG_ALIASES.map((s) => normalize(s.alias))).size).toBe(SLANG_ALIASES.length);
  });

  it('is not bundled into any page or script (it is fetched lazily from /data/)', () => {
    const offenders = walk(join(root, 'src')).filter((f) => /\.(astro|ts|mjs|js)$/.test(f) && /import[^;]*search-index\.json/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it.skipIf(!existsSync(join(cache, 'db_31_0_text.zip')) || !existsSync(join(cache, 'nem-onet-to-soc-crosswalk.xlsx')))(
    'every O*NET alias comes from the occupation’s own O*NET-SOC codes',
    async () => {
      const { parseCrosswalk, parseOnetTitles } = await import('../scripts/lib/parse.mjs');
      const titles = parseOnetTitles(readFileSync(join(cache, 'db_31_0_text.zip')));
      const crosswalk = await parseCrosswalk(readFileSync(join(cache, 'nem-onet-to-soc-crosswalk.xlsx')));
      const bad: string[] = [];
      for (const e of index.entries) {
        const allowed = new Set<string>();
        for (const code of crosswalk.socToOnet.get(e.soc) ?? []) {
          for (const r of titles.reportedByOnet.get(code) ?? []) allowed.add(r.title);
          for (const t of titles.jobTitlesByOnet.get(code) ?? []) {
            allowed.add(t.title);
            if (t.short) allowed.add(t.short);
          }
        }
        for (const a of e.aliases) if (!allowed.has(a)) bad.push(`${e.soc} ${a}`);
      }
      expect(bad).toEqual([]);
    },
    60_000,
  );
});
