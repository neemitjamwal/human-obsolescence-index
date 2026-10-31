# Human Obsolescence Index

A stock exchange for human worth: [humanobsolescenceindex.com](https://humanobsolescenceindex.com).

The index ranks U.S. occupations by a composite **OBS score** (0–100) built from public data: how much of an occupation's work AI can already touch (Microsoft's observed Copilot applicability and the Eloundou et al. "GPTs are GPTs" exposure ratings) and where the U.S. Bureau of Labor Statistics projects its employment to go from 2025 to 2035. The official BLS AI exposure category is shown beside our number, never merged into it. Every occupation page carries its score breakdown, O*NET tasks, growing adjacent roles, employment and wage context, and a receipt for every number. The tone is gallows humor with receipts, and exposure is never presented as job loss.

The 2026-Q4 edition scores 784 of the 831 occupations BLS projects, ranks the top 120 (among occupations with at least 50,000 workers), and publishes full pages for 152: the ranked board, every BLS fastest-declining occupation, a few low-scoring contrast picks such as registered nurses and electricians, and every occupation the Museum of Extinct Jobs AI wing links to (`MUSEUM_PRECEDENT_SOCS` in `scripts/lib/config.mjs`; actors, paralegals and fine artists are tracked off the board).

It is a static Astro 7 site with Tailwind v4 (via `@tailwindcss/vite`), vanilla TypeScript in inline `<script>` tags, vitest, sharp for share images and exceljs for the BLS spreadsheets. There is no JS framework, no API key and no server.

## Requirements

- Node.js **>= 22.22** (Astro 7 needs it; Netlify pins `NODE_VERSION = "22.22.0"` in `netlify.toml`).
- npm. Run `npm install` once.

If your system Node is older, run each command through a temporary Node, for example `npx -y -p node@22.22.0 -- npm run build`.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build:index` | The data pipeline. Downloads the 7 source files into `.cache/raw/`, parses, joins on SOC codes, scores, and writes `src/data/occupations.json` and `src/data/sources.json`. Cached files are re-validated and reused, so a re-run with the same inputs produces byte-identical JSON |
| `npm run build:index -- --refresh` | Same, but re-downloads every source (at most one request per 1.1 s) |
| `npm run dev` | Astro dev server |
| `npm run build` | Writes the press stat pack (`public/stat-pack/`), renders the OG verdict cards (`og:cards`), then runs `astro build` into `dist/` |
| `npm run preview` | Serves `dist/` |
| `npm run og:cards` | Renders a 1200×630 terminal-style verdict PNG per occupation (title, OBS score, band, BLS category chip, index mark) plus the site card into `public/og/`. Deterministic and idempotent: unchanged cards are not rewritten, stale ones are removed |
| `npm run test` | vitest: deterministic OBS recomputation from a fixture, join sanity (SOC codes, never titles), coverage flags, manifest completeness, page content, OG cards, sitemap/robots, licensing credits and red-list discipline (plus a scan of `dist/` for local URLs, red-list mentions and raw data files when a build exists) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run verify` | Post-build checks on `dist/`: every page and score component, every citation resolving to `sources.json`, leaderboard order, stat pack, methodology quotes, share meta on every page, every `og:image` present as a 1200×630 PNG, a sitemap listing every page, robots.txt, no `localhost`/`127.0.0.1` URLs anywhere in the output, licensing credits on `/about/`, WEF and layoffs.fyi only as labeled cite-only links, and no raw data files beyond the stat pack |

The full gate is `npm run test`, `npm run typecheck`, `npm run build` and `npm run verify`. All four must exit 0. `build` does not run the pipeline: the generated JSON is committed, so Netlify never downloads from BLS.

## Layout

- `scripts/build-index.mjs` and `scripts/lib/`: the pipeline (`config` pins, `download`, `zip`, `parse`, `join`, `score`, `select`, `emit`).
- `src/data/occupations.json`, `src/data/sources.json`: generated and committed. Every field is `{ value, sourceId }`.
- `src/pages/index.astro` (leaderboard), `src/pages/occupations/[slug].astro` (one page per occupation), `methodology`, `press`, `changelog`, `about`.
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
- Exposure is never presented as job loss. The disclaimer appears on every occupation page, and BLS's interpretation limits are quoted verbatim on the methodology page, along with Microsoft's out-of-scope warning.
- The official BLS category is always shown beside the OBS score and attributed to BLS.
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
- Fonts: JetBrains Mono, IBM Plex Mono and Atkinson Hyperlegible (SIL Open Font License), served by Google Fonts. The OG cards are rendered with the system's monospace fallback when those fonts are not installed, so card typography can differ between Windows and Netlify's Linux build image.

## Museum cross-links and the embed widget

- `src/data/precedents.ts` maps SOC codes to Museum of Extinct Jobs exhibits. Occupation pages render them as "Historical precedent: The … thought so too" links built from `MUSEUM_BASE_URL` at the top of that file. `tests/crosslinks-embed.test.ts` checks every exhibit slug against the sibling `../museum-of-extinct-jobs` checkout when it is present.
- `/embed/` (`src/pages/embed.astro`) is a self-contained, iframe-able ticker and score lookup for the leaderboard occupations. It uses inline CSS and vanilla inline JS over embedded JSON, makes no third-party requests, and shows the copy-paste iframe snippet with an attribution link. When framed, the snippet section hides itself.

## Deploy (Netlify from GitHub)

1. Push this repository to GitHub.
2. In Netlify, choose **Add new site → Import an existing project** and pick the repository.
3. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, `NODE_VERSION = "22.22.0"`. The build writes the stat pack and OG cards itself; it does not download source data.
4. Point the `humanobsolescenceindex.com` domain at the site. `site` in `astro.config.mjs` sets the absolute URLs used in canonical links, `og:image`, `sitemap.xml` and `robots.txt`.
