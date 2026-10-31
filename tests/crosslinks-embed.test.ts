import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { META, OCCUPATIONS, leaderboard } from '../src/lib/data';
import { MUSEUM_BASE_URL, MUSEUM_PRECEDENTS, museumExhibitUrl, precedentHeadline } from '../src/data/precedents';
import { EMBED_PATH, embedEntries, embedJson, embedSnippet } from '../src/lib/embed';
import { sitePaths } from '../src/lib/seo';

const root = join(__dirname, '..');
const site = new URL('https://humanobsolescenceindex.com');
// The museum repo is a sibling checkout; its committed exhibits.ts drives its /exhibits/[slug]/ pages.
// MUSEUM_REPO_DIR overrides the location (point it at a missing directory to simulate a standalone checkout).
const museumRoot = process.env.MUSEUM_REPO_DIR ?? join(root, '..', 'museum-of-extinct-jobs');
const museumExhibits = join(museumRoot, 'src', 'data', 'exhibits.ts');
const museumAiWing = join(museumRoot, 'src', 'data', 'ai-wing.ts');

describe('museum precedents (Index data)', () => {
  it('defines the museum production origin once, without a trailing slash or a local host', () => {
    expect(MUSEUM_BASE_URL).toBe('https://museumofextinctjobs.com');
    expect(MUSEUM_BASE_URL).not.toMatch(/\/$|localhost|127\.0\.0\.1/);
  });

  it('covers the launch mappings with the intended exhibits', () => {
    const exhibitFor = (soc: string) => MUSEUM_PRECEDENTS[soc]?.exhibit.slug;
    expect(exhibitFor('43-4051')).toBe('switchboard-operator');
    expect(exhibitFor('43-4171')).toBe('switchboard-operator');
    expect(exhibitFor('15-1252')).toBe('human-computer');
    expect(exhibitFor('27-3091')).toBe('telegraph-operator');
    expect(exhibitFor('43-6012')).toBe('typesetter');
    expect(exhibitFor('13-2011')).toBe('human-computer');
    expect(exhibitFor('27-4021')).toBe('typesetter');
    expect(exhibitFor('27-2011')).toBe('lector');
    expect(exhibitFor('23-2011')).toBe('typesetter');
    expect(exhibitFor('27-1013')).toBe('typesetter');
  });

  it('renders "Historical precedent: The … thought so too" headlines and absolute exhibit URLs', () => {
    for (const p of Object.values(MUSEUM_PRECEDENTS)) {
      expect(precedentHeadline(p)).toMatch(/^Historical precedent: The [A-Z][\w ]+ thought so too$/);
      expect(museumExhibitUrl(p.exhibit)).toBe(`https://museumofextinctjobs.com/exhibits/${p.exhibit.slug}/`);
      expect(p.why.trim().length).toBeGreaterThan(20);
    }
  });
});

// Vitest runs skipped suite factories during collection, so sibling files are read in beforeAll, never in the factory.
describe.skipIf(!existsSync(museumExhibits))('museum precedents resolve against the museum repo', () => {
  let exhibits: { slug: string; name: string }[];
  beforeAll(() => {
    const source = readFileSync(museumExhibits, 'utf8');
    exhibits = [...source.matchAll(/slug: '([^']+)',\s*name: (['"])(.+?)\2,/g)].map((m) => ({ slug: m[1], name: m[3] }));
  });

  it('reads the museum exhibit list', () => {
    expect(exhibits.length).toBe(23);
  });

  it.each([...new Set(Object.values(MUSEUM_PRECEDENTS).map((p) => p.exhibit))].map((e) => [e.slug, e] as const))(
    '%s is an exhibit page the museum builds, with a matching name',
    (slug, exhibit) => {
      const target = exhibits.find((e) => e.slug === slug);
      expect(target, `museum has no exhibit ${slug}`).toBeDefined();
      expect(target!.name).toBe(exhibit.name);
    },
  );
});

