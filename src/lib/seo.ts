import { OCCUPATIONS, occupationPath, type Occupation } from './data';
import { formatSignedPercent } from './format';
import { CURATED_BATTLES } from './battle-data';
import { VERDICTS, verdictPath, type Verdict } from './verdicts';

export const DEFAULT_OG_IMAGE = '/og/index.png';
export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const STATIC_PATHS = ['/', '/leaderboard/', '/vs/', '/office-lineup/', '/methodology/', '/press/', '/changelog/', '/about/', '/embed/'];

export function ogImagePath(slug: string): string {
  return `/og/${slug}.png`;
}

export function occupationDescription(o: Occupation): string {
  return `${o.title}: OBS ${o.scores.obs.value ?? 'n/a'}/100, BLS AI exposure category ${o.blsCategory.value ?? 'not rated'}, BLS projected employment change 2025–35 ${formatSignedPercent(o.projectedChange.percent.value)}. Score breakdown, tasks and adjacent roles with sources.`;
}

export function occupationImageAlt(o: Occupation): string {
  return `Verdict card: ${o.title}, OBS score ${o.scores.obs.value ?? 'n/a'} out of 100, BLS category ${o.blsCategory.value ?? 'not rated'}`;
}

/** 1200x630 card for a /v/<slug>/ verdict page (scripts/og-cards.mjs). */
export function verdictOgPath(slug: string): string {
  return `/og/v/${slug}.png`;
}

export function verdictDescription(v: Verdict): string {
  return `${v.title}: Doom Score ${v.obs}/100 (${v.band}). BLS AI exposure category ${v.blsCategory ?? 'not rated'}, BLS projected employment change 2025–35 ${formatSignedPercent(v.projectedChangePct)}. AI exposure is not job loss; every number has its source.`;
}

export function verdictImageAlt(v: Verdict): string {
  return `Daily Doom verdict card: ${v.title}, Doom Score ${v.obs} out of 100, a cartoon robot with red eyes`;
}

/** Every page in the built site, as root-relative paths with trailing slashes. */
export function sitePaths(): string[] {
  return [
    ...STATIC_PATHS,
    ...OCCUPATIONS.map((o) => occupationPath(o.slug)),
    ...VERDICTS.map((v) => verdictPath(v.slug)),
    ...CURATED_BATTLES.map((b) => b.path),
  ];
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
