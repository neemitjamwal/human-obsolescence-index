# Human Obsolescence Index

**The Daily Doom: type your job, the robots print the headline.** [humanobsolescenceindex.com](https://humanobsolescenceindex.com).

The relaunched Index is a robot-uprising tabloid built on real labor data. Type any of the 784 scored occupations into the "Type your job" box and the verdict slams in like a printing press: a Doom Score out of 100, the official BLS AI exposure category, a roast built only from real numbers, and a red-eyed robot at the window. You can add an optional first name and share the result as a canvas card. "Who's safer?" pits two jobs against each other, and the hall of shame lists the most doomed. The robots are theatre; every number is data, and every result says "AI exposure ≠ job loss" next to a methodology link. The visual system ("The Daily Doom") is recorded in the mission's design direction and mocked up in `design-directions/tabloid-doom/` (never deployed; see `design-directions/README.md`).

The index ranks U.S. occupations by a composite **OBS score** (0–100) built from public data: how much of an occupation's work AI can already touch (Microsoft's observed Copilot applicability and the Eloundou et al. "GPTs are GPTs" exposure ratings) and where the U.S. Bureau of Labor Statistics projects its employment to go from 2025 to 2035. The official BLS AI exposure category is shown beside our number, never merged into it. Every occupation page carries its score breakdown, O*NET tasks, growing adjacent roles, employment and wage context, and a receipt for every number. The tone is gallows humor with receipts, and exposure is never presented as job loss.

The 2026-Q4 edition scores 784 of the 831 occupations BLS projects, ranks the top 120 (among occupations with at least 50,000 workers), and publishes full pages for 152: the ranked board, every BLS fastest-declining occupation, a few low-scoring contrast picks such as registered nurses and electricians, and every occupation the Museum of Extinct Jobs AI wing links to (`MUSEUM_PRECEDENT_SOCS` in `scripts/lib/config.mjs`; actors, paralegals and fine artists are tracked off the board).

It is a static Astro 7 site with Tailwind v4 (via `@tailwindcss/vite`), vanilla TypeScript in inline `<script>` tags, vitest, sharp for share images and exceljs for the BLS spreadsheets. There is no JS framework, no API key and no server.

## Requirements

- Node.js **>= 22.22** (Astro 7 needs it; Netlify pins `NODE_VERSION = "22.22.0"` in `netlify.toml`).
- npm. Run `npm install` once.

If your system Node is older, run each command through a temporary Node, for example `npx -y -p node@22.22.0 -- npm run build`.

## Routes

| Route | What it is |
| --- | --- |
| `/` | Front page: the "Type your job" combobox and optional first name, the verdict reveal and share panel, the hall of shame (top 20) and the "Who's safer?" teaser |
| `/v/<slug>/` | A static verdict page for every scored occupation (784), with receipts, a 1200×630 OG card, a "Read its obituary" link to the museum and, where one is mapped, a "Historical precedent" link to a museum exhibit |
| `/vs/` and `/vs/<a>-vs-<b>/` | "Who's safer?": a two-combobox battle (`/vs/?a=<slug>&b=<slug>`) plus 40 curated static fights with OG cards |
| `/office-lineup/` | "Office lineup": a police lineup of two to four coworkers plus an optional boss, each a real occupation (the same job may repeat), ranked by Doom Score with honest ties and receipts links. Share links look like `/office-lineup/?c=<slug>,<slug>&boss=<slug>#n=<name>,<name>,,<boss name>`: optional first names live only in the `#n=` fragment, so they are never sent to the server, stored, or rendered at build time. Story and post cards are drawn in the browser |
| `/leaderboard/` | The full ranked board of 120 |
| `/occupations/<slug>/` | The full file for each of the 152 published occupations |
| `/methodology/`, `/press/`, `/changelog/`, `/about/`, `/embed/` | Methodology with BLS limits quoted verbatim, press stat pack, edition log, credits, and the iframe widget |

## Commands

