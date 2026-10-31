// Optimized responsive copies of the generated robot art. Originals live in art/ (never deployed); outputs go to
// public/art/ and are committed. Re-encodes only when an original is newer than its outputs.
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ART } from '../src/data/art.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'art');
mkdirSync(outDir, { recursive: true });

let written = 0;
let fresh = 0;
for (const piece of Object.values(ART)) {
  const src = join(root, 'art', piece.original);
  const srcTime = statSync(src).mtimeMs;
  for (const width of piece.widths) {
    for (const format of ['avif', 'webp']) {
      const out = join(outDir, `${piece.name}-${width}.${format}`);
      if (existsSync(out) && statSync(out).mtimeMs >= srcTime) {
        fresh++;
        continue;
      }
      const img = sharp(src).resize({ width, withoutEnlargement: true });
      await (format === 'avif' ? img.avif({ quality: piece.quality.avif, effort: 6 }) : img.webp({ quality: piece.quality.webp, effort: 6 })).toFile(out);
      written++;
    }
  }
}
console.log(`art: ${written} written, ${fresh} up to date → public/art/`);
