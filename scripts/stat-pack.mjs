// Writes the press stat pack into public/stat-pack/ so Astro copies it into dist.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReadme, buildTopCsv } from './lib/stat-pack.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://humanobsolescenceindex.com';
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
const sources = readFileSync(join(root, 'src/data/sources.json'), 'utf8');
const out = join(root, 'public', 'stat-pack');

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'hoi-top50.csv'), buildTopCsv(data, SITE));
writeFileSync(join(out, 'sources.json'), sources);
writeFileSync(join(out, 'README.txt'), buildReadme(data, SITE));
console.log(`stat-pack: wrote hoi-top50.csv, sources.json and README.txt to public/stat-pack/ (${data.meta.edition})`);
