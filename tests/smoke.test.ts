import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV_ITEMS, SITE_NAME, isActive } from '../src/lib/site';
import { categoryClass, clampScore, deltaDirection, deltaGlyph, formatDelta, scoreBand } from '../src/lib/ledger';

const root = join(__dirname, '..');

describe('site shell', () => {
  it('names the index and exposes the seven nav entries in order', () => {
    expect(SITE_NAME).toBe('Human Obsolescence Index');
    expect(NAV_ITEMS.map((i) => i.label)).toEqual(['Front page', 'Leaderboard', "Who's safer?", 'Office lineup', 'Methodology', 'Press', 'About']);
    for (const item of NAV_ITEMS) expect(item.href.startsWith('/')).toBe(true);
  });

  it('marks the active nav item by path', () => {
    const [front, board, battle, lineup, methodology] = NAV_ITEMS;
    expect(isActive(lineup, '/office-lineup/')).toBe(true);
    expect(isActive(lineup, '/vs/')).toBe(false);
    expect(isActive(battle, '/vs/')).toBe(true);
    expect(isActive(battle, '/vs/lawyers-vs-electricians/')).toBe(true);
    expect(isActive(battle, '/')).toBe(false);
    expect(isActive(front, '/')).toBe(true);
    expect(isActive(front, '/leaderboard/')).toBe(false);
    expect(isActive(board, '/')).toBe(false);
    expect(isActive(board, '/leaderboard/')).toBe(true);
    expect(isActive(board, '/occupations/telemarketers/')).toBe(true);
    expect(isActive(board, '/methodology/')).toBe(false);
    expect(isActive(methodology, '/methodology')).toBe(true);
    expect(isActive(methodology, '/')).toBe(false);
  });

  it('ships a page for every nav target', () => {
    const pages: Record<string, string> = {
      '/': 'src/pages/index.astro',
      '/leaderboard/': 'src/pages/leaderboard.astro',
      '/vs/': 'src/pages/vs/index.astro',
      '/office-lineup/': 'src/pages/office-lineup.astro',
      '/methodology/': 'src/pages/methodology.astro',
      '/press/': 'src/pages/press.astro',
      '/about/': 'src/pages/about.astro',
    };
    for (const item of NAV_ITEMS) expect(existsSync(join(root, pages[item.href]))).toBe(true);
  });
});

describe('ledger helpers', () => {
  it('clamps and bands OBS scores', () => {
    expect(clampScore(140)).toBe(100);
    expect(clampScore(-3)).toBe(0);
    expect(clampScore(Number.NaN)).toBe(0);
    expect([scoreBand(90), scoreBand(75), scoreBand(74), scoreBand(50), scoreBand(25), scoreBand(24)]).toEqual([
      'severe', 'severe', 'elevated', 'elevated', 'moderate', 'low',
    ]);
  });

  it('treats a positive delta as more obsolete', () => {
    expect(deltaDirection(3)).toBe('up');
    expect(deltaDirection(-1)).toBe('down');
    expect(deltaDirection(0)).toBe('flat');
    expect(deltaDirection(null)).toBe('flat');
    expect(deltaGlyph('up')).toBe('▲');
    expect(formatDelta(4)).toBe('+4');
    expect(formatDelta(-2)).toBe('−2');
    expect(formatDelta(null)).toBe('n/a');
  });

  it('maps BLS categories to chip classes', () => {
    expect(categoryClass('Very high')).toBe('category-very-high');
    expect(categoryClass('Low')).toBe('category-low');
    expect(categoryClass(null)).toBe('category-none');
  });
});

describe('design system', () => {
  const css = readFileSync(join(root, 'src/styles/global.css'), 'utf8');

  it('declares the Daily Doom palette and none of the v1 Exchange hexes', () => {
    for (const hex of ['#0b0b0b', '#fffbea', '#ffe500', '#e4002b', '#1f5bff']) {
      expect(css.toLowerCase()).toContain(hex);
    }
    for (const v1 of ['#0d1117', '#161b22', '#21262d', '#2ea043', '#f85149', '#f0b429', '#e6edf3']) {
      expect(css.toLowerCase()).not.toContain(v1);
    }
  });

  it('loads exactly Anton, Archivo and Permanent Marker from Google Fonts with display=swap', () => {
    const layout = readFileSync(join(root, 'src/layouts/BaseLayout.astro'), 'utf8');
    expect(layout).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    const href = /href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/.exec(layout)![1];
    const families = [...href.matchAll(/family=([^:&]+)/g)].map((m) => m[1]);
    expect(families).toEqual(['Anton', 'Archivo', 'Permanent+Marker']);
    expect(href).toContain('display=swap');
    expect(layout).not.toMatch(/JetBrains|IBM\+Plex|Atkinson/);
    expect(css).toMatch(/--font-display:\s*"Anton"/);
    expect(css).toMatch(/--font-body:\s*"Archivo"/);
    expect(css).toMatch(/--font-marker:\s*"Permanent Marker"/);
  });

  it('animates only without reduced motion, and uses no @apply', () => {
    expect(css).toContain('prefers-reduced-motion: no-preference');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*\*,[\s\S]*?animation: none !important/);
    expect(css).not.toMatch(/@apply/);
    expect(css).not.toContain('.scanlines');
  });

  it('uses Tailwind v4 without legacy config files or frameworks', () => {
    for (const f of ['tailwind.config.js', 'tailwind.config.mjs', 'tailwind.config.ts', 'postcss.config.js', 'postcss.config.mjs']) {
      expect(existsSync(join(root, f))).toBe(false);
    }
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const banned of ['react', 'vue', 'svelte', '@astrojs/tailwind', 'xlsx']) {
      expect(deps[banned]).toBeUndefined();
    }
    for (const required of ['astro', 'tailwindcss', '@tailwindcss/vite', 'vitest', 'sharp', 'exceljs', 'typescript']) {
      expect(deps[required]).toBeDefined();
    }
  });
});
