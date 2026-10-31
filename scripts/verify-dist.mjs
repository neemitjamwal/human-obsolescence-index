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

// ---- Index site pages: data-driven checks against the committed data ----
const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
const manifestText = readFileSync(join(root, 'src/data/sources.json'), 'utf8');
const manifest = JSON.parse(manifestText);
const knownSources = new Set(manifest.sources.map((s) => s.id));
const readDist = (rel) => (existsSync(join(dist, rel)) ? readFileSync(join(dist, rel), 'utf8') : null);
const attrValues = (html, attr) => [...html.matchAll(new RegExp(`${attr}="([^"]*)"`, 'g'))].map((m) => m[1]);

for (const page of ['changelog/index.html']) {
  if (!readDist(page)) failures.push(`dist/${page} is missing`);
}

const DISCLAIMER = 'Exposure measures what AI can do to this occupation&#39;s tasks — not whether the job disappears.';
const DISCLAIMER_ALT = "Exposure measures what AI can do to this occupation's tasks — not whether the job disappears.";
const COMPONENTS = ['microsoft', 'eloundou', 'exposure', 'employment-change', 'trajectory', 'obs'];
let occupationPages = 0;
let citationLinks = 0;
for (const o of data.occupations) {
  const rel = `occupations/${o.slug}/index.html`;
  const html = readDist(rel);
  if (!html) {
    failures.push(`dist/${rel} is missing`);
    continue;
  }
  occupationPages += 1;
  for (const c of COMPONENTS) {
    if (!html.includes(`data-component="${c}"`)) failures.push(`${rel} is missing score component ${c}`);
  }
  if (!html.includes(`data-obs-score="${o.scores.obs.value}"`)) failures.push(`${rel} does not show OBS ${o.scores.obs.value}`);
  if (o.blsCategory.value && !html.includes(`<span>${o.blsCategory.value}</span>`)) failures.push(`${rel} has no BLS category chip`);
  if (!html.includes('data-verdict-bls') || !html.includes('data-verdict-obs')) failures.push(`${rel} verdict does not separate OBS and BLS`);
  if (!html.includes(DISCLAIMER) && !html.includes(DISCLAIMER_ALT)) failures.push(`${rel} is missing the exposure disclaimer`);
  if (!html.includes('href="/methodology/"')) failures.push(`${rel} does not link the methodology`);
  if (!html.includes('data-museum-precedent-slot=')) failures.push(`${rel} has no museum precedent slot`);
  const cites = attrValues(html, 'data-cite');
  const receipts = new Set(attrValues(html, 'data-source-id'));
  citationLinks += cites.length;
  for (const id of new Set(cites)) {
    if (!knownSources.has(id)) failures.push(`${rel} cites unknown source ${id}`);
    if (!receipts.has(id)) failures.push(`${rel} cites ${id} without an on-page receipt`);
  }
  for (const id of ['msft-ai-applicability', 'openai-gpts-are-gpts', 'bls-ep', 'bls-ai-exposure', 'hoi-composite', 'onet-31']) {
    if (!cites.includes(id)) failures.push(`${rel} never cites ${id}`);
  }
  const tasks = attrValues(html, 'data-task').length;
  if (tasks !== o.tasks.length || tasks < 3) failures.push(`${rel} renders ${tasks} tasks, expected ${o.tasks.length}`);
  const adjacent = attrValues(html, 'data-adjacent').length;
  if (adjacent !== o.adjacentRoles.length || adjacent < 2 || adjacent > 4) {
    failures.push(`${rel} renders ${adjacent} adjacent roles, expected ${o.adjacentRoles.length} (2-4)`);
  }
  if (!html.includes('data-employment-context')) failures.push(`${rel} has no employment/wage context`);
}

// Leaderboard order must match the data: ranks 1..N, slugs in rank order, OBS non-increasing.
const board = data.occupations.filter((o) => o.leaderboardRank != null).sort((a, b) => a.leaderboardRank - b.leaderboardRank);
const boardSection = home.split('id="leaderboard"')[1]?.split('</ol>')[0] ?? '';
const rankedRows = [...boardSection.matchAll(/data-rank="(\d+)" data-obs="(\d+)"[^>]*data-slug="([^"]+)"/g)].map((m) => ({
  rank: Number(m[1]),
  obs: Number(m[2]),
  slug: m[3],
}));
if (rankedRows.length !== board.length) failures.push(`home leaderboard shows ${rankedRows.length} ranked rows, data has ${board.length}`);
rankedRows.forEach((row, i) => {
  const expected = board[i];
  if (!expected || row.slug !== expected.slug || row.rank !== i + 1 || row.obs !== expected.scores.obs.value) {
    failures.push(`home leaderboard row ${i + 1} is ${row.slug} (OBS ${row.obs}); data says ${expected?.slug} (OBS ${expected?.scores.obs.value})`);
  }
  if (i > 0 && row.obs > rankedRows[i - 1].obs) failures.push(`home leaderboard OBS rises at row ${i + 1}`);
});
for (const o of data.occupations) {
  if (!home.includes(`href="/occupations/${o.slug}/"`)) failures.push(`home does not link /occupations/${o.slug}/`);
}
if (home.includes('data-placeholder')) failures.push('home still contains placeholder content');

