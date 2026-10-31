import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'src/styles/global.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const token = (name: string): string => {
  const m = new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(css);
  if (!m) throw new Error(`missing --color-${name}`);
  return m[1];
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** Color tokens assigned by a rule whose selector list contains `selector`. */
const colorsFor = (selector: string): string[] =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, sel]) => sel.split(',').map((s) => s.trim()).includes(selector))
    .flatMap(([, , body]) => [...body.matchAll(/(?:^|;|\s)color:\s*var\(--color-([a-z]+)\)/g)].map((m) => m[1]));

describe('leaderboard highlighted-row contrast', () => {
  const yellow = token('yellow');
  const firstRow = ".ledger-list > li:first-child > .ledger-row[data-rank='1']";

  it('keeps red and blue on yellow known-failing for small text, so the override is needed', () => {
    expect(contrast(token('red'), yellow)).toBeLessThan(4.5);
    expect(contrast(token('blue'), yellow)).toBeLessThan(4.5);
  });

  it('highlights the first ranked row and hovered rows in yellow', () => {
    expect(css).toMatch(/\.ledger-list > li:first-child > \.ledger-row\[data-rank='1'\]\s*\{\s*background:\s*var\(--color-yellow\)/);
    expect(css).toMatch(/a\.ledger-row:hover\s*\{\s*background:\s*var\(--color-yellow\)/);
  });

  it.each([`${firstRow} .ledger-delta`, 'a.ledger-row:hover .ledger-delta'])(
    'gives BLS delta text on yellow (%s) at least 4.5:1',
    (selector) => {
      const colors = colorsFor(selector);
      expect(colors.length).toBeGreaterThan(0);
      for (const c of colors) expect(contrast(token(c), yellow)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('declares the yellow-row override after the red/blue tone rules so it wins the cascade', () => {
    const override = css.indexOf(`${firstRow} .ledger-delta`);
    expect(override).toBeGreaterThan(css.indexOf('.change-decline {'));
    expect(override).toBeGreaterThan(css.indexOf('.change-growth {'));
  });
});
