import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import occupations from '../src/data/occupations.json';
import sourcesFile from '../src/data/sources.json';
import { BATTLE_PAIRS } from '../src/data/battles';
import { MUSEUM_PRECEDENTS } from '../src/data/precedents';
import { BANNED_ROAST_PHRASES, WORKER_MOCKING_PHRASES } from '../src/data/roasts';
import { VERDICTS, VERDICTS_META, verdictBySlug, type Verdict } from '../src/lib/verdicts';
import { MISLABELS } from './score-labels.test';

const root = join(__dirname, '..');
const kitPath = join(root, 'launch', 'LAUNCH-KIT.md');
const kit = readFileSync(kitPath, 'utf8').replace(/\r\n/g, '\n');
const [beforeLedger, rest] = kit.split('<!-- stat-ledger:start -->');
const [ledgerBlock, afterLedger] = (rest ?? '').split('<!-- stat-ledger:end -->');
const body = `${beforeLedger}\n${afterLedger ?? ''}`;

/** Body text with link targets, URLs and structural counters (Day 3, Hook 4, Shot 2, (1/8), 0:02, 9am ET) removed. */
export function statText(md: string): string {
  return md
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\]\([^)]*\)/g, '] ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/`[^`\n]*\.(md|ts|json|mjs)`/g, ' ')
    .replace(/\b(Day|Hook|Shot)\s+\d+\b/g, ' ')
    .replace(/\(\d+\/\d+\)/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?=\s*[\u2013)-]|\s*(am|pm)\b)/gi, ' ')
    .replace(/\b\d{1,2}(:\d{2})?\s?(am|pm)\b/gi, ' ')
    .replace(/^\s*\d+\.\s/gm, ' ');
}

/** Every number in the text, as printed: 2025\u201335, 2,666,000, \u221221.4%, +2%, 99/100, $35,450, 96.42, 31.0. */
export function numberTokens(text: string): string[] {
  return [...text.matchAll(/\d{4}\u2013\d{2}(?!\d)|[\u2212+]?\$?\d{1,3}(?:,\d{3})+(?:\.\d+)?%?|[\u2212+]?\$?\d+(?:\.\d+)?(?:%|\/100)?/g)].map((m) => m[0]);
}

/** The numeric value a printed token claims (sign, $, commas, % and /100 stripped). */
export function parsePrinted(token: string): number {
  const neg = token.startsWith('\u2212');
  const n = Number(token.replace(/^[\u2212+]/, '').replace(/[$,%]/g, '').replace(/\/100$/, ''));
  return neg ? -n : n;
}

type Row = { printed: string; what: string; ref: string; source: string };

