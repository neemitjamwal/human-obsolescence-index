import { leaderboard, META, OCCUPATIONS, UNIVERSE, occupationPath, type Occupation } from './data';
import { formatJobs, formatMillions, formatSignedPercent } from './format';
import { BLS_CATEGORIES, type BlsCategory } from './ledger';

export type QuotableStat = { id: string; text: string; sourceIds: string[]; href?: string };

const byChangeAsc = (a: Occupation, b: Occupation) =>
  (a.projectedChange.percent.value ?? Infinity) - (b.projectedChange.percent.value ?? Infinity);

/** Tracked occupations with the steepest BLS projected declines. */
export function steepestDecliners(n: number): Occupation[] {
  return OCCUPATIONS.filter((o) => (o.projectedChange.percent.value ?? 0) < 0)
    .sort(byChangeAsc)
    .slice(0, n);
}

export function categoryCounts(): Record<BlsCategory, number> {
  const out = Object.fromEntries(BLS_CATEGORIES.map((c) => [c, 0])) as Record<BlsCategory, number>;
  for (const u of UNIVERSE) if (u.blsCategory) out[u.blsCategory] += 1;
  return out;
}

export function boardEmployment(): number {
  return leaderboard().reduce((sum, o) => sum + (o.employment.value ?? 0), 0);
}

export function quotableStats(): QuotableStat[] {
  const board = leaderboard();
  const top = board[0];
  const [steepest] = steepestDecliners(1);
  const counts = categoryCounts();
  const veryHighOnBoard = board.filter((o) => o.blsCategory.value === 'Very high').length;
  const nurses = OCCUPATIONS.find((o) => o.soc === '29-1141');
  const u = META.universe;

  const stats: QuotableStat[] = [
    {
      id: 'top-score',
      text: `${top.title} rank #1 on the ${META.edition} Human Obsolescence Index with an OBS score of ${top.scores.obs.value} out of 100.`,
      sourceIds: ['hoi-composite'],
      href: occupationPath(top.slug),
    },
    {
      id: 'top-projection',
      text: `BLS projects employment of ${top.title.toLowerCase()} to change ${formatSignedPercent(top.projectedChange.percent.value)} between 2025 and 2035, from ${formatJobs(top.employment.value)} jobs.`,
      sourceIds: ['bls-ep'],
      href: occupationPath(top.slug),
    },
    {
      id: 'steepest-decline',
      text: `The steepest projected decline among tracked occupations: ${steepest.title.toLowerCase()}, ${formatSignedPercent(steepest.projectedChange.percent.value)} from 2025 to 2035.`,
      sourceIds: ['bls-ep'],
      href: occupationPath(steepest.slug),
    },
    {
      id: 'bls-very-high',
      text: `BLS rates ${counts['Very high']} of ${u.size} occupations "Very high" relative AI exposure, its top category. BLS states that exposure does not imply job loss.`,
      sourceIds: ['bls-ai-exposure'],
    },
    {
      id: 'board-very-high',
      text: `${veryHighOnBoard} of the ${board.length} occupations on the leaderboard are also rated "Very high" by BLS.`,
      sourceIds: ['hoi-composite', 'bls-ai-exposure'],
    },
    {
      id: 'board-employment',
      text: `The ${board.length} leaderboard occupations accounted for about ${formatMillions(boardEmployment())} jobs in 2025.`,
      sourceIds: ['bls-ep', 'hoi-composite'],
    },
    {
      id: 'microsoft-coverage',
      text: `${u.microsoftMissing} of ${u.size} occupations have no Microsoft AI applicability score. The index flags them and gives them no OBS score rather than guessing.`,
      sourceIds: ['msft-ai-applicability', 'hoi-composite'],
      href: '/methodology/#coverage',
    },
  ];
  if (nurses) {
    stats.push({
      id: 'contrast-nurses',
      text: `For contrast: registered nurses score ${nurses.scores.obs.value} on the OBS, and BLS projects their employment to change ${formatSignedPercent(nurses.projectedChange.percent.value)} from 2025 to 2035.`,
      sourceIds: ['hoi-composite', 'bls-ep'],
      href: occupationPath(nurses.slug),
    });
  }
  return stats;
}

export type TickerEntry = { label: string; value: string; tone: 'alert' | 'phosphor' | 'dim'; glyph: string };

/** Ticker feed: the board's top scores interleaved with the steepest BLS projected declines. */
export function tickerEntries(): TickerEntry[] {
  const top = leaderboard().slice(0, 6).map<TickerEntry>((o) => ({
    label: o.title.toUpperCase(),
    value: `OBS ${o.scores.obs.value}`,
    tone: 'alert',
    glyph: '▲',
  }));
  const falling = steepestDecliners(6).map<TickerEntry>((o) => ({
    label: `${o.title.toUpperCase()} · BLS 2025–35`,
    value: formatSignedPercent(o.projectedChange.percent.value),
    tone: 'alert',
    glyph: '▼',
  }));
  const mixed: TickerEntry[] = [{ label: 'HUMAN RESOURCES DEPRECIATING SINCE 1767', value: '', tone: 'dim', glyph: '■' }];
  for (let i = 0; i < Math.max(top.length, falling.length); i++) {
    if (top[i]) mixed.push(top[i]);
    if (falling[i]) mixed.push(falling[i]);
  }
  mixed.push({ label: 'AI EXPOSURE ≠ JOB LOSS · READ THE METHODOLOGY', value: '', tone: 'dim', glyph: '■' });
  return mixed;
}
