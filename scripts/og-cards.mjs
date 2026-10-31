// Renders the 1200x630 share cards into public/og/ so Astro copies them into dist: one per published occupation
// page (public/og/<slug>.png), the site card, and one per /v/<slug>/ verdict page (public/og/v/<slug>.png).
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  OG_HEIGHT,
  OG_WIDTH,
  buildCards,
  buildVerdictPageCards,
  renderBattleSvg,
  renderVerdictPageSvg,
  renderVerdictSvg,
} from './lib/verdict-cards.mjs';
import { BATTLE_PAIRS } from '../src/data/battles.ts';
import { panicFor } from '../src/data/roasts.ts';
import { battleView } from '../src/lib/battle.ts';
import { ROBOT_POSE_BY_BAND, robotSvg } from '../src/lib/robots.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'og');
const verdictDir = join(outDir, 'v');
const battleDir = join(outDir, 'vs');
const hashFile = join(root, '.cache', 'og-hashes.json');
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
const verdicts = JSON.parse(readFileSync(join(root, 'src/data/verdicts.json'), 'utf8'));

export async function renderPng(svg) {
  return sharp(Buffer.from(svg), { density: 72 }).resize(OG_WIDTH, OG_HEIGHT).png({ compressionLevel: 9, palette: false }).toBuffer();
}

// Rendering ~940 cards takes a while, so a card whose SVG is unchanged since the last run (and whose PNG exists) is skipped.
const previous = existsSync(hashFile) ? JSON.parse(readFileSync(hashFile, 'utf8')) : {};
const hashes = {};
let written = 0;
let unchanged = 0;

async function emit(dir, slug, svg) {
  const file = join(dir, `${slug}.png`);
  const key = `${dir === verdictDir ? 'v/' : dir === battleDir ? 'vs/' : ''}${slug}`;
  const hash = createHash('sha256').update(svg).digest('hex');
  hashes[key] = hash;
  if (previous[key] === hash && existsSync(file)) {
    unchanged++;
    return;
  }
  const png = await renderPng(svg);
  if (existsSync(file) && readFileSync(file).equals(png)) unchanged++;
  else {
    writeFileSync(file, png);
    written++;
  }
}

function prune(dir, expected) {
  const stale = readdirSync(dir).filter((f) => f.endsWith('.png') && !expected.has(f));
  for (const f of stale) rmSync(join(dir, f));
  return stale.length;
}

mkdirSync(verdictDir, { recursive: true });
mkdirSync(battleDir, { recursive: true });
const cards = buildCards(data);
for (const card of cards) await emit(outDir, card.slug, renderVerdictSvg(card));
const vCards = buildVerdictPageCards(verdicts, panicFor);
const queue = [...vCards];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    for (let card = queue.shift(); card; card = queue.shift()) {
      const robot = robotSvg(ROBOT_POSE_BY_BAND[card.band.id], { id: `og-${card.slug}`, width: 150 });
      await emit(verdictDir, card.slug, renderVerdictPageSvg(card, robot));
    }
  }),
);
const bySlug = new Map(verdicts.verdicts.map((v) => [v.slug, v]));
const fighter = (slug) => {
  const v = bySlug.get(slug);
  if (!v) throw new Error(`og-cards: battle pair names ${slug}, which has no verdict`);
  return { slug: v.slug, title: v.title, obs: v.obs, band: v.band, projectedChangePct: v.projectedChangePct };
};
const refereePng = await sharp(join(root, 'art', 'index-battle-executioner.png')).resize(244, 366, { fit: 'cover' }).png().toBuffer();
const battleArt = {
  referee: `data:image/png;base64,${refereePng.toString('base64')}`,
  robot: robotSvg('pinkslip', { id: 'og-battle', width: 80 }),
};
const battles = BATTLE_PAIRS.map(([a, b]) => battleView(fighter(a), fighter(b)));
for (const view of battles) {
  await emit(battleDir, view.key, renderBattleSvg({ ...view, edition: verdicts.meta.edition }, battleArt));
}
const stale =
  prune(outDir, new Set(cards.map((c) => `${c.slug}.png`))) +
  prune(verdictDir, new Set(vCards.map((c) => `${c.slug}.png`))) +
  prune(battleDir, new Set(battles.map((v) => `${v.key}.png`)));
mkdirSync(dirname(hashFile), { recursive: true });
writeFileSync(hashFile, JSON.stringify(hashes));

console.log(
  `og-cards: ${cards.length} occupation/site cards + ${vCards.length} verdict-page cards + ${battles.length} battle cards — ${written} written, ${unchanged} unchanged, ${stale} stale removed → public/og/`,
);
