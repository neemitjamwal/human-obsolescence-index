import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '..');
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(root, 'src/data/sources.json'), 'utf8'));

type U = {
  soc: string; slug: string; title: string; blsCategory: string | null; msft: number | null; eld: number | null;
  changePercent: number | null; oesEmployment: number | null; pMsft: number | null; pEld: number | null;
  pTrajectory: number | null; exposure: number | null; trajectory: number | null; obs: number | null; missing: string[];
};
const universe: U[] = data.universe;
const occupations: any[] = data.occupations;
const SOC = /^\d{2}-\d{4}$/;

// Independent re-implementation of the published formula (deliberately not imported from scripts/lib).
function pct(values: (number | null)[]): (number | null)[] {
  const idx = values.map((v, i) => [v, i] as const).filter(([v]) => v != null) as [number, number][];
  const out: (number | null)[] = values.map(() => null);
  for (const [v, i] of idx) {
    const below = idx.filter(([w]) => w < v).length;
    const equal = idx.filter(([w]) => w === v).length;
    out[i] = idx.length === 1 ? 0.5 : (below + (equal - 1) / 2) / (idx.length - 1);
  }
  return out;
}

describe('emitted occupations.json matches an independent recomputation', () => {
  const pM = pct(universe.map((u) => u.msft));
  const pE = pct(universe.map((u) => u.eld));
  const pT = pct(universe.map((u) => (u.changePercent == null ? null : -u.changePercent)));
  const expected = universe.map((_, i) => {
    const e =
      pM[i] != null && pE[i] != null ? 100 * (0.5 * pM[i]! + 0.5 * pE[i]!) : pM[i] != null ? 100 * pM[i]! : pE[i] != null ? 100 * pE[i]! : null;
    const t = pT[i] == null ? null : 100 * pT[i]!;
    return { e, t, obs: e == null || t == null ? null : Math.round(0.65 * e + 0.35 * t) };
  });

  it('recomputes Exposure, Trajectory and OBS for all 831 universe rows', () => {
    universe.forEach((u, i) => {
      const x = expected[i];
      if (x.e == null) expect(u.exposure).toBeNull();
      else expect(Math.abs(u.exposure! - x.e)).toBeLessThanOrEqual(0.005 + 1e-9);
      if (x.t == null) expect(u.trajectory).toBeNull();
      else expect(Math.abs(u.trajectory! - x.t)).toBeLessThanOrEqual(0.005 + 1e-9);
      expect(u.obs).toBe(x.obs);
    });
  });

  it('per-occupation payloads carry the same scores as the universe table', () => {
    const bySoc = new Map(universe.map((u) => [u.soc, u]));
    for (const o of occupations) {
      const u = bySoc.get(o.soc)!;
      expect(o.scores.obs.value).toBe(u.obs);
      expect(o.scores.exposure.value).toBe(u.exposure);
      expect(o.scores.trajectory.value).toBe(u.trajectory);
      expect(o.components.microsoft.raw).toBe(u.msft);
      expect(o.components.employmentChange.raw).toBe(u.changePercent);
    }
  });

  it('spot-checks published examples', () => {
    const tele = occupations.find((o) => o.soc === '41-9041');
    expect(tele.title).toBe('Telemarketers');
    expect(tele.scores.obs.value).toBe(99);
    expect(tele.blsCategory.value).toBe('Very high');
  });
});

