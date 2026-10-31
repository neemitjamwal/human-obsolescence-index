import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import data from '../src/data/occupations.json';
import { OCCUPATIONS } from '../src/lib/data';
import { scoreBand } from '../src/lib/ledger';
import { BANDS, OG_HEIGHT, OG_WIDTH, bandFor, buildCards, escapeXml, fitTitle, renderVerdictSvg, wrapText } from '../scripts/lib/verdict-cards.mjs';

const cards = buildCards(data as never);
const card = (slug: string) => cards.find((c: { slug: string }) => c.slug === slug)!;

describe('OG verdict cards', () => {
  it('builds one card per occupation plus the site card', () => {
    expect(cards).toHaveLength(OCCUPATIONS.length + 1);
    expect(new Set(cards.map((c: { slug: string }) => c.slug)).size).toBe(cards.length);
    expect(card('index').variant).toBe('site');
  });

  it('uses the same score bands as the site', () => {
    for (const s of [0, 24, 25, 49, 50, 74, 75, 99, 100]) expect(bandFor(s).id).toBe(scoreBand(s));
    expect(BANDS.map((b: { id: string }) => b.id)).toEqual(['severe', 'elevated', 'moderate', 'low']);
  });

  it('carries title, OBS score, band, BLS category chip and the index mark', () => {
    for (const o of OCCUPATIONS) {
      const svg = renderVerdictSvg(card(o.slug));
      expect(svg).toContain(`width="${OG_WIDTH}" height="${OG_HEIGHT}"`);
      expect(svg).toContain(`data-obs="${o.scores.obs.value}"`);
      expect(svg).toContain(`data-band="${scoreBand(o.scores.obs.value!)}"`);
      expect(svg).toContain(`data-chip="${o.blsCategory.value ?? 'Not rated'}"`);
      expect(svg).toContain('HUMAN OBSOLESCENCE INDEX');
      expect(svg).toContain(`SOC ${o.soc}`);
    }
    const tele = renderVerdictSvg(card('telemarketers'));
    expect(tele).toContain('>Telemarketers<');
    expect(tele).toContain('RANK #1 OF 120');
  });

  it('labels off-board occupations as tracked, not ranked', () => {
    const nurses = OCCUPATIONS.find((o) => o.soc === '29-1141')!;
    expect(nurses.leaderboardRank).toBeNull();
    expect(card(nurses.slug).eyebrow).toContain('TRACKED OFF-BOARD');
  });

  it('never frames exposure as job loss', () => {
    const svg = renderVerdictSvg(card('telemarketers'));
    expect(svg).toContain('not job loss');
    expect(svg).not.toMatch(/will (lose|disappear)|replaced by AI/i);
  });

  it('fits even the longest title without truncation', () => {
    const longest = [...OCCUPATIONS].sort((a, b) => b.title.length - a.title.length)[0];
    const fit = fitTitle(longest.title, { width: 716, sizes: [60, 54, 48, 42, 38, 34], maxLines: 4 });
    expect(fit.lines.join(' ')).toBe(longest.title);
    for (const line of fit.lines) expect(line.length * fit.size * 0.6).toBeLessThanOrEqual(716);
  });

  it('escapes XML and wraps text', () => {
    expect(escapeXml(`a & <b> "c"`)).toBe('a &amp; &lt;b&gt; &quot;c&quot;');
    expect(wrapText('one two three four', 9)).toEqual(['one two', 'three', 'four']);
  });

  it('renders a deterministic 1200x630 PNG', async () => {
    const svg = Buffer.from(renderVerdictSvg(card('telemarketers')));
    const [a, b] = await Promise.all([sharp(svg).png().toBuffer(), sharp(svg).png().toBuffer()]);
    expect(a.equals(b)).toBe(true);
    const meta = await sharp(a).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([OG_WIDTH, OG_HEIGHT, 'png']);
  });
});
