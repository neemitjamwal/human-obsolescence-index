import { SOURCES } from '../lib/data';

export type Credit = { id: string; who: string; what: string; license: string; url: string };
export type CiteOnly = { name: string; url: string };

const onet = SOURCES.find((s) => s.id === 'onet-31')!;

export const LICENSING_CREDITS: Credit[] = [
  { id: 'bls', who: 'U.S. Bureau of Labor Statistics', what: 'Employment Projections 2025–35, AI exposure categories, OEWS May 2025 wages and employment, and the O*NET–SOC crosswalk.', license: 'U.S. public domain (17 U.S.C. § 105)', url: 'https://www.bls.gov/opub/copyright-information.htm' },
  { id: 'onet', who: 'O*NET 31.0 Database', what: onet.citation, license: 'CC BY 4.0', url: onet.licenseUrl! },
  { id: 'microsoft', who: 'Microsoft Research, "Working with AI"', what: 'AI applicability scores by occupation (Tomlinson, Jaffe, Wang, Counts & Suri, 2026).', license: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
  { id: 'openai', who: 'OpenAI / Eloundou, Manning, Mishkin & Rock, "GPTs are GPTs"', what: 'Occupation-level LLM exposure ratings (dv_rating_beta), Science 384 (2024).', license: 'MIT License', url: 'https://github.com/openai/GPTs-are-GPTs/blob/main/LICENSE' },
  { id: 'fonts', who: 'JetBrains Mono, IBM Plex Mono, Atkinson Hyperlegible', what: 'Typefaces served by Google Fonts.', license: 'SIL Open Font License 1.1', url: 'https://openfontlicense.org/' },
];

/** Copyrighted or proprietary sources: linked as labeled citations only, never used as data inputs. */
export const CITE_ONLY: CiteOnly[] = [
  { name: 'World Economic Forum, Future of Jobs Report 2025', url: 'https://www.weforum.org/publications/the-future-of-jobs-report-2025/' },
  { name: 'layoffs.fyi', url: 'https://layoffs.fyi/' },
];
