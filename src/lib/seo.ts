import { OCCUPATIONS, occupationPath, type Occupation } from './data';
import { formatSignedPercent } from './format';

export const DEFAULT_OG_IMAGE = '/og/index.png';
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const STATIC_PATHS = ['/', '/leaderboard/', '/methodology/', '/press/', '/changelog/', '/about/', '/embed/'];

export function ogImagePath(slug: string): string {
  return `/og/${slug}.png`;
}

export function occupationDescription(o: Occupation): string {
  return `${o.title}: OBS ${o.scores.obs.value ?? 'n/a'}/100, BLS AI exposure category ${o.blsCategory.value ?? 'not rated'}, BLS projected employment change 2025–35 ${formatSignedPercent(o.projectedChange.percent.value)}. Score breakdown, tasks and adjacent roles with sources.`;
}

export function occupationImageAlt(o: Occupation): string {
  return `Verdict card: ${o.title}, OBS score ${o.scores.obs.value ?? 'n/a'} out of 100, BLS category ${o.blsCategory.value ?? 'not rated'}`;
}

/** Every page in the built site, as root-relative paths with trailing slashes. */
export function sitePaths(): string[] {
  return [...STATIC_PATHS, ...OCCUPATIONS.map((o) => occupationPath(o.slug))];
}

export function sitemapXml(site: URL, lastmod?: string): string {
  const mod = lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
  const urls = sitePaths()
    .map((p) => `  <url><loc>${new URL(p, site).href}</loc>${mod}</url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(site: URL): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`;
}