describe('universe rules', () => {
  it('is the 831 EP Line-item occupations, keyed by unique SOC codes', () => {
    expect(data.meta.universe.size).toBe(831);
    expect(universe).toHaveLength(831);
    expect(new Set(universe.map((u) => u.soc)).size).toBe(831);
    expect(new Set(universe.map((u) => u.slug)).size).toBe(831);
    for (const u of universe) expect(u.soc).toMatch(SOC);
    for (const u of universe) expect(u.title).toBe(u.title.trim());
  });

  it('every universe row has its BLS category and 830 of 831 have OEWS employment', () => {
    for (const u of universe) expect(['Very high', 'High', 'Moderate', 'Low']).toContain(u.blsCategory);
    expect(universe.filter((u) => u.oesEmployment != null)).toHaveLength(data.meta.universe.oesCovered);
    expect(data.meta.universe.oesCovered).toBeGreaterThanOrEqual(830);
  });

  it('leaderboard is the top 120 by OBS among OEWS employment >= 50,000', () => {
    const eligible = universe
      .filter((u) => u.obs != null && (u.oesEmployment ?? 0) >= 50000)
      .sort((a, b) => b.obs! - a.obs! || (b.exposure ?? -1) - (a.exposure ?? -1) || a.soc.localeCompare(b.soc));
    const board = occupations.filter((o) => o.leaderboardRank != null).sort((a, b) => a.leaderboardRank - b.leaderboardRank);
    expect(board).toHaveLength(120);
    expect(board.map((o) => o.soc)).toEqual(eligible.slice(0, 120).map((u) => u.soc));
    for (const o of board) {
      expect(o.oesEmployment.value).toBeGreaterThanOrEqual(50000);
      expect(o.inclusion).toContain('leaderboard');
    }
  });

  it('force-includes every BLS fastest-declining occupation', () => {
    const declining: string[] = data.meta.forcedInclusions.fastestDeclining.socs;
    expect(declining.length).toBeGreaterThanOrEqual(30);
    for (const soc of declining) {
      const o = occupations.find((x) => x.soc === soc);
      expect(o, soc).toBeDefined();
      expect(o.inclusion).toContain('fastest-declining');
      expect(o.projectedChange.percent.value).toBeLessThan(0);
    }
  });

  it('includes at least 3 low-OBS contrast occupations (nurses, electricians, police)', () => {
    const contrast = occupations.filter((o) => o.inclusion.includes('contrast'));
    expect(contrast.length).toBeGreaterThanOrEqual(3);
    for (const soc of ['29-1141', '47-2111', '33-3051']) expect(contrast.map((o) => o.soc)).toContain(soc);
    for (const o of contrast) expect(o.scores.obs.value).toBeLessThan(data.meta.leaderboard.cutoffObs);
  });

  it('publishes every museum-linked occupation as a tracked page without ranking it', () => {
    const socs: string[] = data.meta.forcedInclusions.museumPrecedent.socs;
    expect(socs).toEqual(expect.arrayContaining(['27-2011', '23-2011', '27-1013']));
    for (const soc of socs) {
      const o = occupations.find((x) => x.soc === soc);
      expect(o, soc).toBeDefined();
      expect(o.inclusion).toContain('museum-precedent');
      expect(o.scores.obs.value).not.toBeNull();
      if (!o.inclusion.includes('leaderboard')) expect(o.leaderboardRank).toBeNull();
    }
    for (const soc of ['27-2011', '23-2011', '27-1013']) {
      const o = occupations.find((x) => x.soc === soc);
      expect(o.inclusion).toEqual(['museum-precedent']);
      expect(o.leaderboardRank).toBeNull();
    }
    expect(occupations.filter((o) => o.leaderboardRank != null)).toHaveLength(120);
  });

  it('ranks emitted occupations by OBS descending with unique slugs', () => {
    const obs = occupations.map((o) => o.scores.obs.value);
    expect(obs).toEqual([...obs].sort((a, b) => b - a));
    expect(occupations.map((o) => o.rank)).toEqual(occupations.map((_, i) => i + 1));
    expect(new Set(occupations.map((o) => o.slug)).size).toBe(occupations.length);
  });
});

