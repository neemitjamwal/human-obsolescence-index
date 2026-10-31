import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scoreBand } from '../src/lib/ledger';
import { VERDICTS, VERDICTS_META, verdictBySlug } from '../src/lib/verdicts';

const root = join(__dirname, '..');
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
const sources = JSON.parse(readFileSync(join(root, 'src/data/sources.json'), 'utf8'));
const universe: any[] = data.universe;
const occupations: any[] = data.occupations;
const FIELDS = [
  'soc', 'slug', 'title', 'obs', 'band', 'blsCategory', 'exposure', 'trajectory', 'projectedChangePct',
  'employment', 'medianWage', 'topTask', 'hasFullPage', 'sourceIds',
];

/** Every verdict value as occupations.json states it (universe row, cross-checked against the full payload). */
function expectedFrom(u: any) {
  return {
    soc: u.soc,
    slug: u.slug,
    title: u.title,
    obs: u.obs,
    band: scoreBand(u.obs),
    blsCategory: u.blsCategory,
    exposure: u.exposure,
    trajectory: u.trajectory,
    projectedChangePct: u.changePercent,
    employment: u.employment,
    medianWage: u.medianWage,
    topTask: u.topTask,
    hasFullPage: occupations.some((o) => o.soc === u.soc),
  };
}

describe('verdicts.json', () => {
  const scored = universe.filter((u) => u.obs != null);

  it('has exactly one record per scored occupation (784) and none for unscored ones', () => {
    expect(scored).toHaveLength(data.meta.universe.obsScored);
    expect(VERDICTS).toHaveLength(scored.length);
    expect(VERDICTS_META.count).toBe(VERDICTS.length);
    expect(new Set(VERDICTS.map((v) => v.soc))).toEqual(new Set(scored.map((u) => u.soc)));
    expect(new Set(VERDICTS.map((v) => v.slug)).size).toBe(VERDICTS.length);
    const unscored = new Set(universe.filter((u) => u.obs == null).map((u) => u.soc));
    expect(VERDICTS.filter((v) => unscored.has(v.soc))).toEqual([]);
  });

  it('carries exactly the documented fields', () => {
    for (const v of VERDICTS) expect(Object.keys(v)).toEqual(FIELDS);
  });

  it('matches occupations.json value for value (empty diff)', () => {
    const bySoc = new Map(universe.map((u) => [u.soc, u]));
    const diff: string[] = [];
    for (const v of VERDICTS) {
      const want = expectedFrom(bySoc.get(v.soc));
      for (const [k, x] of Object.entries(want)) {
        if ((v as any)[k] !== x) diff.push(`${v.soc}.${k}: ${JSON.stringify((v as any)[k])} != ${JSON.stringify(x)}`);
      }
    }
    expect(diff).toEqual([]);
  });

  it('agrees with every published occupation payload', () => {
    const diff: string[] = [];
    for (const o of occupations) {
      const v = VERDICTS.find((x) => x.soc === o.soc)!;
      const want = {
        obs: o.scores.obs.value,
        exposure: o.scores.exposure.value,
        trajectory: o.scores.trajectory.value,
        projectedChangePct: o.projectedChange.percent.value,
        employment: o.employment.value,
        medianWage: o.medianWage.value,
        blsCategory: o.blsCategory.value,
        topTask: o.tasks[0]?.text ?? null,
        title: o.title,
        slug: o.slug,
      };
      for (const [k, x] of Object.entries(want)) if ((v as any)[k] !== x) diff.push(`${o.soc}.${k}`);
    }
    expect(diff).toEqual([]);
  });

  it('flags hasFullPage exactly for the 152 published occupation pages', () => {
    const published = VERDICTS.filter((v) => v.hasFullPage);
    expect(published).toHaveLength(occupations.length);
    expect(occupations.length).toBe(152);
    expect(VERDICTS_META.published).toBe(152);
    expect(new Set(published.map((v) => v.slug))).toEqual(new Set(occupations.map((o) => o.slug)));
  });

  it('gives every non-null field a sourceId that resolves in sources.json', () => {
    const ids = new Set(sources.sources.map((s: { id: string }) => s.id));
    for (const v of VERDICTS) {
      for (const f of ['title', 'obs', 'band', 'blsCategory', 'exposure', 'trajectory', 'projectedChangePct', 'employment', 'medianWage', 'topTask'] as const) {
        if (v[f] == null) expect(v.sourceIds[f]).toBeUndefined();
        else expect(ids.has(v.sourceIds[f]!), `${v.soc}.${f}`).toBe(true);
      }
    }
    expect(VERDICTS[0].sourceIds).toMatchObject({ obs: 'hoi-composite', projectedChangePct: 'bls-ep', medianWage: 'bls-oews', topTask: 'onet-31' });
  });

  it('is ordered by Doom Score, highest first, and looks up by slug', () => {
    const obs = VERDICTS.map((v) => v.obs);
    expect(obs).toEqual([...obs].sort((a, b) => b - a));
    expect(verdictBySlug('telemarketers')).toMatchObject({ soc: '41-9041', obs: 99, band: 'severe', hasFullPage: true });
  });
});
