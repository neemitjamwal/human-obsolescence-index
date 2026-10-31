import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { META, OCCUPATIONS, SOURCES, alsoTracked, leaderboard, nextEdition, occupationSourceIds, sourceById } from '../src/lib/data';
import { quotableStats, steepestDecliners, tickerEntries } from '../src/lib/press';
import { changeTone, formatPercentile, formatSignedPercent } from '../src/lib/format';
import { BLS_LIMITS, SOURCE_SHORT } from '../src/data/references';
import { MUSEUM_PRECEDENTS } from '../src/data/precedents';
import { CSV_COLUMNS, buildTopCsv, csvField } from '../scripts/lib/stat-pack.mjs';

const root = join(__dirname, '..');
const sourceIds = new Set(SOURCES.map((s) => s.id));

describe('leaderboard model', () => {
  const board = leaderboard();

  it('lists the configured board size in rank order with non-increasing OBS', () => {
    expect(board).toHaveLength(META.leaderboard.size);
    board.forEach((o, i) => expect(o.leaderboardRank).toBe(i + 1));
    for (let i = 1; i < board.length; i++) {
      expect(board[i].scores.obs.value!).toBeLessThanOrEqual(board[i - 1].scores.obs.value!);
    }
    expect(board.at(-1)!.scores.obs.value).toBe(META.leaderboard.cutoffObs);
  });

  it('tracks every selected occupation exactly once across board and off-board lists', () => {
    const all = [...board, ...alsoTracked()].map((o) => o.slug);
    expect(new Set(all).size).toBe(OCCUPATIONS.length);
    expect(OCCUPATIONS.length).toBe(META.selectedCount);
  });

  it('builds a ticker from real data only', () => {
    const items = tickerEntries();
    const top = board[0];
    expect(items.some((t) => t.label === top.title.toUpperCase() && t.value === `OBS ${top.scores.obs.value}`)).toBe(true);
    const [steepest] = steepestDecliners(1);
    expect(items.some((t) => t.value === formatSignedPercent(steepest.projectedChange.percent.value))).toBe(true);
    expect(items.some((t) => /pending|placeholder/i.test(t.label))).toBe(false);
  });
});

describe('occupation pages cite resolvable sources', () => {
  it.each(OCCUPATIONS.map((o) => [o.slug, o] as const))('%s', (_slug, o) => {
    const ids = occupationSourceIds(o);
    for (const id of ids) expect(sourceIds.has(id)).toBe(true);
    for (const id of ['hoi-composite', 'msft-ai-applicability', 'openai-gpts-are-gpts', 'bls-ep', 'bls-ai-exposure']) {
      expect(ids).toContain(id);
    }
    expect(o.tasks.length).toBeGreaterThanOrEqual(3);
    expect(o.adjacentRoles.length).toBeGreaterThanOrEqual(2);
    expect(o.adjacentRoles.length).toBeLessThanOrEqual(4);
    for (const r of o.adjacentRoles) expect(r.projectedChangePercent.value).toBeGreaterThan(0);
  });

  it('has a short citation label for every source', () => {
    for (const s of SOURCES) expect(SOURCE_SHORT[s.id]).toBeTruthy();
    expect(() => sourceById('not-a-source')).toThrow();
  });

  it('maps museum precedents only onto occupations the Index publishes', () => {
    for (const soc of Object.keys(MUSEUM_PRECEDENTS)) expect(OCCUPATIONS.some((o) => o.soc === soc)).toBe(true);
  });
});

describe('press kit', () => {
  it('gives every quotable stat at least one resolvable source', () => {
    const stats = quotableStats();
    expect(stats.length).toBeGreaterThanOrEqual(5);
    for (const s of stats) {
      expect(s.sourceIds.length).toBeGreaterThan(0);
      for (const id of s.sourceIds) expect(sourceIds.has(id)).toBe(true);
      expect(s.text).not.toMatch(/will be replaced|will disappear/i);
    }
    expect(stats.find((s) => s.id === 'microsoft-coverage')!.text).toContain(String(META.universe.microsoftMissing));
  });

  it('builds the top-50 CSV in leaderboard order', () => {
    const data = JSON.parse(readFileSync(join(root, 'src/data/occupations.json'), 'utf8'));
    const lines = buildTopCsv(data, 'https://example.org/').trimEnd().split('\r\n');
    expect(lines).toHaveLength(51);
    expect(lines[0]).toBe(CSV_COLUMNS.join(','));
    const board = leaderboard().slice(0, 50);
    lines.slice(1).forEach((line, i) => {
      expect(line.startsWith(`${i + 1},${board[i].soc},`)).toBe(true);
      expect(line).toContain(`https://example.org/occupations/${board[i].slug}/`);
    });
  });

  it('quotes CSV fields that need it', () => {
    expect(csvField('a, b')).toBe('"a, b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField(null)).toBe('');
    expect(csvField(3.5)).toBe('3.5');
  });
});

describe('helpers', () => {
  it('formats signed changes and percentiles', () => {
    expect(formatSignedPercent(-21.4)).toBe('−21.4%');
    expect(formatSignedPercent(2.7)).toBe('+2.7%');
    expect(formatSignedPercent(null)).toBe('not published');
    expect(formatPercentile(0.9911)).toBe('99.1');
    expect(changeTone(-1)).toBe('decline');
    expect(changeTone(3)).toBe('growth');
    expect(nextEdition('2026-Q4')).toBe('2027-Q1');
    expect(nextEdition('2027-Q2')).toBe('2027-Q3');
  });
});

const workbook = join(root, '.cache/raw/ai-exposure-categories.xlsx');
describe.skipIf(!existsSync(workbook))('BLS interpretation limits are verbatim', () => {
  it('match the text in the cached BLS workbook', async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(workbook);
    const cells: string[] = [];
    for (const ws of wb.worksheets) {
      ws.eachRow((row) => {
        for (const v of row.values as unknown[]) if (typeof v === 'string') cells.push(v);
      });
    }
    const normalized = cells.map((c) => c.replace(/\s+/g, ' ').trim());
    expect(normalized).toContain(BLS_LIMITS.tableNote);
    expect(normalized).toContain(BLS_LIMITS.wageNote);
    expect(normalized.some((c) => c.includes(BLS_LIMITS.fieldDescription))).toBe(true);
  });
});
