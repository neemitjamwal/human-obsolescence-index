const nf = new Intl.NumberFormat('en-US');

export function formatJobs(n: number | null | undefined): string {
  return n == null ? 'not published' : nf.format(n);
}

export function formatUsd(n: number | null | undefined): string {
  return n == null ? 'not published' : `$${nf.format(n)}`;
}

/** Signed percent with a true minus sign: −21.4%, +2.7%, 0%. */
export function formatSignedPercent(n: number | null | undefined): string {
  if (n == null) return 'not published';
  if (n === 0) return '0%';
  return `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export function formatSignedJobs(n: number | null | undefined): string {
  if (n == null) return 'not published';
  if (n === 0) return '0';
  return `${n > 0 ? '+' : '−'}${nf.format(Math.abs(n))}`;
}

/** A 0-1 percentile rank shown as a 0-100 percentile ("99th"). */
export function formatPercentile(p: number | null | undefined): string {
  if (p == null) return 'n/a';
  const v = Math.round(p * 1000) / 10;
  return `${v.toLocaleString('en-US', { maximumFractionDigits: 1 })}`;
}

export function formatScore(n: number | null | undefined, digits = 2): string {
  return n == null ? 'n/a' : n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export function formatMillions(n: number): string {
  return `${(n / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })} million`;
}

export type ChangeTone = 'decline' | 'growth' | 'flat';

/** Projected employment change: decline reads as doom (red), growth as relief (green). */
export function changeTone(pct: number | null | undefined): ChangeTone {
  if (pct == null || pct === 0) return 'flat';
  return pct < 0 ? 'decline' : 'growth';
}

export function changeGlyph(tone: ChangeTone): string {
  return tone === 'decline' ? '▼' : tone === 'growth' ? '▲' : '■';
}
