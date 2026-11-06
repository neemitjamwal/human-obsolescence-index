import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { corpusNumbers, dataNumbers, mockingMatches, panicLineProblems, plainText, scanNumbers } from '../scripts/lib/panic-scan.mjs';
import { ALL_COPY, HEADLINES, NAMED_HEADLINES, ROAST_LITERAL_NUMBERS, ROBOT_LINES, STINGERS } from '../src/data/roasts';
import { META, nextEdition } from '../src/lib/data';
import { boardEmployment } from '../src/lib/press';

// VAL-RX-008: the robot-uprising layer may panic, but it may not invent numbers or mock workers.
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

/** Where an Index number may come from: the generated data, the source register and the restated museum facts. */
function allowedNumbers(): Set<string> {
  const json = ['src/data/verdicts.json', 'src/data/occupations.json', 'src/data/sources.json'].map((p) => JSON.parse(read(p)));
  const register = ['src/data/references.ts', 'src/data/credits.ts', 'src/data/precedents.ts'].map(read);
  // Two numbers the pages derive from data rather than copy: the next edition label and the board's total jobs.
  const derived = [nextEdition(META.edition), (boardEmployment() / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })];
  return new Set([...dataNumbers(json), ...corpusNumbers([...register, ...derived])]);
}

function walkHtml(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walkHtml(full) : full.endsWith('.html') ? [full] : [];
  });
}

describe('panic copy banks', () => {
  it('headlines, stingers and robot lines carry no numbers, predictions, real names or quotes', () => {
    const bad = [...HEADLINES, ...NAMED_HEADLINES, ...STINGERS, ...ROBOT_LINES].flatMap((l) => panicLineProblems(l.text).map((p) => `${l.id}: ${p}`));
    expect(bad).toEqual([]);
  });

  it('roast templates carry only data placeholders and the allowed literals', () => {
    const bad = ALL_COPY.flatMap((l) => panicLineProblems(l.text.replace(/\{\w+\}/g, ''), ROAST_LITERAL_NUMBERS).map((p) => `${l.id}: ${p}`));
    expect(bad).toEqual([]);
  });

  it('no copy line mocks the worker', () => {
    expect(ALL_COPY.flatMap((l) => mockingMatches(l.text).map((m) => `${l.id}: ${m.match}`))).toEqual([]);
  });
});

describe('scanner', () => {
  it('flags invented stats and worker mockery, and ignores decimals and pixel sizes', () => {
    const allowed = new Set(['2025', '21.4']);
    const hits = scanNumbers('Robots will take 47% of jobs by 2030. BLS projects −21.4% from 2025. 0.1946 and 1080 × 1920.');
    expect(hits.filter((h) => !allowed.has(h.value!)).map((h) => `${h.kind} ${h.value}`)).toEqual(['percentage 47', 'year 2030']);
    expect(scanNumbers('2,666,000 jobs').map((h) => h.value)).toEqual(['2666000']);
    expect(mockingMatches('Lazy workers had it coming').length).toBeGreaterThan(0);
    expect(mockingMatches('The robots want your tasks, not your desk.')).toEqual([]);
    expect(panicLineProblems('OpenAI says 40% of jobs will disappear by 2030')).toHaveLength(4);
  });
});

describe.skipIf(!existsSync(join(dist, 'index.html')))('panic-copy honesty in the built Index', () => {
  it('every number next to a job count, percentage or year traces to the data or the source register', () => {
    const allowed = allowedNumbers();
    const untraceable = new Map<string, string>();
    const counts = { 'job count': 0, percentage: 0, year: 0 } as Record<string, number>;
    const matched = new Map<string, number>();
    let pages = 0;
    for (const file of walkHtml(dist)) {
      pages += 1;
      for (const h of scanNumbers(plainText(readFileSync(file, 'utf8')))) {
        counts[h.kind] += 1;
        const key = `${h.kind} ${h.value}`;
        if (allowed.has(h.value!)) matched.set(key, (matched.get(key) ?? 0) + 1);
        else if (!untraceable.has(key)) untraceable.set(key, `${file.slice(dist.length + 1)}: …${h.context}…`);
      }
    }
    console.log(
      `Index panic scan: ${pages} pages, ${counts['job count']} job counts, ${counts.percentage} percentages, ${counts.year} years; ` +
        `${matched.size} distinct values matched to data/sources: ${[...matched.keys()].sort().join(', ')}\n` +
        `untraceable: ${JSON.stringify([...untraceable.entries()])}`,
    );
    expect([...untraceable.entries()]).toEqual([]);
  });

  it('no rendered copy mocks the people doing the job', () => {
    const hits: string[] = [];
    for (const file of walkHtml(dist)) {
      for (const m of mockingMatches(plainText(readFileSync(file, 'utf8')))) hits.push(`${file.slice(dist.length + 1)}: ${m.match} (…${m.context}…)`);
    }
    console.log(`Index worker-mocking matches: ${JSON.stringify(hits)}`);
    expect(hits).toEqual([]);
  });
});
