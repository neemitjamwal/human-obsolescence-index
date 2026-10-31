export const TOP_N = 50;

export const CSV_COLUMNS = [
  'rank',
  'soc_code',
  'occupation',
  'obs_score',
  'exposure',
  'trajectory',
  'microsoft_percentile',
  'eloundou_beta_percentile',
  'bls_projected_change_pct_2025_35',
  'bls_relative_ai_exposure',
  'employment_2025',
  'median_annual_wage_may_2025',
  'page_url',
  'source_ids',
];

/** RFC 4180 field quoting. */
export function csvField(value) {
  if (value == null) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function topOccupations(data, n = TOP_N) {
  return data.occupations
    .filter((o) => o.leaderboardRank != null)
    .sort((a, b) => a.leaderboardRank - b.leaderboardRank)
    .slice(0, n);
}

export function buildTopCsv(data, siteUrl, n = TOP_N) {
  const base = siteUrl.replace(/\/$/, '');
  const rows = topOccupations(data, n).map((o) => [
    o.leaderboardRank,
    o.soc,
    o.title,
    o.scores.obs.value,
    o.scores.exposure.value,
    o.scores.trajectory.value,
    o.components.microsoft.percentile,
    o.components.eloundou.percentile,
    o.projectedChange.percent.value,
    o.blsCategory.value,
    o.employment.value,
    o.medianWage.value,
    `${base}/occupations/${o.slug}/`,
    'hoi-composite;msft-ai-applicability;openai-gpts-are-gpts;bls-crosswalk;bls-ep;bls-ai-exposure;bls-oews',
  ]);
  return [CSV_COLUMNS, ...rows].map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}

export function buildReadme(data, siteUrl) {
  const { edition, dataAsOf } = data.meta;
  return [
    `Human Obsolescence Index stat pack, ${edition} edition (data as of ${dataAsOf})`,
    '',
    'hoi-top50.csv  The top 50 leaderboard occupations with OBS score, components and BLS context.',
    'sources.json   The source manifest: URL, retrieval date, SHA-256, license and citation for every input.',
    '',
    'Exposure measures what AI can do to an occupation\'s tasks, not whether the job disappears.',
    `Formula and limits: ${siteUrl.replace(/\/$/, '')}/methodology/`,
    '',
    'Attribution: BLS Employment Projections, AI exposure categories and OEWS (U.S. public domain);',
    'O*NET 31.0 Database by USDOL/ETA (CC BY 4.0); Microsoft Research Working with AI (CC BY 4.0);',
    'Eloundou et al., GPTs are GPTs (MIT). Composite scores: CC BY 4.0, cite the Human Obsolescence Index.',
    '',
  ].join('\r\n');
}