// Methodology: verbatim BLS limits, live coverage count, Microsoft warning, Canaries, every source.
const methodology = readDist('methodology/index.html') ?? '';
const unescape = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const methodologyText = unescape(methodology);
const { BLS_LIMITS, MICROSOFT_WARNING } = await import('../src/data/references.ts');
for (const [key, quote] of Object.entries(BLS_LIMITS)) {
  if (!methodologyText.includes(quote)) failures.push(`methodology is missing the verbatim BLS text (${key})`);
}
if (!methodologyText.includes(MICROSOFT_WARNING)) failures.push('methodology is missing the Microsoft out-of-scope warning');
if (!methodology.includes(`data-msft-missing>${data.meta.universe.microsoftMissing}<`)) failures.push('methodology does not render meta.universe.microsoftMissing');
if (!/reduced hiring, not firings/.test(methodology) || !methodology.includes('19%')) failures.push('methodology Canaries reality check is incomplete');
for (const s of manifest.sources) {
  if (!methodology.includes(`id="src-${s.id}"`)) failures.push(`methodology does not list source ${s.id}`);
}

// Press: stat pack files exist in dist and match the data.
const press = readDist('press/index.html') ?? '';
const packManifest = readDist('stat-pack/sources.json');
if (packManifest !== manifestText) failures.push('dist/stat-pack/sources.json is missing or differs from src/data/sources.json');
const csv = readDist('stat-pack/hoi-top50.csv');
if (!csv) failures.push('dist/stat-pack/hoi-top50.csv is missing');
else {
  const lines = csv.trimEnd().split('\r\n');
  if (lines.length !== 51) failures.push(`hoi-top50.csv has ${lines.length - 1} data rows, expected 50`);
  lines.slice(1).forEach((line, i) => {
    if (!line.startsWith(`${i + 1},${board[i].soc},`)) failures.push(`hoi-top50.csv row ${i + 1} is not ${board[i].soc}`);
  });
}
for (const f of ['/stat-pack/hoi-top50.csv', '/stat-pack/sources.json']) {
  if (!press.includes(`href="${f}"`)) failures.push(`press page does not link ${f}`);
}
const statCount = attrValues(press, 'data-stat').length;
if (statCount < 5) failures.push(`press page lists ${statCount} quotable stats, expected at least 5`);
for (const id of attrValues(press, 'data-stat-source')) {
  if (!knownSources.has(id)) failures.push(`press stat cites unknown source ${id}`);
}

const changelog = readDist('changelog/index.html') ?? '';
if (!changelog.includes(`data-release="${data.meta.edition}"`) || !changelog.includes(`datetime="${data.meta.dataAsOf}"`)) {
  failures.push('changelog has no entry for the current edition and release date');
}

for (const page of ['about/index.html', 'methodology/index.html', 'press/index.html']) {
  if ((readDist(page) ?? '').includes('data-placeholder')) failures.push(`${page} still contains placeholder content`);
}
// ---- SEO: share meta, verdict cards, sitemap, robots, no local URLs anywhere ----
const SITE = 'https://humanobsolescenceindex.com';
const metaContent = (html, key) => {
  const m = new RegExp(`<meta (?:property|name)="${key.replace(/:/g, ':')}" content="([^"]*)"`).exec(html);
  return m ? m[1] : null;
};
/** Width and height from a PNG's IHDR chunk. */
const pngSize = (buf) =>
  buf.length > 24 && buf.toString('ascii', 1, 4) === 'PNG' ? { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) } : null;
