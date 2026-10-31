import ExcelJS from 'exceljs';
import { readZip } from './zip.mjs';

export const SOC_RE = /^\d{2}-\d{4}$/;
export const ONET_RE = /^\d{2}-\d{4}\.\d{2}$/;

const NULL_TOKENS = new Set(['', '—', '–', '-', '*', '**', '#', 'N/A', 'n/a']);

/** BLS sheets mix text and number cells; "—" (and OEWS "*"/"#") mean not available. */
export function toNumber(value) {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value).trim();
  if (NULL_TOKENS.has(s)) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export const cleanText = (v) => (v == null ? null : String(v).replace(/\s+/g, ' ').trim() || null);

function cellValue(v) {
  if (v == null) return null;
  if (typeof v === 'object') {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    if ('result' in v) return v.result ?? null;
    if ('text' in v) return v.text;
    if (v instanceof Date) return v.toISOString();
  }
  return v;
}

async function loadWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

function sheetRows(wb, name) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`worksheet "${name}" not found (have: ${wb.worksheets.map((w) => w.name).join(', ')})`);
  const width = ws.columnCount;
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    rows.push(Array.from({ length: width }, (_, i) => cellValue(row.getCell(i + 1).value)));
  });
  return rows;
}

/** Locates the header row containing every required column and returns {rows after header, column index map}. */
function withHeader(rows, columns, label) {
  const norm = (v) => cleanText(v)?.toLowerCase() ?? '';
  const wanted = Object.entries(columns);
  const hi = rows.findIndex((r) => wanted.every(([, h]) => r.some((c) => norm(c) === h.toLowerCase())));
  if (hi < 0) throw new Error(`${label}: header row with columns ${wanted.map(([, h]) => `"${h}"`).join(', ')} not found`);
  const idx = {};
  for (const [key, h] of wanted) idx[key] = rows[hi].findIndex((c) => norm(c) === h.toLowerCase());
  return { idx, data: rows.slice(hi + 1) };
}

const EP_COLUMNS = {
  name: '2025 National Employment Matrix title',
  code: '2025 National Employment Matrix code',
  type: 'Occupation type',
  emp2025: 'Employment, 2025',
  emp2035: 'Employment, 2035',
  changeNumeric: 'Employment change, numeric, 2025–35',
  changePercent: 'Employment change, percent, 2025–35',
  openings: 'Occupational openings, 2025–35 annual average',
  wage: 'Median annual wage, dollars, 2025',
};

/** EP Table 1.2 Line items: the 831-occupation universe. Employment fields stay in thousands here. */
export async function parseEmploymentProjections(buffer) {
  const wb = await loadWorkbook(buffer);
  const { idx, data } = withHeader(sheetRows(wb, 'Table 1.2'), EP_COLUMNS, 'EP Table 1.2');
  const lineItems = data.filter((r) => cleanText(r[idx.type]) === 'Line item');
  const occupations = lineItems.map((r) => ({
    soc: cleanText(r[idx.code]),
    title: cleanText(r[idx.name]),
    emp2025: toNumber(r[idx.emp2025]),
    emp2035: toNumber(r[idx.emp2035]),
    changeNumeric: toNumber(r[idx.changeNumeric]),
    changePercent: toNumber(r[idx.changePercent]),
    openings: toNumber(r[idx.openings]),
    wage: toNumber(r[idx.wage]),
  }));
  const bad = occupations.filter((o) => !SOC_RE.test(o.soc ?? ''));
  if (bad.length) throw new Error(`EP Table 1.2: ${bad.length} Line-item rows without a SOC code`);

  const t15 = sheetRows(wb, 'Table 1.5');
  const { idx: i15, data: d15 } = withHeader(t15, { code: '2025 National Employment Matrix code' }, 'EP Table 1.5');
  // Table 1.5 carries a "Total, all occupations" (00-0000) reference row alongside the 30 occupations.
  const fastestDeclining = d15.map((r) => cleanText(r[i15.code])).filter((c) => SOC_RE.test(c ?? '') && c !== '00-0000');
  return { occupations, fastestDeclining, table12Rows: data.length };
}

const AIE_COLUMNS = { code: '2025 National Employment Matrix code', category: 'Relative AI exposure' };
export const BLS_CATEGORY_LABELS = ['Very high', 'High', 'Moderate', 'Low'];

