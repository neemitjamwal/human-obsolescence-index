import { writeFileSync } from 'node:fs';
import { ADJACENT_ROLES, CONTRAST_SOCS, EDITION, LEADERBOARD, MUSEUM_PRECEDENT_SOCS, TASKS_PER_OCCUPATION, WEIGHTS } from './config.mjs';

const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const r4 = (x) => (x == null ? null : Math.round(x * 10000) / 10000);
const thousandsToJobs = (x) => (x == null ? null : Math.round(x * 1000));

const COVERAGE_MESSAGES = {
  microsoft:
    'Microsoft Working-with-AI publishes no applicability score for this occupation; Exposure uses the Eloundou β percentile alone.',
  eloundou:
    'No GPTs-are-GPTs β rating maps to this occupation through the BLS crosswalk; Exposure uses the Microsoft percentile alone.',
  employmentChange: 'BLS publishes no projected employment change for this occupation; no Trajectory or OBS can be computed.',
  blsCategory: 'BLS assigns no official AI exposure category to this occupation.',
  oes: 'OEWS May 2025 has no national estimate for this SOC code; employment-threshold and wage context are unavailable.',
  medianWage: 'OEWS publishes no median annual wage for this occupation (suppressed or top-coded).',
  tasks: 'O*NET 31.0 lists fewer than three task statements for this occupation.',
  adjacentRoles: 'Fewer than two O*NET related occupations have positive BLS projected growth.',
};

const primaryFirst = (codes) => [...codes].sort((a, b) => Number(b.endsWith('.00')) - Number(a.endsWith('.00')) || a.localeCompare(b));

/** Core tasks first, then by O*NET importance rating; secondary O*NET codes only fill a short primary list. */
export function pickTasks(onetCodes, tasksByOnet) {
  const out = [];
  for (const code of primaryFirst(onetCodes)) {
    if (out.length >= TASKS_PER_OCCUPATION.min) break;
    const tasks = [...(tasksByOnet.get(code) ?? [])].sort(
      (a, b) =>
        Number(b.type === 'Core') - Number(a.type === 'Core') ||
        (b.importance ?? -1) - (a.importance ?? -1) ||
        Number(a.id) - Number(b.id),
    );
    for (const t of tasks) {
      if (out.length >= TASKS_PER_OCCUPATION.max) break;
      out.push({ id: t.id, text: t.text, type: t.type, importance: t.importance, onetCode: code, sourceId: 'onet-31' });
    }
  }
  return out;
}

/** O*NET related occupations, mapped to SOC by code via the crosswalk, kept only if BLS projects growth. */
export function pickAdjacentRoles(u, relatedByOnet, onetToSoc, bySoc, selectedSocs) {
  const out = [];
  const seen = new Set([u.soc]);
  for (const code of primaryFirst(u.onetCodes)) {
    for (const rel of relatedByOnet.get(code) ?? []) {
      if (out.length >= ADJACENT_ROLES.max) return out;
      const soc = onetToSoc.get(rel.onet);
      if (!soc || seen.has(soc)) continue;
      const v = bySoc.get(soc);
      if (!v || !(v.ep.changePercent > 0)) continue;
      seen.add(soc);
      out.push({
        soc,
        title: v.title,
        slug: v.slug,
        onIndex: selectedSocs.has(soc),
        onetCode: rel.onet,
        relatedness: rel.tier,
        sourceId: 'onet-31',
        projectedChangePercent: { value: v.ep.changePercent, sourceId: 'bls-ep' },
        obs: { value: v.scores.obs, sourceId: 'hoi-composite' },
      });
    }
  }
  return out;
}

function coverageOf(u, tasks, adjacent) {
  const missing = [...u.scores.missing];
  if (!u.blsCategory) missing.push('blsCategory');
  if (!u.oes) missing.push('oes');
  else if (u.oes.medianAnnual == null) missing.push('medianWage');
  if (tasks && tasks.length < TASKS_PER_OCCUPATION.min) missing.push('tasks');
  if (adjacent && adjacent.length < ADJACENT_ROLES.min) missing.push('adjacentRoles');
  return {
    complete: missing.length === 0,
    missing,
    notes: missing.map((field) => ({ field, message: COVERAGE_MESSAGES[field] })),
  };
}

