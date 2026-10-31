import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OCCUPATIONS, UNIVERSE, leaderboard } from '../src/lib/data';
import { SCORE_BANDS, matchesBandFilter, scoreBand } from '../src/lib/ledger';
import { SITE_TAGLINE } from '../src/lib/site';
import { renderVerdictSvg, buildCards } from '../scripts/lib/verdict-cards.mjs';

const root = join(__dirname, '..');
const src = (rel: string) => readFileSync(join(root, rel), 'utf8');
const bySlug = (slug: string) => OCCUPATIONS.find((o) => o.slug === slug)!;

/** Phrases that equate a high OBS with a shrinking job or falling hiring. */
const OVERCLAIMS = [
  /both exposed and projected to shrink/i,
  /fewer people will be let in/i,
  /expect(s)? this job to shrink/i,
  /whether (the government|BLS) (expects|projects) (it|them) to shrink/i,
  /ranked by AI exposure and (BLS )?projected decline/i,
  /high (OBS|score) means[^.]*(shrink|declin|hiring)/i,
];

describe('leaderboard band filter', () => {
  const page = src('src/pages/leaderboard.astro');
  const row = src('src/components/LedgerRow.astro');

  it('offers All plus every OBS band', () => {
    expect(SCORE_BANDS).toEqual(['severe', 'elevated', 'moderate', 'low']);
    expect(page).toContain('data-band-filter');
    expect(page).toMatch(/SCORE_BANDS/);
  });

  it('keys rows by OBS band, not BLS category', () => {
    expect(row).toMatch(/data-band=\{/);
    expect(page).toMatch(/dataset\.band/);
    expect(page).not.toMatch(/dataset\.category/);
  });

  it('separates band from BLS category on a row where they disagree', () => {
    const screeners = bySlug('transportation-security-screeners');
    expect(screeners.leaderboardRank).not.toBeNull();
    const band = scoreBand(screeners.scores.obs.value!);
    expect(band).toBe('elevated');
    expect(screeners.blsCategory.value).toBe('Moderate');
    expect(matchesBandFilter(band, 'elevated')).toBe(true);
    expect(matchesBandFilter(band, 'moderate')).toBe(false);
    expect(matchesBandFilter(band, 'all')).toBe(true);
  });

  it('puts every board row in exactly one band', () => {
    for (const o of leaderboard()) {
      const band = scoreBand(o.scores.obs.value!);
      expect(SCORE_BANDS.filter((f) => matchesBandFilter(band, f))).toEqual([band]);
    }
  });
});

describe('copy never equates a high OBS with decline or reduced hiring', () => {
  const files = [
    'src/pages/methodology.astro',
    'src/pages/index.astro',
    'src/pages/leaderboard.astro',
    'src/pages/about.astro',
    'src/pages/press.astro',
    'src/pages/occupations/[slug].astro',
    'src/layouts/BaseLayout.astro',
    'src/lib/site.ts',
    'src/lib/press.ts',
    'scripts/lib/verdict-cards.mjs',
  ];

  it.each(files)('%s', (rel) => {
    const text = src(rel).replace(/\s+/g, ' ');
    for (const re of OVERCLAIMS) expect(text).not.toMatch(re);
  });

  it('methodology states that a high score does not mean shrinking or falling hiring', () => {
    const text = src('src/pages/methodology.astro').replace(/\s+/g, ' ');
    expect(text).toMatch(/does not mean the job is shrinking/);
    expect(text).toMatch(/no (occupation-level )?hiring (data|input)/i);
    expect(text).toMatch(/outside evidence/i);
    expect(text).toMatch(/22- to 25-year-olds/);
  });

  it('keeps the tagline and site card neutral', () => {
    expect(SITE_TAGLINE).not.toMatch(/decline/i);
    const data = JSON.parse(src('src/data/occupations.json'));
    const site = buildCards(data).find((c: { slug: string }) => c.slug === 'index');
    expect(renderVerdictSvg(site)).not.toMatch(/projected decline/i);
  });
});

describe('high-OBS occupations can be projected to grow', () => {
  it('interpreters and translators are Severe with positive BLS growth', () => {
    const o = bySlug('interpreters-and-translators');
    expect(scoreBand(o.scores.obs.value!)).toBe('severe');
    expect(o.projectedChange.percent.value!).toBeGreaterThan(0);
  });

  it('many Severe occupations in the universe are projected to grow', () => {
    const growing = UNIVERSE.filter((u) => u.obs != null && u.obs >= 75 && (u.changePercent ?? 0) > 0);
    expect(growing.length).toBeGreaterThanOrEqual(10);
  });

  it('occupation pages explain growth for high-band occupations', () => {
    const page = src('src/pages/occupations/[slug].astro');
    expect(page).toContain('data-growth-note');
  });
});
