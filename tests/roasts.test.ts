import { describe, expect, it } from 'vitest';
import { BANNED_ROAST_PHRASES, ROASTS, ROAST_CONDITIONS, ROAST_LITERAL_NUMBERS } from '../src/data/roasts';
import { formatJobs, formatScore, formatSignedPercent, formatUsd } from '../src/lib/format';
import { SCORE_BANDS } from '../src/lib/ledger';
import { placeholders, renderRoast, roastOptions } from '../src/lib/roast';
import { VERDICTS, type Verdict } from '../src/lib/verdicts';

const NUMBER = /[−+-]?\$?\d+(?:,\d{3})*(?:\.\d+)?%?/g;
const ALLOWED = new Set(['obs', 'exposure', 'projectedChangePct', 'employment', 'medianWage', 'blsCategory']);

/** Every number the verdict can legitimately print, formatted exactly as the renderer formats it. */
function dataNumbers(v: Verdict): Set<string> {
  return new Set(
    [
      String(v.obs),
      v.exposure == null ? null : formatScore(v.exposure),
      v.projectedChangePct == null ? null : formatSignedPercent(v.projectedChangePct),
      v.employment == null ? null : formatJobs(v.employment),
      v.medianWage == null ? null : formatUsd(v.medianWage),
    ].filter((x): x is string => x != null),
  );
}

describe('roast copy bank', () => {
  it('covers every band with at least two templates, and every condition with one', () => {
    for (const band of SCORE_BANDS) expect(ROASTS.filter((t) => t.band === band).length, band).toBeGreaterThanOrEqual(2);
    for (const c of ROAST_CONDITIONS) expect(ROASTS.some((t) => t.when === c.id), c.id).toBe(true);
    expect(ROASTS.find((t) => t.when === 'tasks-not-desk')!.text).toContain('the robots want your tasks, not your desk'.replace(/^t/, 'T'));
  });

  it('templates use only known placeholders and no hard-coded data numbers', () => {
    for (const t of ROASTS) {
      for (const p of placeholders(t.text)) expect(ALLOWED.has(p), `${t.id} {${p}}`).toBe(true);
      const literals = t.text.replace(/\{\w+\}/g, '').match(/\d+/g) ?? [];
      for (const n of literals) expect(ROAST_LITERAL_NUMBERS, `${t.id} literal ${n}`).toContain(n);
      expect(t.text).toMatch(/Doom Score \{obs\}/);
      expect(Boolean(t.band) !== Boolean(t.when), t.id).toBe(true);
    }
  });

  it('never insults workers or claims the job is lost', () => {
    for (const t of ROASTS) for (const re of BANNED_ROAST_PHRASES) expect(t.text, `${t.id} ${re}`).not.toMatch(re);
  });

  it('the banned list catches the phrases it exists for', () => {
    for (const bad of ['You are useless', "you're obsolete", 'Learn to code', 'you will lose your job', 'This job is dead', 'lazy workers']) {
      expect(BANNED_ROAST_PHRASES.some((re) => re.test(bad)), bad).toBe(true);
    }
  });

  it('never labels the Doom Score as exposure', () => {
    for (const t of ROASTS) {
      expect(t.text).not.toMatch(/\{obs\}\s*(\/\s*100)?\s*(%\s*)?(AI[- ])?expos/i);
      expect(t.text).not.toMatch(/expos(ure|ed)\s*[·:=]?\s*\{obs\}/i);
    }
  });
});

describe('rendered roasts for all 784 verdicts', () => {
  it('render one roast per verdict, deterministic per SOC', () => {
    for (const v of VERDICTS) {
      const r = renderRoast(v);
      expect(r.text.length).toBeGreaterThan(20);
      expect(renderRoast(v)).toEqual(r);
      expect(r.text).not.toMatch(/\{|\}|undefined|null|NaN|not published/);
    }
  });

  it('every number in every possible roast equals the verdict data', () => {
    const bad: string[] = [];
    for (const v of VERDICTS) {
      const allowed = dataNumbers(v);
      for (const r of roastOptions(v)) {
        for (const n of r.text.match(NUMBER) ?? []) {
          const bare = n.replace(/^[+−-]/, '');
          if (!allowed.has(n) && !ROAST_LITERAL_NUMBERS.includes(bare)) bad.push(`${v.soc} ${r.id}: "${n}"`);
        }
        expect(r.text).toContain(`Doom Score ${v.obs}`);
        if (r.values.exposure) expect(r.values.exposure).toBe(formatScore(v.exposure));
        if (r.values.projectedChangePct) expect(r.values.projectedChangePct).toBe(formatSignedPercent(v.projectedChangePct));
        if (r.values.employment) expect(r.values.employment).toBe(formatJobs(v.employment));
        if (r.values.blsCategory) expect(r.values.blsCategory).toBe(v.blsCategory);
      }
    }
    expect(bad).toEqual([]);
  });

  it('conditions fire only when the data says so', () => {
    for (const v of VERDICTS) {
      const ids = new Set(roastOptions(v).map((r) => r.id));
      if (ids.has('tasks-not-desk')) expect((v.exposure ?? 0) >= 80 && (v.projectedChangePct ?? 0) > 0).toBe(true);
      if (ids.has('declining-high') || ids.has('declining-low')) expect(v.projectedChangePct!).toBeLessThan(0);
      for (const r of roastOptions(v)) {
        const t = ROASTS.find((x) => x.id === r.id)!;
        if (t.band) expect(t.band).toBe(v.band);
      }
    }
    const ds = VERDICTS.find((v) => v.slug === 'data-scientists')!;
    expect(roastOptions(ds).map((r) => r.id)).toContain('tasks-not-desk');
  });

  it('no rendered roast insults the worker', () => {
    for (const v of VERDICTS) for (const r of roastOptions(v)) for (const re of BANNED_ROAST_PHRASES) expect(r.text).not.toMatch(re);
  });
});
