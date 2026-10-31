import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assignSlugs, buildUniverse } from '../scripts/lib/join.mjs';

const root = join(__dirname, '..');
const pipelineFiles = [
  join(root, 'scripts', 'build-index.mjs'),
  ...readdirSync(join(root, 'scripts', 'lib')).filter((f) => f.endsWith('.mjs')).map((f) => join(root, 'scripts', 'lib', f)),
];

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

// Patterns that would mean a join or lookup keyed on an occupation title.
const TITLE_JOIN_PATTERNS = [
  /\btitle\w*\b[\w.?\]()]*\s*[!=]==?/i, // title === x
  /[!=]==?\s*[\w.?]*\btitle\w*\b/i, // x === y.title
  /\.(get|has|set|delete)\(\s*[\w.?]*\btitle/i, // map.get(title)
  /\w\[\s*[\w.?]*\btitle\w*\s*\]\s*=(?!=)/i, // obj[title] = ...
  /\.(localeCompare|includes|startsWith)\(\s*[\w.?]*\btitle/i, // fuzzy title matching
  /(groupBy|keyBy|indexBy)\([^)]*title/i,
];

function titleJoins(src: string): string[] {
  return stripComments(src)
    .split('\n')
    .filter((line) => TITLE_JOIN_PATTERNS.some((re) => re.test(line)));
}

describe('join sanity: SOC codes only, never titles', () => {
  it('the detector catches title-based joins', () => {
    for (const bad of [
      'const hit = rows.find((r) => r.title === occ.title);',
      'if (a.TITLE.toLowerCase() == b) {}',
      'const m = byTitle.get(row.title);',
      'index[row.title] = row;',
      'occ.title.localeCompare(other.title)',
    ]) {
      expect(titleJoins(bad), bad).not.toHaveLength(0);
    }
    expect(titleJoins('const u = bySoc.get(o.soc); title: o.title,')).toHaveLength(0);
  });

  it('no pipeline module joins or looks up by title', () => {
    expect(pipelineFiles.length).toBeGreaterThanOrEqual(8);
    for (const file of pipelineFiles) {
      expect(titleJoins(readFileSync(file, 'utf8')), file).toEqual([]);
    }
  });

  it('buildUniverse joins on code even when titles disagree, and rejects bad codes', () => {
    const empty = new Map();
    const crosswalk = {
      socToOnet: new Map([['11-1011', ['11-1011.00', '11-1011.03']]]),
      onetToSoc: new Map([['11-1011.00', '11-1011'], ['11-1011.03', '11-1011']]),
      oohBySoc: empty,
    };
    const ep = { occupations: [{ soc: '11-1011', title: 'Chief executives', changePercent: 3.2 }] };
    const [u] = buildUniverse({
      ep,
      aiExposure: { bySoc: new Map([['11-1011', 'Very high']]) },
      oews: { detailed: new Map([['11-1011', { totEmp: 204350 }]]), other: empty },
      crosswalk,
      microsoft: new Map([['11-1011', 0.1555]]),
      eloundou: new Map([['11-1011.00', 0.46], ['11-1011.03', 0.56]]),
    });
    expect(u.title).toBe('Chief executives');
    expect(u.blsCategory).toBe('Very high');
    expect(u.oes.totEmp).toBe(204350);
    expect(u.msft).toBe(0.1555);
    expect(u.eld).toBeCloseTo(0.51, 12);
    expect(u.eldOnetCodes).toEqual(['11-1011.00', '11-1011.03']);

    const bad = { occupations: [{ soc: 'Chief executives', title: 'Chief executives', changePercent: 1 }] };
    expect(() =>
      buildUniverse({ ep: bad, aiExposure: { bySoc: empty }, oews: { detailed: empty, other: empty }, crosswalk, microsoft: empty, eloundou: empty }),
    ).toThrow(/invalid SOC/);
  });

  it('slugs are unique; collisions get the SOC code', () => {
    const rows = [
      { soc: '11-0001', title: 'Same name' },
      { soc: '11-0002', title: 'Same name' },
      { soc: '11-0003', title: 'Bakers & cooks' },
    ] as { soc: string; title: string; slug?: string }[];
    assignSlugs(rows);
    expect(rows.map((r) => r.slug)).toEqual(['same-name-11-0001', 'same-name-11-0002', 'bakers-and-cooks']);
  });
});
