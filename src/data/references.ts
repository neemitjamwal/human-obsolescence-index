/**
 * Text quoted verbatim from the BLS file itself (ai-exposure-categories.xlsx, sourceId bls-ai-exposure).
 * tests/site-content.test.ts re-reads the cached workbook and fails if either string drifts.
 */
export const BLS_LIMITS = {
  /** "Field Descriptions" sheet, introductory paragraph. */
  fieldDescription:
    'This supplemental table provides information about how occupations compare to one another based on their theoretical and observed exposure to AI. BLS combined five publicly available data sources to create a four-category classification of relative AI exposure for detailed occupations. Exposure signifies that AI technology could be or has been used to assist or complete some of the work performed in an occupation. Exposure does not imply job loss, productivity gains, automation probability, or wage effects. See https://www.bls.gov/emp/publications/ai-exposure-categories.htm for additional information and limitations.',
  /** "AI Exposure Categories" sheet, table note. */
  tableNote:
    'Exposure signifies that AI technology could be or has been used to assist or complete some of the work performed in an occupation. Exposure does not imply job loss, productivity gains, automation probability, or wage effects.',
  wageNote:
    'Wage data are from the Occupational Employment and Wage Statistics program. The wage data cover non-farm wage and salary workers and do not cover the self-employed, owners and partners in unincorporated firms, or household workers.',
} as const;

/** Microsoft Research's own out-of-scope warning for its applicability score (Tomlinson et al.). */
export const MICROSOFT_WARNING = 'should not be misconstrued as measuring the ability of AI to replace jobs';

export type Reference = { publisher: string; title: string; date: string; url: string };

/** Cite-only references: linked, never used as data inputs, never re-hosted. */
export const STANFORD_CANARIES: Reference = {
  publisher: 'Stanford Digital Economy Lab',
  title: 'No Widespread Displacement, but the AI Employment Gap for Young Workers Has Widened to 19%',
  date: '2026-08-12',
  url: 'https://digitaleconomy.stanford.edu/news/canariesaug26/',
};

export const STANFORD_CANARIES_PAPER: Reference = {
  publisher: 'Stanford Institute for Economic Policy Research (SIEPR)',
  title:
    'Canaries in the Coal Mine? Six Facts about the Recent Employment Effects of Artificial Intelligence (Brynjolfsson, Chandar & Chen)',
  date: '2025-08',
  url: 'https://siepr.stanford.edu/publications/working-paper/canaries-coal-mine-six-facts-about-recent-employment-effects-artificial',
};

/** Short, meaningful link text for inline citations. */
export const SOURCE_SHORT: Record<string, string> = {
  'bls-ai-exposure': 'BLS AI exposure categories',
  'bls-ep': 'BLS Employment Projections',
  'bls-oews': 'BLS OEWS May 2025',
  'bls-crosswalk': 'BLS O*NET–SOC crosswalk',
  'msft-ai-applicability': 'Microsoft Working with AI',
  'openai-gpts-are-gpts': 'Eloundou et al. (GPTs are GPTs)',
  'onet-31': 'O*NET 31.0 Database',
  'hoi-composite': 'HOI composite (methodology)',
};

export function sourceShort(id: string): string {
  return SOURCE_SHORT[id] ?? id;
}