export function occupationPayload(u, ctx) {
  const { onet, crosswalk, bySoc, selectedSocs, reasons, leaderboardRank, rank } = ctx;
  const tasks = pickTasks(u.onetCodes, onet.tasksByOnet);
  const adjacentRoles = pickAdjacentRoles(u, onet.relatedByOnet, crosswalk.onetToSoc, bySoc, selectedSocs);
  const s = u.scores;
  const both = s.pMsft != null && s.pEld != null;
  const exposureSources = [s.pMsft != null && 'msft-ai-applicability', s.pEld != null && 'openai-gpts-are-gpts', s.pEld != null && 'bls-crosswalk'].filter(Boolean);
  return {
    soc: u.soc,
    slug: u.slug,
    title: u.title,
    titleSourceId: 'bls-ep',
    rank,
    leaderboardRank: leaderboardRank.get(u.soc) ?? null,
    inclusion: reasons.get(u.soc),
    scores: {
      obs: { value: s.obs, sourceId: 'hoi-composite', inputs: ['exposure', 'trajectory'] },
      exposure: { value: r2(s.exposure), sourceId: 'hoi-composite', inputs: exposureSources },
      trajectory: { value: r2(s.trajectory), sourceId: 'hoi-composite', inputs: ['bls-ep'] },
    },
    components: {
      microsoft: {
        label: 'Microsoft AI applicability score (observed Copilot usage)',
        raw: u.msft,
        percentile: r4(s.pMsft),
        weight: s.pMsft == null ? 0 : both ? WEIGHTS.microsoft : 1,
        sourceId: 'msft-ai-applicability',
      },
      eloundou: {
        label: 'Eloundou et al. β exposure (theoretical LLM exposure)',
        raw: u.eld == null ? null : r4(u.eld),
        percentile: r4(s.pEld),
        weight: s.pEld == null ? 0 : both ? WEIGHTS.eloundou : 1,
        onetCodes: u.eldOnetCodes,
        aggregation: u.eldOnetCodes.length > 1 ? 'unweighted mean of mapped O*NET-SOC rows' : null,
        sourceId: 'openai-gpts-are-gpts',
        crosswalkSourceId: 'bls-crosswalk',
      },
      employmentChange: {
        label: 'BLS projected employment change, percent, 2025–35 (negated for Trajectory)',
        raw: u.ep.changePercent,
        percentile: r4(s.pTrajectory),
        sourceId: 'bls-ep',
      },
    },
    blsCategory: { value: u.blsCategory, sourceId: 'bls-ai-exposure' },
    employment: { value: thousandsToJobs(u.ep.emp2025), year: 2025, sourceId: 'bls-ep' },
    oesEmployment: { value: u.oes?.totEmp ?? null, reference: 'May 2025', sourceId: 'bls-oews' },
    projectedChange: {
      numeric: { value: thousandsToJobs(u.ep.changeNumeric), sourceId: 'bls-ep' },
      percent: { value: u.ep.changePercent, sourceId: 'bls-ep' },
      employment2035: { value: thousandsToJobs(u.ep.emp2035), sourceId: 'bls-ep' },
    },
    openings: { value: thousandsToJobs(u.ep.openings), period: '2025–35 annual average', sourceId: 'bls-ep' },
    medianWage: {
      value: u.oes?.medianAnnual ?? null,
      topCoded: u.oes?.medianTopCoded ?? false,
      reference: 'May 2025, annual',
      sourceId: 'bls-oews',
    },
    oohUrl: { value: u.oohUrl, sourceId: 'bls-crosswalk' },
    tasks,
    adjacentRoles,
    coverage: coverageOf(u, tasks, adjacentRoles),
  };
}

export function universeEntry(u) {
  const s = u.scores;
  return {
    soc: u.soc,
    slug: u.slug,
    title: u.title,
    blsCategory: u.blsCategory,
    msft: u.msft,
    eld: u.eld,
    changePercent: u.ep.changePercent,
    oesEmployment: u.oes?.totEmp ?? null,
    pMsft: r4(s.pMsft),
    pEld: r4(s.pEld),
    pTrajectory: r4(s.pTrajectory),
    exposure: r2(s.exposure),
    trajectory: r2(s.trajectory),
    obs: s.obs,
    missing: coverageOf(u, null, null).missing,
  };
}

