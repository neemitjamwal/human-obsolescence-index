import { describe, expect, it } from 'vitest';
import { OCCUPATIONS, occupationPath } from '../src/lib/data';
import { VERDICTS, verdictPath } from '../src/lib/verdicts';
import { CURATED_BATTLES } from '../src/lib/battle-data';
import { STATIC_PATHS, occupationDescription, ogImagePath, robotsTxt, sitePaths, sitemapXml } from '../src/lib/seo';

const site = new URL('https://humanobsolescenceindex.com');

describe('share meta', () => {
  it('points every occupation at its verdict card', () => {
    expect(ogImagePath('telemarketers')).toBe('/og/telemarketers.png');
  });

  it('writes descriptions that name the occupation, its OBS and the BLS label', () => {
    for (const o of OCCUPATIONS) {
      const d = occupationDescription(o);
      expect(d.startsWith(o.title)).toBe(true);
      expect(d).toContain(`OBS ${o.scores.obs.value}/100`);
      expect(d).toContain(`BLS AI exposure category ${o.blsCategory.value ?? 'not rated'}`);
    }
  });
});

describe('sitemap and robots', () => {
  it('lists every page exactly once', () => {
    const paths = sitePaths();
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toHaveLength(STATIC_PATHS.length + OCCUPATIONS.length + VERDICTS.length + CURATED_BATTLES.length);
    for (const p of ['/', '/leaderboard/', '/vs/', '/methodology/', '/press/', '/changelog/', '/about/']) expect(paths).toContain(p);
    for (const b of CURATED_BATTLES) expect(paths).toContain(b.path);
    for (const o of OCCUPATIONS) expect(paths).toContain(occupationPath(o.slug));
    for (const v of VERDICTS) expect(paths).toContain(verdictPath(v.slug));
  });

  it('renders absolute production URLs in the sitemap', () => {
    const xml = sitemapXml(site, '2026-10-31');
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(xml).toContain('<loc>https://humanobsolescenceindex.com/occupations/telemarketers/</loc><lastmod>2026-10-31</lastmod>');
    expect(xml.match(/<loc>/g)).toHaveLength(sitePaths().length);
    expect(xml).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it('allows all crawlers and references the sitemap', () => {
    const txt = robotsTxt(site);
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Sitemap: https://humanobsolescenceindex.com/sitemap.xml');
  });
});
