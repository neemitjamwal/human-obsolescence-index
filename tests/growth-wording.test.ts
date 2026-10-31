import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OCCUPATIONS } from '../src/lib/data';
import { relativeGrowth, scoreBand } from '../src/lib/ledger';

const root = join(__dirname, '..');
const src = (rel: string) => readFileSync(join(root, rel), 'utf8').replace(/\s+/g, ' ');
const bySlug = (slug: string) => OCCUPATIONS.find((o) => o.slug === slug)!;

/** Claims that a high OBS by itself implies weak or below-most projected growth. */
const GROWTH_OVERCLAIMS = [
  /trails most other occupations/i,
  /near the bottom on projected growth/i,
  /not outgrowing the field/i,
  /high (OBS|score)[^.]*(means|implies|guarantees)[^.]*(weak|slow|low|bottom)[^.]*growth/i,
];

describe('weighted-blend growth wording', () => {
  it('relativeGrowth splits at the Trajectory median', () => {
    expect(relativeGrowth(0.24)).toBe('stronger');
    expect(relativeGrowth(49.99)).toBe('stronger');
    expect(relativeGrowth(50)).toBe('weaker');
    expect(relativeGrowth(58.8)).toBe('weaker');
  });

  it('data scientists are high-band with above-median growth (exposure drives the score)', () => {
    const o = bySlug('data-scientists');
    expect(scoreBand(o.scores.obs.value!)).toBe('elevated');
    expect(o.projectedChange.percent.value!).toBeGreaterThan(0);
    expect(relativeGrowth(o.scores.trajectory.value!)).toBe('stronger');
  });

  it('interpreters are high-band with positive but below-median growth', () => {
    const o = bySlug('interpreters-and-translators');
    expect(scoreBand(o.scores.obs.value!)).toBe('severe');
    expect(o.projectedChange.percent.value!).toBeGreaterThan(0);
    expect(relativeGrowth(o.scores.trajectory.value!)).toBe('weaker');
  });

  it('both wording branches occur among growing high-band occupations', () => {
    const growingHigh = OCCUPATIONS.filter(
      (o) => (o.scores.obs.value ?? 0) >= 50 && (o.projectedChange.percent.value ?? 0) > 0,
    );
    const kinds = new Set(growingHigh.map((o) => relativeGrowth(o.scores.trajectory.value!)));
    expect(kinds).toEqual(new Set(['stronger', 'weaker']));
  });

  it('occupation page conditions the growth note on Trajectory and renders the components', () => {
    const page = src('src/pages/occupations/[slug].astro');
    expect(page).toMatch(/relativeGrowth\(/);
    expect(page).toContain('stronger projected growth than most other occupations');
    expect(page).toContain('positive but weaker than most other occupations');
    expect(page).toMatch(/data-growth-note=\{/);
  });

  it.each(['src/pages/occupations/[slug].astro', 'src/pages/methodology.astro'])(
    '%s never claims a high OBS implies weak growth',
    (rel) => {
      const text = src(rel);
      for (const re of GROWTH_OVERCLAIMS) expect(text).not.toMatch(re);
    },
  );

  it('methodology explains the weighted blend with a data-driven exposure-led example', () => {
    const text = src('src/pages/methodology.astro');
    expect(text).toMatch(/weighted blend/i);
    expect(text).toMatch(/either (part|component) can drive/i);
    expect(text).toMatch(/slug === 'data-scientists'/);
    expect(text).toContain('data-exposure-led-example');
  });
});
