import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { aggregateBeta, computeScores, percentileRanks } from '../scripts/lib/score.mjs';

type FixtureRow = { soc: string; msft: number | null; eldBetas: number[]; changePercent: number | null };
type Expected = {
  eld: number | null; pMsft: number | null; pEld: number | null; pTrajectory: number | null;
  exposure: number | null; trajectory: number | null; obs: number | null; missing: string[];
};
const fixture: { rows: FixtureRow[]; expected: Record<string, Expected> } = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'score-fixture.json'), 'utf8'),
);

describe('OBS score fixture (hand-computed)', () => {
  const rows = fixture.rows.map((r) => ({ msft: r.msft, eld: aggregateBeta(r.eldBetas), changePercent: r.changePercent }));
  const scores = computeScores(rows);

  fixture.rows.forEach((row, i) => {
    it(`recomputes ${row.soc}`, () => {
      const want = fixture.expected[row.soc];
      const got = scores[i];
      const close = (a: number | null, b: number | null) => (b == null ? expect(a).toBeNull() : expect(a).toBeCloseTo(b, 9));
      close(rows[i].eld, want.eld);
      close(got.pMsft, want.pMsft);
      close(got.pEld, want.pEld);
      close(got.pTrajectory, want.pTrajectory);
      close(got.exposure, want.exposure);
      close(got.trajectory, want.trajectory);
      expect(got.obs).toBe(want.obs);
      expect(got.missing).toEqual(want.missing);
    });
  });

  it('is deterministic across runs and input order', () => {
    const again = computeScores(rows);
    expect(again).toEqual(scores);
    const reversed = computeScores([...rows].reverse()).reverse();
    expect(reversed.map((s: { obs: number | null }) => s.obs)).toEqual(scores.map((s: { obs: number | null }) => s.obs));
  });
});

describe('percentile ranks', () => {
  it('spans 0..1, averages ties and skips nulls', () => {
    expect(percentileRanks([3, null, 1, 2])).toEqual([1, null, 0, 0.5]);
    expect(percentileRanks([5, 5, 1])).toEqual([0.75, 0.75, 0]);
    expect(percentileRanks([7])).toEqual([0.5]);
  });

  it('gives no Exposure when both components are missing and no OBS without Trajectory', () => {
    const [s] = computeScores([{ msft: null, eld: null, changePercent: 3 }]);
    expect(s.exposure).toBeNull();
    expect(s.obs).toBeNull();
    expect(s.missing).toEqual(['microsoft', 'eloundou']);
  });

  it('collapses many O*NET rows to one SOC by unweighted mean', () => {
    expect(aggregateBeta([0.2, 0.4, null])).toBeCloseTo(0.3, 12);
    expect(aggregateBeta([])).toBeNull();
  });
});
