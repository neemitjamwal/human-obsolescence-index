import { WEIGHTS } from './config.mjs';

/**
 * Percentile rank in [0, 1] for each non-null value: (averageRank - 1) / (n - 1), where ties share the
 * average of the ranks they span. Nulls stay null and are excluded from n.
 */
export function percentileRanks(values) {
  const present = values.map((v, i) => ({ v, i })).filter((x) => x.v != null && Number.isFinite(x.v));
  present.sort((a, b) => a.v - b.v);
  const out = values.map(() => null);
  const n = present.length;
  for (let start = 0; start < n; ) {
    let end = start;
    while (end + 1 < n && present[end + 1].v === present[start].v) end++;
    const avgRank = (start + end) / 2 + 1;
    const p = n === 1 ? 0.5 : (avgRank - 1) / (n - 1);
    for (let k = start; k <= end; k++) out[present[k].i] = p;
    start = end + 1;
  }
  return out;
}

/** Many O*NET rows can map to one SOC code; the Eloundou β is collapsed by unweighted mean (O*NET has no per-code employment). */
export function aggregateBeta(betas) {
  const vals = betas.filter((b) => b != null && Number.isFinite(b));
  return vals.length ? vals.reduce((s, b) => s + b, 0) / vals.length : null;
}

/**
 * rows: [{ msft, eld, changePercent }] for the whole universe (percentiles are taken within it).
 * Exposure = 100·(0.5·P_MSFT + 0.5·P_ELD); with one component it is 100·P of that component alone.
 * Trajectory = 100·P(−ΔEmp%). OBS = round(0.65·Exposure + 0.35·Trajectory).
 */
export function computeScores(rows) {
  const pMsft = percentileRanks(rows.map((r) => r.msft));
  const pEld = percentileRanks(rows.map((r) => r.eld));
  const pTraj = percentileRanks(rows.map((r) => (r.changePercent == null ? null : -r.changePercent)));
  return rows.map((_, i) => {
    const missing = [];
    if (pMsft[i] == null) missing.push('microsoft');
    if (pEld[i] == null) missing.push('eloundou');
    if (pTraj[i] == null) missing.push('employmentChange');
    let exposure = null;
    if (pMsft[i] != null && pEld[i] != null) exposure = 100 * (WEIGHTS.microsoft * pMsft[i] + WEIGHTS.eloundou * pEld[i]);
    else if (pMsft[i] != null) exposure = 100 * pMsft[i];
    else if (pEld[i] != null) exposure = 100 * pEld[i];
    const trajectory = pTraj[i] == null ? null : 100 * pTraj[i];
    const obs =
      exposure == null || trajectory == null ? null : Math.round(WEIGHTS.exposure * exposure + WEIGHTS.trajectory * trajectory);
    return { pMsft: pMsft[i], pEld: pEld[i], pTrajectory: pTraj[i], exposure, trajectory, obs, missing };
  });
}
