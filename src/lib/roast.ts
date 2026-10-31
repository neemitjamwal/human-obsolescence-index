import { ROASTS, ROAST_CONDITIONS, type RoastPlaceholder, type RoastTemplate } from '../data/roasts';
import { formatJobs, formatScore, formatSignedPercent, formatUsd } from './format';
import type { Verdict } from './verdicts';

export type RenderedRoast = { id: string; text: string; values: Partial<Record<RoastPlaceholder, string>> };

const PLACEHOLDER = /\{(\w+)\}/g;

/** The display string for each placeholder, straight from the verdict; null when the data is missing. */
export function roastValue(v: Verdict, field: RoastPlaceholder): string | null {
  switch (field) {
    case 'obs':
      return String(v.obs);
    case 'exposure':
      return v.exposure == null ? null : formatScore(v.exposure);
    case 'projectedChangePct':
      return v.projectedChangePct == null ? null : formatSignedPercent(v.projectedChangePct);
    case 'employment':
      return v.employment == null ? null : formatJobs(v.employment);
    case 'medianWage':
      return v.medianWage == null ? null : formatUsd(v.medianWage);
    case 'blsCategory':
      return v.blsCategory;
  }
}

export function placeholders(text: string): RoastPlaceholder[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1] as RoastPlaceholder);
}

function fill(t: RoastTemplate, v: Verdict): RenderedRoast | null {
  const values: Partial<Record<RoastPlaceholder, string>> = {};
  for (const field of placeholders(t.text)) {
    const value = roastValue(v, field);
    if (value == null) return null;
    values[field] = value;
  }
  return { id: t.id, text: t.text.replace(PLACEHOLDER, (_, f: RoastPlaceholder) => values[f]!), values };
}

/** Every roast that fits this verdict: its band's templates plus any whose data condition holds. */
export function roastOptions(v: Verdict, bank: RoastTemplate[] = ROASTS): RenderedRoast[] {
  const conditions = new Set(ROAST_CONDITIONS.filter((c) => c.test(v)).map((c) => c.id));
  return bank
    .filter((t) => (t.band ? t.band === v.band : t.when ? conditions.has(t.when) : false))
    .map((t) => fill(t, v))
    .filter((r): r is RenderedRoast => r != null);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** One roast per occupation, picked deterministically by SOC code so pages, cards and shares agree. */
export function renderRoast(v: Verdict, bank: RoastTemplate[] = ROASTS): RenderedRoast {
  const options = roastOptions(v, bank);
  if (!options.length) throw new Error(`no roast fits ${v.soc} (band ${v.band})`);
  return options[hash(v.soc) % options.length];
}