const checkedImages = new Map();
let ogImages = 0;
for (const file of htmlFiles) {
  const rel = file.slice(dist.length + 1).replace(/\\/g, '/');
  const html = readFileSync(file, 'utf8');
  for (const key of ['og:title', 'og:description', 'og:image', 'og:url', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!metaContent(html, key)) failures.push(`${rel} has no ${key}`);
  }
  if (metaContent(html, 'twitter:card') !== 'summary_large_image') failures.push(`${rel} has no twitter:card summary_large_image`);
  if (!/<link rel="canonical" href="https:\/\/humanobsolescenceindex\.com\/[^"]*"/.test(html)) failures.push(`${rel} has no production canonical link`);
  const image = metaContent(html, 'og:image');
  if (!image) continue;
  if (!image.startsWith(`${SITE}/og/`) || !image.endsWith('.png')) {
    failures.push(`${rel} og:image ${image} is not a ${SITE}/og/*.png card`);
    continue;
  }
  if (metaContent(html, 'twitter:image') !== image) failures.push(`${rel} twitter:image differs from og:image`);
  const imgRel = image.slice(SITE.length + 1);
  if (!checkedImages.has(imgRel)) {
    const path = join(dist, imgRel);
    const size = existsSync(path) ? pngSize(readFileSync(path)) : null;
    checkedImages.set(imgRel, size);
    if (!size) failures.push(`${rel} og:image dist/${imgRel} is missing or not a PNG`);
    else if (size.width !== 1200 || size.height !== 630) failures.push(`dist/${imgRel} is ${size.width}x${size.height}, expected 1200x630`);
  }
  ogImages += 1;
}
for (const o of data.occupations) {
  const html = readDist(`occupations/${o.slug}/index.html`);
  if (!html) continue;
  const expected = `${SITE}/og/${o.slug}.png`;
  if (metaContent(html, 'og:image') !== expected) failures.push(`occupations/${o.slug}/ og:image is not ${expected}`);
  if (!unescape(metaContent(html, 'og:title') ?? '').startsWith(o.title)) {
    failures.push(`occupations/${o.slug}/ og:title does not start with the occupation title`);
  }
  if (!(metaContent(html, 'og:description') ?? '').includes(`OBS ${o.scores.obs.value}/100`)) failures.push(`occupations/${o.slug}/ og:description does not state its OBS`);
}

const sitemap = readDist('sitemap.xml');
let sitemapUrls = [];
if (!sitemap) failures.push('dist/sitemap.xml is missing');
else {
  sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const listed = new Set(sitemapUrls);
  if (listed.size !== sitemapUrls.length) failures.push('sitemap.xml lists a URL twice');
  for (const o of data.occupations) {
    if (!listed.has(`${SITE}/occupations/${o.slug}/`)) failures.push(`sitemap.xml does not list /occupations/${o.slug}/`);
  }
  const pagePaths = htmlFiles.map((f) => `/${f.slice(dist.length + 1).replace(/\\/g, '/').replace(/index\.html$/, '')}`);
  for (const p of pagePaths) if (!listed.has(`${SITE}${p}`)) failures.push(`sitemap.xml does not list ${p}`);
  if (sitemapUrls.length !== pagePaths.length) failures.push(`sitemap.xml lists ${sitemapUrls.length} URLs for ${pagePaths.length} pages`);
}
const robots = readDist('robots.txt');
if (!robots) failures.push('dist/robots.txt is missing');
else if (!robots.includes(`Sitemap: ${SITE}/sitemap.xml`) || !robots.includes('User-agent: *')) failures.push('robots.txt does not reference the sitemap');

const textFiles = walk(dist).filter((f) => /\.(html|xml|txt|css|js|mjs|json|csv|svg|webmanifest)$/.test(f));
for (const file of textFiles) {
  if (/127\.0\.0\.1|localhost/i.test(readFileSync(file, 'utf8'))) {
    failures.push(`${file.slice(dist.length + 1).replace(/\\/g, '/')} contains a localhost or 127.0.0.1 URL`);
  }
}
if (failures.length > 0) {
  console.error('verify-dist FAILED:');
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

const cssBytes = cssFiles.reduce((sum, f) => sum + statSync(join(astroDir, f)).size, 0);
console.log(
  `verify-dist OK: ${htmlFiles.length} HTML page(s), nav targets present, ${cssFiles.length} CSS bundle(s) ` +
    `(${(cssBytes / 1024).toFixed(1)} KB) with all Exchange tokens, ticker + ledger on home, no localhost URLs; ` +
    `${occupationPages} occupation pages with all components (${citationLinks} citation links, all resolving to sources.json), ` +
    `${rankedRows.length} leaderboard rows in data order, stat pack (top-50 CSV + sources.json) present, methodology/press/changelog checks passed; ` +
    `${ogImages} pages with share meta (${checkedImages.size} distinct 1200x630 PNG cards), sitemap ${sitemapUrls.length} URLs, robots.txt, ` +
    `${textFiles.length} text files free of localhost/127.0.0.1`,
);