function ledgerRows(block: string): Row[] {
  return block
    .split('\n')
    .filter((l) => l.startsWith('|') && !/^\|\s*(Printed|---)/.test(l))
    .map((l) => {
      const cells = l.split('|').slice(1, -1).map((c) => c.trim());
      return { printed: cells[0], what: cells[1], ref: cells[2].replace(/`/g, ''), source: cells[3] };
    });
}

const SOURCES = (sourcesFile as { sources: { id: string; name: string; url: string }[] }).sources;
const META = (occupations as { meta: { formula: { weights: Record<string, number> } } }).meta;
const museumRoot = process.env.MUSEUM_REPO_DIR ?? join(root, '..', 'museum-of-extinct-jobs');

/** Resolves a ledger reference against the committed data; returns null when the printed value matches. */
function checkRow(row: Row): string | null {
  const [kind, arg] = [row.ref.split(':')[0], row.ref.slice(row.ref.indexOf(':') + 1)];
  const value = parsePrinted(row.printed);
  const fail = (why: string) => `${row.printed} (${row.ref}): ${why}`;
  if (row.ref === 'verdicts.meta.count') return value === VERDICTS_META.count ? null : fail(`data says ${VERDICTS_META.count}`);
  if (row.ref === 'verdicts.meta.published') return value === VERDICTS_META.published ? null : fail(`data says ${VERDICTS_META.published}`);
  if (row.ref === 'projection-end') {
    const ep = SOURCES.find((s) => s.id === 'bls-ep')!;
    return ep.name.includes('2025\u201335') && row.printed === '2035' ? null : fail('not the end of the BLS 2025\u201335 projection');
  }
  switch (kind) {
    case 'verdict': {
      const [slug, field] = arg.split('.');
      const v = verdictBySlug(slug);
      if (!v) return fail('no such verdict');
      const actual = v[field as keyof Verdict];
      if (typeof actual !== 'number') return fail(`field ${field} is not a number`);
      if (actual !== value) return fail(`data says ${actual}`);
      if (field === 'obs' && !row.printed.endsWith('/100')) return fail('Doom Scores are printed as N/100');
      if (field === 'projectedChangePct' && actual !== 0 && !/^[\u2212+]/.test(row.printed)) return fail('projected change must carry its sign');
      return null;
    }
    case 'scale': {
      const ok = row.printed === '100' && VERDICTS.every((v) => v.obs >= 0 && v.obs <= 100) && VERDICTS[0].obs < 100;
      return ok ? null : fail('not the Doom Score scale');
    }
    case 'band-count': {
      const n = VERDICTS.filter((v) => v.band === arg).length;
      return n === value ? null : fail(`data says ${n}`);
    }
    case 'weight': {
      const w = META.formula.weights[arg];
      return w != null && Math.round(w * 100) === value && row.printed.endsWith('%') ? null : fail(`weight is ${w}`);
    }
    case 'source': {
      const s = SOURCES.find((x) => x.id === arg);
      return s && s.name.includes(row.printed) ? null : fail(`not in the name of source ${arg}`);
    }
    case 'precedent': {
      const p = Object.values(MUSEUM_PRECEDENTS).find((x) => x.exhibit.slug === arg);
      return p && p.exhibit.context.includes(row.printed) ? null : fail(`not in the ${arg} exhibit context`);
    }
    default:
      return fail('unknown reference kind');
  }
}

const rows = ledgerRows(ledgerBlock ?? '');

describe('launch kit components', () => {
  it('exists at launch/LAUNCH-KIT.md with a stat ledger', () => {
    expect(existsSync(kitPath)).toBe(true);
    expect(rows.length).toBeGreaterThan(20);
  });

  it('has one Show HN post, three subreddit-specific Reddit posts, an X thread, a LinkedIn post and a Product Hunt listing', () => {
    expect(kit.match(/^## Hacker News: Show HN$/gm)).toHaveLength(1);
    expect(kit).toMatch(/\*\*Title:\*\* Show HN: /);
    const reddit = [...kit.matchAll(/^### Reddit post: (r\/\w+)$/gm)].map((m) => m[1]);
    expect(reddit).toHaveLength(3);
    expect(new Set(reddit).size).toBe(3);
    for (const sub of reddit) {
      const section = kit.split(`### Reddit post: ${sub}`)[1].split(/\n### |\n## /)[0];
      expect(section, sub).toMatch(/\*\*Rules to respect:\*\*/);
      expect(section, sub).toMatch(/\bI (made|built)\b|\[OC\]/);
    }
    expect(kit.match(/^## X thread$/gm)).toHaveLength(1);
    const tweets = kit.split('## X thread')[1].split('\n## ')[0].match(/^\(\d+\/8\)/gm) ?? [];
    expect(tweets).toHaveLength(8);
    expect(kit.match(/^## LinkedIn post$/gm)).toHaveLength(1);
    expect(kit.match(/^## Product Hunt listing$/gm)).toHaveLength(1);
    for (const field of ['Name', 'Tagline', 'Description', 'Gallery', "Maker's first comment"]) expect(kit).toContain(`**${field}`);
  });

  it('has 10 short-video hooks, each with a hook line and a shot list of at least 4 shots', () => {
    const hooks = kit.split('## Short-video hooks')[1].split('\n## ')[0].split(/^### Hook \d+: /m).slice(1);
    expect(hooks).toHaveLength(10);
    hooks.forEach((h, i) => {
      expect(h, `hook ${i + 1}`).toContain('**Hook line:**');
      expect(h, `hook ${i + 1}`).toContain('**Shot list:**');
      expect((h.match(/^\s+- Shot \d+ /gm) ?? []).length, `hook ${i + 1}`).toBeGreaterThanOrEqual(4);
    });
  });

  it('has three press pitch emails (tech, labor, local) with subjects', () => {
    const pitches = [...kit.matchAll(/^### Pitch: (tech|labor|local) desk$/gm)].map((m) => m[1]);
    expect(pitches).toEqual(['tech', 'labor', 'local']);
    expect(kit.split('## Press pitch emails')[1].split('\n## ')[0].match(/^\*\*Subject:\*\*/gm)).toHaveLength(3);
  });

  it('has a 14-day posting schedule, one row per day', () => {
    const days = [...kit.split('## Two-week posting schedule')[1].matchAll(/^\| Day (\d+) \|/gm)].map((m) => Number(m[1]));
    expect(days).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });
});

describe('launch kit stats trace to data', () => {
  it('every number in the kit is in the stat ledger (nothing untraceable)', () => {
    const printed = new Set(rows.map((r) => r.printed));
    const tokens = numberTokens(statText(body));
    const untraceable = [...new Set(tokens.filter((t) => !printed.has(t)))];
    console.log(`launch kit: ${tokens.length} numbers scanned, ${new Set(tokens).size} distinct, untraceable: ${JSON.stringify(untraceable)}`);
    expect(untraceable).toEqual([]);
  });

  it('every ledger value matches verdicts.json / occupations.json / sources.json / precedent data exactly', () => {
    const report = rows.map((r) => `${r.printed} ← ${r.ref}: ${checkRow(r) ?? 'ok'}`);
    console.log(`launch kit ledger:\n  ${report.join('\n  ')}`);
    expect(rows.map(checkRow).filter(Boolean)).toEqual([]);
  });

  it('every ledger row is used in the kit and links its source', () => {
    const tokens = new Set(numberTokens(statText(body)));
    for (const r of rows) {
      expect(numberTokens(r.printed), r.printed).toEqual([r.printed]);
      expect(tokens.has(r.printed), `${r.printed} is in the ledger but not in the kit`).toBe(true);
      expect(r.source, r.printed).toMatch(/\]\(https:\/\/[^)]+\)/);
      if (r.ref.startsWith('verdict:')) expect(r.source).toContain(`(https://humanobsolescenceindex.com/v/${r.ref.slice(8).split('.')[0]}/)`);
    }
  });

  it('links only to verdicts, battles and museum pages that exist', () => {
    const verdictLinks = [...kit.matchAll(/humanobsolescenceindex\.com\/v\/([a-z0-9-]+)\//g)].map((m) => m[1]);
    const battleLinks = [...kit.matchAll(/humanobsolescenceindex\.com\/vs\/([a-z0-9-]+)\//g)].map((m) => m[1]);
    const exhibitLinks = [...kit.matchAll(/museumofextinctjobs\.com\/exhibits\/([a-z0-9-]+)\//g)].map((m) => m[1]);
    const obituaryLinks = [...kit.matchAll(/museumofextinctjobs\.com\/obituary\/([a-z0-9-]+)\//g)].map((m) => m[1]);
    expect(verdictLinks.length).toBeGreaterThan(10);
    for (const s of verdictLinks) expect(verdictBySlug(s), s).toBeDefined();
    for (const b of battleLinks) expect(BATTLE_PAIRS.map((p) => p.join('-vs-')), b).toContain(b);
    const exhibits = new Set(Object.values(MUSEUM_PRECEDENTS).map((p) => p.exhibit.slug));
    for (const e of exhibitLinks) expect(exhibits.has(e), e).toBe(true);
    for (const o of obituaryLinks) expect(verdictBySlug(o) ?? exhibits.has(o), o).toBeTruthy();
  });
});

describe('launch kit honesty', () => {
  it('says AI exposure \u2260 job loss and links the methodology', () => {
    expect((kit.match(/AI exposure \u2260 job loss/g) ?? []).length).toBeGreaterThanOrEqual(8);
    expect(kit).toContain('https://humanobsolescenceindex.com/methodology/');
  });

  it('never mocks workers, never claims the job is lost, never calls a Doom Score "exposure"', () => {
    const text = body.replace(/\s+/g, ' ');
    const hits = [...BANNED_ROAST_PHRASES, ...WORKER_MOCKING_PHRASES, ...MISLABELS].filter((re) => re.test(text)).map(String);
    expect(hits).toEqual([]);
  });

  it('uses no red-list numbers and quotes no real person or company', () => {
    expect(body).not.toMatch(/weforum|layoffs\.fyi|Frey|Osborne/i);
    expect(body).not.toMatch(/\b(said|says|told us|according to (the )?CEO)\b/i);
    expect(body).not.toMatch(/[\u201C"][^\u201D"\n]{3,}[\u201D"]\s*[\u2014\u2013-]\s*[A-Z][a-z]+ [A-Z][a-z]+/);
  });

  it('leans into the robot-uprising hook', () => {
    expect(kit).toMatch(/ROBOT UPRISING/);
    expect((kit.match(/robot/gi) ?? []).length).toBeGreaterThan(15);
  });
});

describe('launch kit scanner', () => {
  it('extracts the formats the kit prints and strips structural counters', () => {
    expect(numberTokens('BLS projects \u221221.4% and +2% for 2,666,000 jobs, 99/100, 2025\u201335, 96.42, $35,450')).toEqual([
      '\u221221.4%', '+2%', '2,666,000', '99/100', '2025\u201335', '96.42', '$35,450',
    ]);
    expect(numberTokens(statText('Day 3 | Hook 4 | Shot 2 (0:00\u20130:02) (1/8) at 9am ET or 12:01am PT [x](https://a.b/v/c-1/)'))).toEqual([]);
    expect(parsePrinted('\u221221.4%')).toBe(-21.4);
    expect(parsePrinted('2,666,000')).toBe(2666000);
  });

  it('would catch an invented stat', () => {
    const printed = new Set(rows.map((r) => r.printed));
    expect(numberTokens(statText('Robots will take 47% of jobs by 2030')).filter((t) => !printed.has(t))).toEqual(['47%', '2030']);
    expect(checkRow({ printed: '98/100', what: '', ref: 'verdict:telemarketers.obs', source: '' })).not.toBeNull();
  });
});