describe.skipIf(!existsSync(museumAiWing))('museum AI-wing links point at Index pages', () => {
  let links: { soc: string; title: string; slug: string }[];
  let source: string;
  beforeAll(() => {
    source = readFileSync(museumAiWing, 'utf8');
    links = [...source.matchAll(/indexCrosslink: \{\s*soc: '([^']+)',\s*title: '([^']+)',\s*slug: '([^']+)'/g)].map((m) => ({
      soc: m[1],
      title: m[2],
      slug: m[3],
    }));
  });

  it('finds the museum links and every one matches a published occupation', () => {
    expect(links.length).toBe(10);
    for (const l of links) {
      const o = OCCUPATIONS.find((x) => x.soc === l.soc);
      expect(o, `SOC ${l.soc}`).toBeDefined();
      expect(o!.slug).toBe(l.slug);
      expect(o!.title).toBe(l.title);
    }
  });

  it('force-includes every SOC the museum links as a museum precedent, with no gaps left', () => {
    expect(source).not.toMatch(/indexGap:/);
    const linked = [...source.matchAll(/soc: '(\d{2}-\d{4})'/g)].map((m) => m[1]);
    expect(linked.length).toBeGreaterThanOrEqual(10);
    for (const soc of linked) {
      expect(META.forcedInclusions.museumPrecedent.socs, soc).toContain(soc);
      expect(OCCUPATIONS.find((o) => o.soc === soc)?.inclusion, soc).toContain('museum-precedent');
    }
  });
});

describe('embed widget', () => {
  it('ships the full board, ranked, with absolute occupation URLs', () => {
    const entries = embedEntries(site);
    expect(entries).toHaveLength(leaderboard().length);
    expect(entries).toHaveLength(META.leaderboard.size);
    entries.forEach((e, i) => {
      expect(e.r).toBe(i + 1);
      expect(e.u).toMatch(/^https:\/\/humanobsolescenceindex\.com\/occupations\/[a-z0-9-]+\/$/);
    });
    expect(entries[0].o).toBe(leaderboard()[0].scores.obs.value);
  });

  it('keeps the inline JSON small and script-safe', () => {
    const json = embedJson(embedEntries(site));
    expect(json).not.toContain('<');
    expect(json.length).toBeLessThan(40_000);
    expect(JSON.parse(json)).toHaveLength(META.leaderboard.size);
  });

  it('gives a copy-paste iframe snippet with an attribution link home', () => {
    const snippet = embedSnippet(site);
    expect(snippet).toContain('<iframe src="https://humanobsolescenceindex.com/embed/"');
    expect(snippet).toMatch(/title="[^"]+"/);
    expect(snippet).toContain('<a href="https://humanobsolescenceindex.com/">Human Obsolescence Index</a>');
  });

  it('is a page in the sitemap and uses no framework or external script', () => {
    expect(sitePaths()).toContain(EMBED_PATH);
    const page = readFileSync(join(root, 'src/pages/embed.astro'), 'utf8');
    expect(page).not.toMatch(/<script[^>]*\ssrc=/);
    expect(page).not.toMatch(/fonts\.googleapis|BaseLayout|<link rel="stylesheet"/);
    expect(page).toContain('<script is:inline>');
    expect(page).not.toMatch(/fetch\(|XMLHttpRequest/);
  });
});

describe('embed typography', () => {
  it('self-hosts Anton and Archivo with no third-party font request', () => {
    const src = readFileSync(join(__dirname, '..', 'src/pages/embed.astro'), 'utf8');
    for (const [family, file] of [['Anton', 'anton-latin.woff2'], ['Archivo', 'archivo-latin.woff2']]) {
      expect(src).toMatch(new RegExp(`@font-face \\{ font-family: '${family}';[^}]*url\\(/fonts/${file}\\)`));
      const bytes = readFileSync(join(__dirname, '..', 'public/fonts', file));
      expect(bytes.subarray(0, 4).toString('latin1')).toBe('wOF2');
    }
    expect(src).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
