// Pinned inputs for the quarterly Index build. Bump the dated pins (oesm25 -> oesm26 in spring 2027,
// EP 2025-35 -> 2026-36 in late Aug 2027, db_31_0 -> next O*NET release) on each quarterly run.

export const EDITION = '2026-Q4';

export const SOURCES = [
  {
    id: 'bls-ai-exposure',
    file: 'ai-exposure-categories.xlsx',
    kind: 'xlsx',
    url: 'https://www.bls.gov/emp/ind-occ-matrix/ai-exposure-categories.xlsx',
    name: 'BLS AI exposure categories and 2025–35 employment projections',
    publisher: 'U.S. Bureau of Labor Statistics, Employment Projections program',
    methodologyUrl: 'https://www.bls.gov/emp/publications/ai-exposure-categories.htm',
    license: 'U.S. public domain (17 U.S.C. § 105)',
    licenseUrl: 'https://www.bls.gov/opub/copyright-information.htm',
    citation:
      'U.S. Bureau of Labor Statistics, Employment Projections program. "AI exposure categories and 2025–35 employment projections" (ai-exposure-categories.xlsx). https://www.bls.gov/emp/ind-occ-matrix/ai-exposure-categories.xlsx',
  },
  {
    id: 'bls-ep',
    file: 'occupation.xlsx',
    kind: 'xlsx',
    url: 'https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx',
    name: 'BLS Employment Projections 2025–35, occupation tables (Table 1.2, Table 1.5)',
    publisher: 'U.S. Bureau of Labor Statistics, Employment Projections program',
    methodologyUrl: 'https://www.bls.gov/emp/tables.htm',
    license: 'U.S. public domain (17 U.S.C. § 105)',
    licenseUrl: 'https://www.bls.gov/opub/copyright-information.htm',
    citation:
      'U.S. Bureau of Labor Statistics, Employment Projections program. "Occupational projections, 2025–35, and worker characteristics, 2025" (Table 1.2) and "Fastest declining occupations" (Table 1.5), occupation.xlsx. https://www.bls.gov/emp/ind-occ-matrix/occupation.xlsx',
  },
  {
    id: 'bls-oews',
    file: 'oesm25nat.zip',
    kind: 'zip',
    zipEntry: 'national_M2025_dl.xlsx',
    url: 'https://www.bls.gov/oes/special-requests/oesm25nat.zip',
    name: 'BLS Occupational Employment and Wage Statistics, May 2025 national estimates',
    publisher: 'U.S. Bureau of Labor Statistics, OEWS program',
    methodologyUrl: 'https://www.bls.gov/oes/',
    license: 'U.S. public domain (17 U.S.C. § 105)',
    licenseUrl: 'https://www.bls.gov/opub/copyright-information.htm',
    citation:
      'U.S. Bureau of Labor Statistics. Occupational Employment and Wage Statistics, May 2025 National Occupational Employment and Wage Estimates (oesm25nat.zip). https://www.bls.gov/oes/special-requests/oesm25nat.zip',
  },
  {
    id: 'bls-crosswalk',
    file: 'nem-onet-to-soc-crosswalk.xlsx',
    kind: 'xlsx',
    url: 'https://www.bls.gov/emp/classifications-crosswalks/nem-onet-to-soc-crosswalk.xlsx',
    name: 'BLS O*NET-SOC to National Employment Matrix crosswalk',
    publisher: 'U.S. Bureau of Labor Statistics, Office of Occupational Statistics and Employment Projections',
    methodologyUrl: 'https://www.bls.gov/emp/classifications-crosswalks/',
    license: 'U.S. public domain (17 U.S.C. § 105)',
    licenseUrl: 'https://www.bls.gov/opub/copyright-information.htm',
    citation:
      'U.S. Bureau of Labor Statistics. "O*NET-SOC to National Employment Matrix (NEM) crosswalk" (nem-onet-to-soc-crosswalk.xlsx). https://www.bls.gov/emp/classifications-crosswalks/nem-onet-to-soc-crosswalk.xlsx',
  },
  {
    id: 'msft-ai-applicability',
    file: 'ai_applicability_scores.csv',
    kind: 'csv',
    expectedHeader: 'SOC Code,title,ai_applicability_score',
    url: 'https://raw.githubusercontent.com/microsoft/working-with-ai/main/ai_applicability_scores.csv',
    name: 'Microsoft Research "Working with AI" AI applicability scores',
    publisher: 'Microsoft Research',
    methodologyUrl: 'https://arxiv.org/abs/2507.07935',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    citation:
      'Tomlinson, K., Jaffe, S., Wang, W., Counts, S., & Suri, S. (2026). "Working with AI: Measuring the Applicability of Generative AI to Occupations." NeurIPS 2026. arXiv:2507.07935. Data: github.com/microsoft/working-with-ai (CC BY 4.0).',
  },
  {
    id: 'openai-gpts-are-gpts',
    file: 'occ_level.csv',
    kind: 'csv',
    expectedHeader:
      'O*NET-SOC Code,Title,dv_rating_alpha,dv_rating_beta,dv_rating_gamma,human_rating_alpha,human_rating_beta,human_rating_gamma',
    url: 'https://raw.githubusercontent.com/openai/GPTs-are-GPTs/main/data/occ_level.csv',
    name: 'Eloundou et al. "GPTs are GPTs" occupation-level exposure (dv_rating_beta)',
    publisher: 'OpenAI / University of Pennsylvania',
    methodologyUrl: 'https://doi.org/10.1126/science.adj0998',
    license: 'MIT',
    licenseUrl: 'https://github.com/openai/GPTs-are-GPTs/blob/main/LICENSE',
    citation:
      'Eloundou, T., Manning, S., Mishkin, P., & Rock, D. (2024). "GPTs are GPTs: Labor market impact potential of LLMs." Science 384, 1306–1308. Data: github.com/openai/GPTs-are-GPTs (MIT).',
  },
  {
    id: 'onet-31',
    file: 'db_31_0_text.zip',
    kind: 'zip',
    url: 'https://www.onetcenter.org/dl_files/database/db_31_0_text.zip',
    name: 'O*NET 31.0 Database (Task Statements, Task Ratings, Related Occupations)',
    publisher: 'National Center for O*NET Development, U.S. Department of Labor, Employment and Training Administration',
    methodologyUrl: 'https://www.onetcenter.org/database.html',
    license: 'CC BY 4.0',
    licenseUrl: 'https://www.onetcenter.org/license_db.html',
    citation:
      'This site incorporates information from the O*NET 31.0 Database (https://www.onetcenter.org/database.html) by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA.',
  },
];

export const SOURCE_IDS = Object.fromEntries(SOURCES.map((s) => [s.id, s.id]));

export const WEIGHTS = { microsoft: 0.5, eloundou: 0.5, exposure: 0.65, trajectory: 0.35 };

export const LEADERBOARD = { minOesEmployment: 50000, size: 120 };

// Low-OBS, high-visibility occupations kept on the board as honest contrast picks.
export const CONTRAST_SOCS = ['29-1141', '47-2111', '33-3051', '47-2152'];

export const TASKS_PER_OCCUPATION = { min: 3, max: 5 };
export const ADJACENT_ROLES = { min: 2, max: 4 };
