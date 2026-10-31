import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import data from '../src/data/occupations.json';
import { OCCUPATIONS } from '../src/lib/data';
import { buildCards, renderVerdictSvg } from '../scripts/lib/verdict-cards.mjs';

// The headline number is the Doom Score (OBS composite). It must never be labelled "exposure"/"exposed";
// only the separate `exposure` field may carry that word (library/design-direction.md, "CORRECTION: score labels").
const root = join(__dirname, '..');
const dist = join(root, 'dist');

/** Wordings that pass a composite score or rank off as an exposure figure. */
const MISLABELS = [
  /\b\d{1,3}\s*(\/|out of)\s*100\s*(AI[- ])?expos/i,
  /\b\d{1,3}\s*%\s*(AI[- ])?exposed\b/i,
  /#\s*\d+\s+(most\s+)?(AI[- ])?exposed\b/i,
  /\b\d+\s+most\s+(AI[- ])?exposed\b/i,
  /\bexposure\s*[·:]?\s*\d{1,3}\b(?![.,\d]|\s*(of|out of)\s*100)/i,
  /\bexposed\s*\d{1,3}\b/i,
];

/** The same mistakes written into template source, before numbers are interpolated. */
const SOURCE_MISLABELS = [/\/\s*100\s+exposed/i, /%\s*exposed/i, /#\{[^}]*\}\s*most (AI[- ])?exposed/i, /most (AI[- ])?exposed (of|jobs|on the)/i, /exposure\s*·\s*\{/i, /exposed\s*\{/i];

const SOURCE_FILES = [
  'src/pages/index.astro',
  'src/pages/leaderboard.astro',
  'src/pages/occupations/[slug].astro',
  'src/pages/methodology.astro',
  'src/pages/press.astro',
  'src/pages/changelog.astro',
  'src/pages/about.astro',
  'src/pages/embed.astro',
  'src/components/LedgerRow.astro',
  'src/components/ScoreBar.astro',
  'src/components/SiteHeader.astro',
  'src/components/TickerStrip.astro',
  'src/lib/press.ts',
  'src/lib/seo.ts',
  'src/lib/site.ts',
  'scripts/lib/verdict-cards.mjs',
];

const plain = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/** True when the OBS value appears directly labelled as exposure, unless it genuinely equals the exposure field. */
function pairsObsWithExposure(text: string, obs: number, exposure: number | null): boolean {
  if (exposure != null && Math.round(exposure * 100) / 100 === obs) return false;
  const after = new RegExp(`(?<![\\d.])${obs}(?![\\d.])\\s*(/\\s*100|out of 100)?\\s*(AI[- ])?expos`, 'i');
  const before = new RegExp(`expos(ure|ed)\\s*(score\\s*)?(of\\s*)?[·:=]?\\s*${obs}(?![\\d.])`, 'i');
  return after.test(text) || before.test(text);
}

function walkHtml(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walkHtml(full) : full.endsWith('.html') ? [full] : [];
  });
}

describe('Doom Score labels in source', () => {
  it.each(SOURCE_FILES)('%s never calls the composite score "exposure"', (rel) => {
    const text = readFileSync(join(root, rel), 'utf8').replace(/\s+/g, ' ');
    for (const re of SOURCE_MISLABELS) expect(text, `${rel} ${re}`).not.toMatch(re);
  });

  it('labels the composite as the Doom Score on the main surfaces', () => {
    for (const rel of ['src/pages/index.astro', 'src/pages/leaderboard.astro', 'src/pages/occupations/[slug].astro']) {
      expect(readFileSync(join(root, rel), 'utf8')).toContain('Doom Score');
    }
  });

  it('detects the mockup mistakes it is meant to catch', () => {
    for (const bad of ['97/100 exposed', '#1 most exposed of 120', 'Index · exposure 97', '99% exposed']) {
      expect(MISLABELS.some((re) => re.test(bad)), bad).toBe(true);
    }
    for (const ok of ['Doom Score 97/100', '#1 most doomed of 120', 'AI exposure (percentile) 96.42', 'AI exposure ≠ job loss']) {
      expect(MISLABELS.some((re) => re.test(ok)), ok).toBe(false);
    }
    expect(pairsObsWithExposure('Doom Score 97 out of 100', 97, 95.1)).toBe(false);
    expect(pairsObsWithExposure('97 out of 100 exposed', 97, 95.1)).toBe(true);
    expect(pairsObsWithExposure('Exposure 97', 97, 95.1)).toBe(true);
    expect(pairsObsWithExposure('OBS 97 = 0.65 × Exposure 95.1', 97, 95.1)).toBe(false);
  });
});

describe('Doom Score labels on OG verdict cards', () => {
  const cards = buildCards(data as never);
  it.each(cards.map((c: { slug: string }) => [c.slug, c] as const))('%s', (_slug, card) => {
    const svg = renderVerdictSvg(card);
    const text = plain(svg);
    expect(svg).toContain('DOOM SCORE');
    for (const re of MISLABELS) expect(text).not.toMatch(re);
    const o = OCCUPATIONS.find((x) => x.slug === (card as { slug: string }).slug);
    if (o) expect(pairsObsWithExposure(text, o.scores.obs.value!, o.scores.exposure.value)).toBe(false);
  });
});

describe.skipIf(!existsSync(join(dist, 'index.html')))('Doom Score labels in the built site', () => {
  it('no rendered page pairs a score with "exposure"/"exposed"', () => {
    const bad: string[] = [];
    for (const file of walkHtml(dist)) {
      const text = plain(readFileSync(file, 'utf8'));
      for (const re of MISLABELS) if (re.test(text)) bad.push(`${file.slice(dist.length + 1)} ${re} "${re.exec(text)![0]}"`);
    }
    expect(bad).toEqual([]);
  });

  it('no occupation page labels its own OBS value as exposure', () => {
    const bad: string[] = [];
    for (const o of OCCUPATIONS) {
      const file = join(dist, 'occupations', o.slug, 'index.html');
      if (!existsSync(file)) continue;
      if (pairsObsWithExposure(plain(readFileSync(file, 'utf8')), o.scores.obs.value!, o.scores.exposure.value)) bad.push(o.slug);
    }
    expect(bad).toEqual([]);
  });
});
