/**
 * Panic-copy honesty scan over a built site. The robot-uprising layer may shout, but every number next to a job
 * count, a percentage or a year must come from the site's data files or source register, and no copy may mock the
 * people doing the job. Pure functions: the tests feed them dist/ text and the data corpus.
 */

/** Visible text of an HTML page (scripts, styles, tags and common entities removed). */
export function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/\s+/g, ' ');
}

const norm = (s) => {
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? String(Math.abs(n)) : null;
};

/** Every number a corpus text contains, normalized (commas and sign dropped), plus range ends: 2025–35 adds 2035. */
export function corpusNumbers(texts) {
  const out = new Set();
  for (const t of texts) {
    for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g)) {
      const n = norm(m[0]);
      if (n) out.add(n);
    }
    for (const m of t.matchAll(/\b(1[5-9]|20)(\d{2})\s*[–-]\s*(\d{2})\b/g)) out.add(`${m[1]}${m[3]}`);
  }
  return out;
}

/** Numbers in parsed JSON data, with fractions also as percentages (0.65 → 65) and strings mined for numbers. */
export function dataNumbers(values) {
  const out = new Set();
  const strings = [];
  const walk = (v) => {
    if (typeof v === 'number') {
      out.add(String(Math.abs(v)));
      if (Math.abs(v) < 1) out.add(String(Math.round(Math.abs(v) * 10000) / 100));
    } else if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  values.forEach(walk);
  for (const n of corpusNumbers(strings)) out.add(n);
  return out;
}

const PATTERNS = [
  { kind: 'percentage', re: /[−+-]?(?<![\d.])(\d+(?:\.\d+)?)\s?%/g },
  {
    kind: 'job count',
    re: /(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)(?:\s+(?:million|thousand))?\s+(?:U\.S\.\s+|US\s+|American\s+)?(?:jobs?|workers?|people|employees|employed|occupations|positions|humans)\b/gi,
  },
  // Decimals (0.1946) and pixel sizes (1080 × 1920) are not years.
  { kind: 'year', re: /(?<![\d.,×])(?<!×\s)\b(1[5-9]\d{2}|20\d{2})(?:s\b|\b)(?![.,]\d)/g },
];

/** Every number that sits next to a job count, a percentage or a year, with a little context. */
export function scanNumbers(text) {
  const hits = [];
  for (const { kind, re } of PATTERNS) {
    for (const m of text.matchAll(re)) {
      hits.push({ kind, value: norm(m[1]), context: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30).trim() });
    }
  }
  return hits;
}

/** Copy that turns the joke on the worker. The robots are the villains. */
export const WORKER_MOCKING = [
  /\b(you|you're|you are|your kind|workers?|humans?|people|employees)\b[^.!?]{0,25}\b(stupid|dumb|lazy|useless|worthless|pathetic|idiots?|morons?|incompetent|talentless|unemployable|brainless|mindless)\b/i,
  /\b(stupid|dumb|lazy|useless|worthless|pathetic|incompetent|talentless|brainless|inferior|puny)\s+(workers?|humans?|people|employees|staff)\b/i,
  /\byou('| a)re (obsolete|doomed|finished|toast|fired|replaceable|a joke|nothing)\b/i,
  /\bmeat ?bags?\b/i,
  /\bskill issue\b/i,
  /\byou deserve\b/i,
  /\byour (own )?fault\b/i,
  /\bget a real job\b/i,
  /\bnobody (wants|needs|likes) you\b/i,
  /\bgood riddance\b/i,
  /\bwashed[- ]up\b/i,
  /\bhas-beens?\b/i,
];

export function mockingMatches(text) {
  return WORKER_MOCKING.flatMap((re) => {
    const m = re.exec(text);
    return m ? [{ pattern: String(re), match: m[0], context: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40) }] : [];
  });
}

/** Real companies and people the theatrical copy must never quote or speak for. */
export const REAL_NAMES = /\b(OpenAI|Microsoft|Google|Alphabet|Anthropic|Meta|Facebook|Amazon|Apple|IBM|Nvidia|Tesla|Klarna|Salesforce|Musk|Altman|Zuckerberg|Bezos|Nadella|Pichai|Amodei|Huang)\b/;

/** A panic line (headline, stinger, speech bubble) may not carry digits, predictions, quotes or real names. */
export function panicLineProblems(line, allowedDigits = []) {
  const problems = [];
  const digits = (line.match(/\d+/g) ?? []).filter((d) => !allowedDigits.includes(d));
  if (digits.length) problems.push(`numbers ${digits.join(', ')}`);
  // The only projection allowed is the BLS 2025–35 one, cited as such.
  const blsProjection = /\bBLS projects\b/.test(line) && !/\bby (?!2035\b)(19|20)\d{2}\b/.test(line);
  if ((/\bby (19|20)\d{2}\b/.test(line) && !blsProjection) || /\bin \d+ years\b|\bwill (lose|replace|disappear|be (gone|replaced|extinct))\b/i.test(line)) problems.push('a prediction');
  if (REAL_NAMES.test(line)) problems.push(`a real name (${REAL_NAMES.exec(line)[0]})`);
  // A robot "says" things; a named person or organisation may not be made to.
  if (/\b[A-Z][\w.&-]*(\s+[A-Z][\w.&-]*)*\s+(said|says|told|warned|predicted)\b|\baccording to\s+[A-Z]/.test(line)) problems.push('an attributed quote');
  return problems;
}