export function buildMeta({ universe, selection, fastestDeclining, downloads, microsoftOutsideUniverse = [] }) {
  const count = (pred) => universe.filter(pred).length;
  const dataAsOf = Object.values(downloads)
    .map((d) => d.retrievedAt.slice(0, 10))
    .sort()
    .pop();
  return {
    edition: EDITION,
    dataAsOf,
    formula: {
      exposure: 'Exposure = 100 × (0.50 × P_MSFT + 0.50 × P_ELD); with one component available, 100 × that percentile alone',
      trajectory: 'Trajectory = 100 × percentile rank of (−1 × BLS projected employment change %, 2025–35)',
      obs: 'OBS = round(0.65 × Exposure + 0.35 × Trajectory)',
      weights: WEIGHTS,
      percentile:
        'Percentile rank within the EP universe among occupations that have the measure: (average rank − 1) / (n − 1), ties share their average rank.',
      eloundouAggregation:
        'Eloundou dv_rating_beta is reported per O*NET-SOC code; codes are mapped to SOC 2018 with the BLS crosswalk and collapsed by unweighted mean (O*NET publishes no per-code employment to weight by).',
      rounding: 'Math.round (halves round up); Exposure and Trajectory are stored to 2 decimals, OBS uses unrounded inputs.',
    },
    universe: {
      size: universe.length,
      source: 'BLS EP Table 1.2, Occupation type = Line item',
      microsoftCovered: count((u) => u.msft != null),
      microsoftMissing: count((u) => u.msft == null),
      // Microsoft scores SOC codes BLS does not project (e.g. 11-1031 Legislators); they cannot join the universe.
      microsoftOutsideUniverse,
      eloundouCovered: count((u) => u.eld != null),
      bothExposureComponents: count((u) => u.msft != null && u.eld != null),
      oesCovered: count((u) => u.oes != null),
      blsCategoryCovered: count((u) => u.blsCategory != null),
      obsScored: count((u) => u.scores.obs != null),
    },
    leaderboard: {
      rule: `Top ${LEADERBOARD.size} by OBS among occupations with OEWS May 2025 employment ≥ ${LEADERBOARD.minOesEmployment.toLocaleString('en-US')} (absolute jobs)`,
      minOesEmployment: LEADERBOARD.minOesEmployment,
      size: LEADERBOARD.size,
      eligible: selection.eligibleCount,
      cutoffObs: selection.cutoff,
    },
    forcedInclusions: {
      fastestDeclining: { source: 'BLS EP Table 1.5, Fastest declining occupations', sourceId: 'bls-ep', socs: fastestDeclining },
      contrast: { reason: 'Low-OBS, high-visibility occupations kept for honest contrast', socs: CONTRAST_SOCS },
      museumPrecedent: {
        reason: 'Occupations the Museum of Extinct Jobs AI wing links to, tracked so every museum link has a page',
        socs: MUSEUM_PRECEDENT_SOCS,
      },
    },
    selectedCount: selection.selected.length,
    universeFieldSources: {
      title: 'bls-ep',
      blsCategory: 'bls-ai-exposure',
      msft: 'msft-ai-applicability',
      eld: 'openai-gpts-are-gpts',
      changePercent: 'bls-ep',
      oesEmployment: 'bls-oews',
      pMsft: 'hoi-composite',
      pEld: 'hoi-composite',
      pTrajectory: 'hoi-composite',
      exposure: 'hoi-composite',
      trajectory: 'hoi-composite',
      obs: 'hoi-composite',
    },
  };
}

/** The composite is our own derived number; it gets a manifest entry so every sourceId resolves. */
export function compositeSource(meta) {
  return {
    id: 'hoi-composite',
    name: 'Human Obsolescence Index composite (Exposure, Trajectory, OBS)',
    publisher: 'Human Obsolescence Index',
    url: '/methodology/',
    retrievedAt: meta.dataAsOf,
    sha256: null,
    derivedFrom: ['msft-ai-applicability', 'openai-gpts-are-gpts', 'bls-crosswalk', 'bls-ep'],
    license: 'CC BY 4.0 (derived data; upstream licenses apply)',
    citation: `Human Obsolescence Index, ${meta.edition} edition. Computed from BLS Employment Projections 2025–35, Microsoft Working-with-AI, and Eloundou et al. (2024). Formula: ${meta.formula.obs}.`,
  };
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