/** BLS official 4-band AI exposure label per SOC code (trailing footnote rows have no code and are dropped). */
export async function parseAiExposure(buffer) {
  const wb = await loadWorkbook(buffer);
  const { idx, data } = withHeader(sheetRows(wb, 'AI Exposure Categories'), AIE_COLUMNS, 'AI exposure');
  const map = new Map();
  let footnotes = 0;
  for (const r of data) {
    const soc = cleanText(r[idx.code]);
    if (!SOC_RE.test(soc ?? '')) {
      footnotes++;
      continue;
    }
    const category = cleanText(r[idx.category]);
    if (!BLS_CATEGORY_LABELS.includes(category)) throw new Error(`AI exposure: unexpected category "${category}" for ${soc}`);
    map.set(soc, category);
  }
  return { bySoc: map, footnotes };
}

const OES_COLUMNS = { code: 'OCC_CODE', group: 'O_GROUP', totEmp: 'TOT_EMP', medianAnnual: 'A_MEDIAN', medianHourly: 'H_MEDIAN' };

/** OEWS May 2025 national file. TOT_EMP is an absolute job count. "#" in wage columns means top-coded. */
export async function parseOews(zipBuffer, entryName) {
  const zip = readZip(zipBuffer);
  const entry = zip.findByBaseName(entryName);
  if (!entry) throw new Error(`OEWS zip has no ${entryName} (entries: ${zip.names.join(', ')})`);
  const wb = await loadWorkbook(zip.read(entry));
  const sheetName = entryName.replace(/\.xlsx$/, '');
  const { idx, data } = withHeader(sheetRows(wb, sheetName), OES_COLUMNS, 'OEWS');
  const detailed = new Map();
  const other = new Map();
  for (const r of data) {
    const soc = cleanText(r[idx.code]);
    if (!SOC_RE.test(soc ?? '')) continue;
    const rawWage = cleanText(r[idx.medianAnnual]);
    const row = {
      totEmp: toNumber(r[idx.totEmp]),
      medianAnnual: toNumber(r[idx.medianAnnual]),
      medianTopCoded: rawWage === '#',
      medianHourly: toNumber(r[idx.medianHourly]),
      group: cleanText(r[idx.group]),
    };
    (row.group === 'detailed' ? detailed : other).set(soc, row);
  }
  return { detailed, other, entry: entry.name };
}

const XW_COLUMNS = { onet: 'O*NET-SOC code', soc: 'NEM Code', ooh: 'OOH profile website' };

/** O*NET-SOC (XX-XXXX.XX) -> SOC 2018 (XX-XXXX) bridge. Many O*NET codes can share one SOC code. */
export async function parseCrosswalk(buffer) {
  const wb = await loadWorkbook(buffer);
  const { idx, data } = withHeader(sheetRows(wb, 'Crosswalk'), XW_COLUMNS, 'Crosswalk');
  const onetToSoc = new Map();
  const socToOnet = new Map();
  const oohBySoc = new Map();
  for (const r of data) {
    const onet = cleanText(r[idx.onet]);
    const soc = cleanText(r[idx.soc]);
    if (!ONET_RE.test(onet ?? '') || !SOC_RE.test(soc ?? '')) continue;
    onetToSoc.set(onet, soc);
    if (!socToOnet.has(soc)) socToOnet.set(soc, []);
    socToOnet.get(soc).push(onet);
    const ooh = cleanText(r[idx.ooh]);
    if (ooh && /^https:\/\/www\.bls\.gov\/ooh\//.test(ooh) && !oohBySoc.has(soc)) oohBySoc.set(soc, ooh);
  }
  for (const list of socToOnet.values()) list.sort();
  return { onetToSoc, socToOnet, oohBySoc };
}

/** RFC 4180 CSV (quoted fields may contain commas). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const s = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  const [header, ...data] = rows;
  return data.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), r[i]])));
}

export function parseMicrosoft(text) {
  const map = new Map();
  for (const r of parseCsv(text)) {
    const soc = cleanText(r['SOC Code']);
    const score = toNumber(r.ai_applicability_score);
    if (SOC_RE.test(soc ?? '') && score != null) map.set(soc, score);
  }
  return map;
}

/** Eloundou et al. rows keyed by O*NET-SOC code; we use the dv_rating_beta measure. */
export function parseEloundou(text) {
  const map = new Map();
  for (const r of parseCsv(text)) {
    const onet = cleanText(r['O*NET-SOC Code']);
    const beta = toNumber(r.dv_rating_beta);
    if (ONET_RE.test(onet ?? '') && beta != null) map.set(onet, beta);
  }
  return map;
}

function parseTsv(text) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length);
  const header = lines[0].split('\t').map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const cells = l.split('\t');
    return Object.fromEntries(header.map((h, i) => [h, cells[i]?.trim() ?? '']));
  });
}