describe('coverage disclosure', () => {
  it('flags every universe row that lacks a Microsoft or Eloundou component', () => {
    for (const u of universe) {
      if (u.msft == null) expect(u.missing).toContain('microsoft');
      if (u.eld == null) expect(u.missing).toContain('eloundou');
      if (u.msft != null) expect(u.missing).not.toContain('microsoft');
    }
    const noMsft = universe.filter((u) => u.msft == null);
    expect(noMsft).toHaveLength(831 - data.meta.universe.microsoftCovered);
    expect(noMsft.length).toBeGreaterThanOrEqual(46);
  });

  it('per-occupation coverage notes explain every missing field', () => {
    for (const o of occupations) {
      const missing: string[] = o.coverage.missing;
      if (o.components.microsoft.raw == null) expect(missing).toContain('microsoft');
      if (o.components.eloundou.raw == null) expect(missing).toContain('eloundou');
      if (o.tasks.length < 3) expect(missing).toContain('tasks');
      if (o.adjacentRoles.length < 2) expect(missing).toContain('adjacentRoles');
      expect(o.coverage.complete).toBe(missing.length === 0);
      expect(o.coverage.notes.map((n: { field: string }) => n.field)).toEqual(missing);
      for (const n of o.coverage.notes) expect(n.message.length).toBeGreaterThan(20);
    }
  });

  it('tasks are 3-6 O*NET statements and adjacent roles are 2-4 growing occupations', () => {
    const bySoc = new Map(universe.map((u) => [u.soc, u]));
    for (const o of occupations) {
      if (!o.coverage.missing.includes('tasks')) expect(o.tasks.length).toBeGreaterThanOrEqual(3);
      expect(o.tasks.length).toBeLessThanOrEqual(6);
      for (const t of o.tasks) expect(t.sourceId).toBe('onet-31');
      expect(o.adjacentRoles.length).toBeLessThanOrEqual(4);
      for (const a of o.adjacentRoles) {
        expect(a.soc).not.toBe(o.soc);
        expect(a.projectedChangePercent.value).toBeGreaterThan(0);
        expect(bySoc.get(a.soc)!.changePercent).toBe(a.projectedChangePercent.value);
        expect(bySoc.get(a.soc)!.title).toBe(a.title);
      }
    }
  });
});

describe('sources manifest', () => {
  const sources: any[] = manifest.sources;
  const ids = new Set(sources.map((s) => s.id));

  it('lists the 7 downloaded inputs with url, retrieval date, SHA-256, license and citation', () => {
    const downloaded = sources.filter((s) => s.id !== 'hoi-composite');
    expect(downloaded.map((s) => s.id).sort()).toEqual(
      ['bls-ai-exposure', 'bls-crosswalk', 'bls-ep', 'bls-oews', 'msft-ai-applicability', 'onet-31', 'openai-gpts-are-gpts'],
    );
    for (const s of downloaded) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(Number.isNaN(Date.parse(s.retrievedAt))).toBe(false);
      expect(s.license.length).toBeGreaterThan(2);
      expect(s.citation.length).toBeGreaterThan(30);
      expect(s.name.length).toBeGreaterThan(5);
    }
    expect(sources.find((s) => s.id === 'onet-31').citation).toContain('O*NET 31.0 Database');
  });

  it('resolves every sourceId used anywhere in occupations.json', () => {
    const used = new Set<string>();
    const walk = (v: unknown, key = ''): void => {
      if (Array.isArray(v)) {
        if (key === 'inputs' || key === 'derivedFrom') v.forEach((x) => typeof x === 'string' && x.includes('-') && used.add(x));
        v.forEach((x) => walk(x));
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) {
          if (/sourceId$/i.test(k) && typeof x === 'string') used.add(x);
          walk(x, k);
        }
      }
    };
    walk(data.occupations);
    walk(data.meta);
    for (const id of Object.values(data.meta.universeFieldSources)) used.add(id as string);
    expect(used.size).toBeGreaterThanOrEqual(8);
    for (const id of used) expect(ids.has(id), id).toBe(true);
  });

  it('gives every numeric field in an occupation payload a sourceId', () => {
    for (const o of occupations) {
      for (const f of [o.blsCategory, o.employment, o.oesEmployment, o.projectedChange.numeric, o.projectedChange.percent, o.openings, o.medianWage]) {
        expect(f.sourceId).toBeTruthy();
      }
      for (const c of Object.values(o.components) as { sourceId: string }[]) expect(c.sourceId).toBeTruthy();
      for (const s of Object.values(o.scores) as { sourceId: string }[]) expect(s.sourceId).toBe('hoi-composite');
    }
  });
});