| Command | What it does |
| --- | --- |
| `npm run build:index` | The data pipeline. Downloads the 7 source files into `.cache/raw/`, parses, joins on SOC codes, scores, and writes `src/data/occupations.json`, `src/data/sources.json`, `src/data/verdicts.json` (every scored occupation) and `public/data/search-index.json` (the lazily fetched job-title index, with O*NET alternate titles and `src/data/slang-aliases.ts`). Cached files are re-validated and reused, so a re-run with the same inputs produces byte-identical JSON |
| `npm run build:index -- --refresh` | Same, but re-downloads every source (at most one request per 1.1 s) |
| `npm run dev` | Astro dev server |
| `npm run build` | Writes the press stat pack (`public/stat-pack/`), resizes the robot-uprising art in `art/` into responsive AVIF/WebP files in `public/art/` (`scripts/art.mjs`), renders the OG cards (`og:cards`), then runs `astro build` into `dist/` |
| `npm run preview` | Serves `dist/` |
| `npm run og:cards` | Renders the 1200×630 Daily Doom PNG cards: one per published occupation plus the site card into `public/og/`, one robot-uprising card per scored occupation for its `/v/<slug>/` verdict page into `public/og/v/`, and one per curated battle into `public/og/vs/`. Deterministic and idempotent: unchanged cards are not rewritten, stale ones are removed |
| `npm run test` | vitest: deterministic OBS recomputation from a fixture, join sanity (SOC codes, never titles), coverage flags, manifest completeness, verdicts.json parity, the matcher, roasts and share cards, battles, Doom Score labels, museum cross-links, the launch kit's stat ledger (`tests/launch-kit.test.ts`), page content, OG cards, sitemap/robots, licensing credits and red-list discipline. When a build exists it also scans `dist/` for local URLs, red-list mentions, raw data files, and panic copy (`tests/panic-honesty.test.ts`: every number next to a job count, percentage or year must trace to the data or source register, and no copy may mock workers) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Post-build checks on `dist/`: every page and score component, every `/v/` page with its disclaimer, museum obituary link and mapped precedent, every battle page, the hall of shame, the front-page JS budget (60 KB gzip) and search index budget (150 KB gzip), every citation resolving to `sources.json`, leaderboard order, stat pack, methodology quotes, share meta on every page, every `og:image` present as a 1200×630 PNG, a sitemap listing every page, robots.txt, no `localhost`/`127.0.0.1` URLs anywhere in the output, licensing credits on `/about/`, WEF and layoffs.fyi only as labeled cite-only links, and no raw data files beyond the stat pack |

The full gate is `npm run test`, `npm run typecheck`, `npm run build` and `npm run verify`. All four must exit 0. `build` does not run the pipeline: the generated JSON is committed, so Netlify never downloads from BLS.

## Browser testing and accessibility scans