function requireColumns(rows, cols, label) {
  const missing = cols.filter((c) => rows.length && !(c in rows[0]));
  if (missing.length) throw new Error(`${label}: missing columns ${missing.join(', ')}`);
}

/** O*NET 31.0 task statements (with importance ratings) and related occupations, keyed by O*NET-SOC code. */
export function parseOnet(zipBuffer) {
  const zip = readZip(zipBuffer);
  const read = (base) => {
    const entry = zip.findByBaseName(base);
    if (!entry) throw new Error(`O*NET zip has no "${base}"`);
    return parseTsv(zip.read(entry).toString('utf8'));
  };

  const taskRows = read('Task Statements.txt');
  requireColumns(taskRows, ['O*NET-SOC Code', 'Task ID', 'Task', 'Task Type'], 'Task Statements');
  const ratingRows = read('Task Ratings.txt');
  requireColumns(ratingRows, ['O*NET-SOC Code', 'Task ID', 'Scale ID', 'Data Value'], 'Task Ratings');
  const related = read('Related Occupations.txt');
  requireColumns(related, ['O*NET-SOC Code', 'Related O*NET-SOC Code', 'Relatedness Tier', 'Index'], 'Related Occupations');

  const importance = new Map();
  for (const r of ratingRows) {
    if (r['Scale ID'] === 'IM') importance.set(`${r['O*NET-SOC Code']}|${r['Task ID']}`, toNumber(r['Data Value']));
  }
  const tasksByOnet = new Map();
  for (const r of taskRows) {
    const onet = r['O*NET-SOC Code'];
    if (!tasksByOnet.has(onet)) tasksByOnet.set(onet, []);
    tasksByOnet.get(onet).push({
      id: r['Task ID'],
      text: r.Task,
      type: r['Task Type'] || null,
      importance: importance.get(`${onet}|${r['Task ID']}`) ?? null,
    });
  }
  const relatedByOnet = new Map();
  for (const r of related) {
    const onet = r['O*NET-SOC Code'];
    if (!relatedByOnet.has(onet)) relatedByOnet.set(onet, []);
    relatedByOnet.get(onet).push({ onet: r['Related O*NET-SOC Code'], tier: r['Relatedness Tier'], index: toNumber(r.Index) });
  }
  for (const list of relatedByOnet.values()) list.sort((a, b) => (a.index ?? 1e9) - (b.index ?? 1e9));
  return { tasksByOnet, relatedByOnet, counts: { tasks: taskRows.length, ratings: ratingRows.length, related: related.length } };
}

/**
 * O*NET 31.0 title lists keyed by O*NET-SOC code: "Sample of Reported Titles" and "Job Titles" (the 31.0 name
 * of the former "Alternate Titles" file: Job Title, Short Title, Source(s)).
 */
export function parseOnetTitles(zipBuffer) {
  const zip = readZip(zipBuffer);
  const read = (base) => {
    const entry = zip.findByBaseName(base);
    if (!entry) throw new Error(`O*NET zip has no "${base}"`);
    return parseTsv(zip.read(entry).toString('utf8'));
  };
  const reported = read('Sample of Reported Titles.txt');
  requireColumns(reported, ['O*NET-SOC Code', 'Reported Job Title', 'Shown in My Next Move'], 'Sample of Reported Titles');
  const jobTitles = read('Job Titles.txt');
  requireColumns(jobTitles, ['O*NET-SOC Code', 'Job Title', 'Short Title'], 'Job Titles');
  const group = (rows, toItem) => {
    const map = new Map();
    for (const r of rows) {
      const code = r['O*NET-SOC Code'];
      if (!ONET_RE.test(code)) continue;
      const item = toItem(r);
      if (!item.title) continue;
      if (!map.has(code)) map.set(code, []);
      map.get(code).push(item);
    }
    return map;
  };
  const short = (v) => (v && v !== 'n/a' ? cleanText(v) : null);
  return {
    reportedByOnet: group(reported, (r) => ({ title: cleanText(r['Reported Job Title']), shown: r['Shown in My Next Move'] === 'Y' })),
    jobTitlesByOnet: group(jobTitles, (r) => ({ title: cleanText(r['Job Title']), short: short(r['Short Title']) })),
    counts: { reported: reported.length, jobTitles: jobTitles.length },
  };
}
