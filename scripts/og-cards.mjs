// Renders the 1200x630 verdict cards into public/og/ so Astro copies them into dist.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { OG_HEIGHT, OG_WIDTH, buildCards, renderVerdictSvg } from './lib/verdict-cards.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'og');
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));

export async function renderPng(card) {
  return sharp(Buffer.from(renderVerdictSvg(card)), { density: 72 })
    .resize(OG_WIDTH, OG_HEIGHT)
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();
}

const cards = buildCards(data);
mkdirSync(outDir, { recursive: true });
let written = 0;
let unchanged = 0;
for (const card of cards) {
  const file = join(outDir, `${card.slug}.png`);
  const png = await renderPng(card);
  if (existsSync(file) && readFileSync(file).equals(png)) {
    unchanged++;
    continue;
  }
  writeFileSync(file, png);
  written++;
}

const expected = new Set(cards.map((c) => `${c.slug}.png`));
const stale = readdirSync(outDir).filter((f) => f.endsWith('.png') && !expected.has(f));
for (const f of stale) rmSync(join(outDir, f));

console.log(
  `og-cards: ${cards.length} cards (${cards.length - 1} occupations + site card) — ${written} written, ${unchanged} unchanged, ${stale.length} stale removed → public/og/`,
);