The pages are checked in a real browser with [agent-browser](https://www.npmjs.com/package/agent-browser) at 390×844 and 1280×800 against `npm run preview` (`npx astro preview --port 4521 --host 127.0.0.1`). Accessibility is scanned with the real axe-core engine, installed as a devDependency (`axe-core`) for testing only. It is never imported by the site and never ships in `dist/`.

To scan a page, inject `node_modules/axe-core/axe.min.js` into the open page and run it. The file is too long for a command line, so pass it to `batch` on stdin as JSON (PowerShell):

```powershell
$src = [IO.File]::ReadAllText("$PWD\node_modules\axe-core\axe.min.js")
[IO.File]::WriteAllText("$PWD\.cache\axe-batch.json", '[["eval",' + ($src | ConvertTo-Json) + ']]')
cmd /c "agent-browser --session hoi open http://127.0.0.1:4521/ < NUL"
cmd /c "agent-browser --session hoi batch < .cache\axe-batch.json"
$run = 'axe.run(document).then(r => JSON.stringify(r.violations.map(v => [v.id, v.impact, v.nodes.length])))'
$b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($run))
cmd /c "agent-browser --session hoi eval -b $b64 < NUL"
cmd /c "agent-browser --session hoi close < NUL"
```

The result lists violations as `[id, impact, nodeCount]`; the budget is an empty list on the front page (before and after a verdict is revealed) and on a `/v/<slug>/` verdict page, at both viewport sizes. Also check `prefers-reduced-motion` with `agent-browser set media light reduced-motion`. Report axe's `incomplete` results (usually contrast over halftone or photo backgrounds) separately: zero violations is not a full WCAG audit.
## Layout

- `scripts/build-index.mjs` and `scripts/lib/`: the pipeline (`config` pins, `download`, `zip`, `parse`, `join`, `score`, `select`, `emit`).
- `src/data/occupations.json`, `src/data/sources.json`: generated and committed. Every field is `{ value, sourceId }`.
- `src/pages/index.astro` (front page), `src/pages/leaderboard.astro`, `src/pages/occupations/[slug].astro` (one page per published occupation), `src/pages/vs/` (battles), `src/pages/office-lineup.astro` (office lineup: logic in `src/lib/lineup.ts`, DOM in `lineup-dom.ts`/`lineup-page.ts`, cards in `lineup-card.ts`, copy in `src/data/lineup.ts`), `methodology`, `press`, `changelog`, `about`, `embed`.
- `art/`: the original robot-uprising art (never deployed). `scripts/art.mjs` writes the responsive AVIF/WebP copies to `public/art/`.
- `launch/LAUNCH-KIT.md`: the launch and distribution kit (Show HN, Reddit, X, LinkedIn, Product Hunt, 10 short-video hooks, press pitches, a 14-day schedule). Every number in it is listed in its stat ledger and checked against the data by `tests/launch-kit.test.ts`; edit the ledger whenever the kit's copy changes, and re-check it after each new edition.
- `src/pages/index.astro` hero, `src/lib/hero.ts`: the "Type your job" combobox, which fetches `/data/search-index.json` and `/data/verdicts.json` on first focus. `src/pages/v/[slug].astro`: a static verdict page for every scored occupation. `src/components/VerdictPanel.astro`, `src/lib/verdict-dom.ts`: the verdict and its reveal. `src/components/SharePanel.astro`, `src/lib/share-panel.ts`, `src/lib/card.ts`: the canvas share cards (1080×1920 and 1200×630) and Download / Share / Copy link. `src/data/roasts.ts`: the robot-uprising copy bank. `src/lib/robots.ts`: the cartoon SVG robots.
- Share links: a verdict link is `/v/<slug>/`, and the optional first name rides in the URL fragment as `/v/<slug>/#n=<encoded-name>` (built by `sharePath` in `src/lib/verdict-view.ts`, read by `nameFromHash` in `src/lib/name.ts`). Browsers do not send the fragment in HTTP requests, so the name never reaches the server; the page script restores it on load, drops any name the sanitizer would have to change, and ignores `?n=`. The name is still visible in the address bar and browser history and travels with the link when someone shares it.
- `src/lib/seo.ts`: share descriptions, OG image paths, and the page list behind `sitemap.xml` and `robots.txt`.
- `scripts/og-cards.mjs` and `scripts/lib/verdict-cards.mjs`: the sharp card renderer. `public/og/` and `public/stat-pack/` are generated and gitignored.
- `scripts/verify-dist.mjs`: the post-build checks. `scripts/lib/dist-hygiene.mjs`: the local-URL, red-list and raw-data scans shared by `verify` and the tests.
- `src/data/credits.ts`: the licensing credits and cite-only list rendered on `/about/`.

## Quarterly update workflow

Each quarter is one re-run of the pipeline from pinned inputs, plus a changelog entry.

1. **Check for new releases and re-pin.** All source URLs live in `scripts/lib/config.mjs`. Some are dated in the file name and must be bumped by hand when a new release appears:
   - OEWS: `oesm25nat.zip` (entry `national_M2025_dl.xlsx`). Expect `oesm26nat.zip` / `national_M2026_dl.xlsx` (May 2026 estimates) in **spring 2027**.
   - O*NET: `db_31_0_text.zip`. Bump to the next database release when O*NET publishes it, and update the versioned credit ("O*NET 31.0 Database") everywhere it appears.
   - BLS Employment Projections (`occupation.xlsx`) and the AI exposure categories (`ai-exposure-categories.xlsx`) are **not** dated in their URLs. BLS replaces them in place; expect EP **2026–36 in late August 2027**. When that happens the column headers change (for example `Employment, 2025` becomes `Employment, 2026`), so update the header names and year labels in `scripts/lib/parse.mjs`, `scripts/lib/emit.mjs`, `scripts/lib/config.mjs` and the page copy that says 2025–35.
   - Microsoft and OpenAI data come from GitHub `main` branches. They have been static since publication; the recorded SHA-256 shows whether they changed.
2. **Bump the edition.** Set `EDITION` in `scripts/lib/config.mjs` (for example `2027-Q1`).
3. **Run `npm run build:index -- --refresh`.** It downloads everything again with Node's built-in `fetch` (bls.gov rejects curl from some machines at the TLS layer; Node `fetch` works). It records a new retrieval date and SHA-256 for every file in `sources.json`.
4. **Review the diff** of `src/data/occupations.json` and `src/data/sources.json`: which hashes changed, who moved on the board, whether the 831-occupation universe or the coverage counts changed.
5. **Write the changelog entry** in `src/pages/changelog.astro` (what changed in the inputs, biggest riser and faller). Score deltas start from the second edition.
6. **Run the full gate**, commit, and push. Netlify rebuilds from the committed JSON.

### Fail-loud behavior

The pipeline never publishes a partial or silently wrong index. `npm run build:index` exits non-zero, with the source id and URL in the message, when:

- a download fails or returns a non-200 status (for example a 404 after BLS moves a file);
- the server returns an HTML page instead of data, an XLSX/ZIP without the ZIP magic bytes, or a CSV with an unexpected header;
- a cached file's SHA-256 no longer matches the manifest (rerun with `--refresh`);
- an expected worksheet (`Table 1.2`, `Table 1.5`), column header or ZIP entry is missing, which is what a BLS schema or year change looks like;
- an EP line item has no SOC code, a SOC code is malformed or duplicated, a BLS exposure category is not one of the four official labels, or a forced inclusion is not in the universe.

`npm run og:cards` also fails if any published occupation has no OBS score. A failed run leaves the committed JSON untouched, so the live site keeps the last good edition.

## Content rules

- Every number displayed on any page resolves to a `sourceId` in `sources.json` (test- and verify-enforced). Joins use SOC 2018 codes, never titles.
- Exposure is never presented as job loss. "AI exposure ≠ job loss" appears next to every verdict, battle, office lineup and occupation result (share cards carry the site URL instead), and BLS's interpretation limits are quoted verbatim on the methodology page, along with Microsoft's out-of-scope warning.
- The official BLS category is always shown beside the OBS score and attributed to BLS.
- The headline number is the Doom Score (OBS). It is never labeled "exposure"; the separate AI exposure percentile is labeled as such (test-enforced).
- Robot-uprising copy (`src/data/roasts.ts`) may panic but carries no invented numbers, dates, predictions or quotes; roasts interpolate only real fields; the robots are the villains, never the worker.
- The optional first name is sanitized, rendered as text only, and kept in the URL fragment; it is never sent to a server.
- Missing components get visible coverage flags. The count of occupations without Microsoft scores is rendered from the data, never hardcoded.
- WEF Future of Jobs 2025 and layoffs.fyi may appear only as labeled cite-links (listed in `src/data/credits.ts` and rendered on `/about/`), never as data inputs. The Stanford "Canaries" paper is cited and linked; its raw data is not re-hosted.

## Licensing

- Code: all rights reserved by the site owner unless a license file is added.
- Data inputs, credited on `/about/` and `/methodology/`:
  - U.S. Bureau of Labor Statistics (Employment Projections, AI exposure categories, OEWS, O*NET–SOC crosswalk): U.S. public domain.
  - O*NET 31.0 Database by USDOL/ETA: CC BY 4.0. O*NET® is a trademark of USDOL/ETA.
  - Microsoft Research "Working with AI" applicability scores: CC BY 4.0.
  - OpenAI / Eloundou et al. "GPTs are GPTs" occupation-level ratings: MIT.
- The OBS score and the stat pack (`/stat-pack/`) are derived work; cite them as "Human Obsolescence Index, <edition> edition".
- Fonts: Anton, Archivo and Permanent Marker (SIL Open Font License), served by Google Fonts; `/embed/` self-hosts Anton and Archivo from `public/fonts/`. The OG cards fall back to system fonts when those are not installed, so card typography can differ between Windows and Netlify's Linux build image.
- The robot-uprising art in `art/` was generated for this project.

## Museum cross-links and the embed widget

- `src/data/precedents.ts` maps SOC codes to Museum of Extinct Jobs exhibits. Occupation pages and verdicts (the front-page reveal and every `/v/` page) render them as "Historical precedent: The … thought so too" links built from `MUSEUM_BASE_URL` at the top of that file; jobs without a mapped precedent show no precedent link.
- Every verdict and occupation page also links "Read its obituary" to `https://museumofextinctjobs.com/obituary/<slug>/` (`museumObituaryUrl`). The museum builds an obituary for every scored occupation under the Index slug, from its committed snapshot of `verdicts.json`. In the other direction, each museum obituary links "See your live score" back to `/v/<slug>/`.
- `tests/crosslinks-embed.test.ts` checks every exhibit slug, and every obituary slug against the museum's committed snapshot, in the sibling `../museum-of-extinct-jobs` checkout when it is present (`MUSEUM_REPO_DIR` overrides the path). After a pipeline run, run `npm run sync:index` in the museum so its snapshot matches.
- `/embed/` (`src/pages/embed.astro`) is a self-contained, iframe-able ticker and score lookup for the leaderboard occupations. It uses inline CSS and vanilla inline JS over embedded JSON, makes no third-party requests, and shows the copy-paste iframe snippet with an attribution link. When framed, the snippet section hides itself.

## Deploy (Netlify from GitHub)

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project** and pick the repository.
3. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, `NODE_VERSION = "22.22.0"`. The build writes the stat pack and OG cards itself; it does not download source data.
4. Point the `humanobsolescenceindex.com` domain at the site. `site` in `astro.config.mjs` sets the absolute URLs used in canonical links, `og:image`, `sitemap.xml` and `robots.txt`.
