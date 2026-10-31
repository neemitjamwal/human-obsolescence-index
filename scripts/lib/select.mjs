import { CONTRAST_SOCS, LEADERBOARD } from './config.mjs';

export const byObsDesc = (a, b) =>
  (b.scores.obs ?? -1) - (a.scores.obs ?? -1) || (b.scores.exposure ?? -1) - (a.scores.exposure ?? -1) || a.soc.localeCompare(b.soc);

/**
 * Leaderboard = top N by OBS among occupations with OEWS employment >= 50,000 (absolute).
 * Forced inclusions: every EP Table 1.5 fastest-declining occupation and the contrast picks.
 */
export function selectOccupations(universe, fastestDeclining) {
  const bySoc = new Map(universe.map((u) => [u.soc, u]));
  const eligible = universe.filter((u) => u.scores.obs != null && (u.oes?.totEmp ?? 0) >= LEADERBOARD.minOesEmployment);
  const leaderboard = [...eligible].sort(byObsDesc).slice(0, LEADERBOARD.size);
  const cutoff = leaderboard[leaderboard.length - 1].scores.obs;

  const reasons = new Map();
  const add = (soc, reason) => {
    if (!bySoc.has(soc)) throw new Error(`selection: ${soc} (${reason}) is not in the EP universe`);
    if (!reasons.has(soc)) reasons.set(soc, []);
    reasons.get(soc).push(reason);
  };
  leaderboard.forEach((u) => add(u.soc, 'leaderboard'));
  for (const soc of fastestDeclining) add(soc, 'fastest-declining');
  const badContrast = CONTRAST_SOCS.filter((soc) => !(bySoc.get(soc)?.scores.obs < cutoff));
  if (badContrast.length) {
    const detail = badContrast.map((soc) => `${soc} (OBS ${bySoc.get(soc)?.scores.obs ?? 'n/a'})`).join(', ');
    throw new Error(`selection: contrast picks must score below the leaderboard cutoff ${cutoff}: ${detail}`);
  }
  for (const soc of CONTRAST_SOCS) add(soc, 'contrast');
  const selected = [...reasons.keys()].map((soc) => bySoc.get(soc)).sort(byObsDesc);
  const leaderboardRank = new Map(leaderboard.map((u, i) => [u.soc, i + 1]));
  return { selected, reasons, leaderboardRank, cutoff, eligibleCount: eligible.length };
}
