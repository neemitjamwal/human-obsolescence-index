import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const failures = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

if (!existsSync(dist)) {
  console.error('verify-dist FAILED: dist/ is missing (did `npm run build` run?)');
  process.exit(1);
}

const astroDir = join(dist, '_astro');
const cssFiles = existsSync(astroDir) ? readdirSync(astroDir).filter((f) => f.endsWith('.css')) : [];
if (cssFiles.length === 0) failures.push('dist/_astro contains no CSS bundle');
const css = cssFiles.map((f) => readFileSync(join(astroDir, f), 'utf8')).join('\n').toLowerCase();
for (const token of ['#0d1117', '#161b22', '#21262d', '#2ea043', '#f85149', '#f0b429', '#e6edf3']) {
  if (!css.includes(token)) failures.push(`compiled CSS is missing design token ${token}`);
}
for (const cls of ['.ledger-row', '.ticker-track', '.scanlines', '.category-chip', '.score-bar']) {
  if (!css.includes(cls)) failures.push(`compiled CSS is missing ${cls}`);
}

const NAV = ['/', '/methodology/', '/press/', '/about/'];
for (const path of NAV) {
  const file = join(dist, path, 'index.html');
  if (!existsSync(file)) failures.push(`dist${path}index.html is missing`);
}

if (!existsSync(join(dist, 'favicon.svg'))) failures.push('dist/favicon.svg is missing');

const htmlFiles = walk(dist).filter((f) => f.endsWith('.html'));
for (const file of htmlFiles) {
  const rel = file.slice(dist.length + 1).replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${rel} has no <title>`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) failures.push(`${rel} has no meta description`);
  for (const path of NAV) {
    if (!html.includes(`href="${path}"`)) failures.push(`${rel} header/footer does not link ${path}`);
  }
  if (/127\.0\.0\.1|localhost:/.test(html)) failures.push(`${rel} contains a 127.0.0.1 or localhost URL`);
}

const home = existsSync(join(dist, 'index.html')) ? readFileSync(join(dist, 'index.html'), 'utf8') : '';
if (!home.includes('data-ticker')) failures.push('home page has no ticker strip');
if (!home.includes('data-ledger-row')) failures.push('home page has no ledger rows');

if (failures.length > 0) {
  console.error('verify-dist FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const cssBytes = cssFiles.reduce((sum, f) => sum + statSync(join(astroDir, f)).size, 0);
console.log(
  `verify-dist OK: ${htmlFiles.length} HTML page(s), nav targets present, ${cssFiles.length} CSS bundle(s) ` +
    `(${(cssBytes / 1024).toFixed(1)} KB) with all Exchange tokens, ticker + ledger on home, no localhost URLs`,
);
