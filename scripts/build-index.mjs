// Human Obsolescence Index data pipeline: download -> parse -> join -> score -> emit.
// Usage: npm run build:index [-- --refresh]   (exits non-zero on any failed or non-data download)
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SOURCES } from './lib/config.mjs';
import { downloadAll } from './lib/download.mjs';
import {
  parseAiExposure,
  parseCrosswalk,
  parseEloundou,
  parseEmploymentProjections,
  parseMicrosoft,
  parseOews,
  parseOnet,
} from './lib/parse.mjs';
import { assignSlugs, buildUniverse } from './lib/join.mjs';
import { computeScores } from './lib/score.mjs';
import { selectOccupations } from './lib/select.mjs';
import { buildMeta, compositeSource, occupationPayload, universeEntry, writeJson } from './lib/emit.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, '.cache', 'raw');
const dataDir = join(root, 'src', 'data');

async function main() {
  const refresh = process.argv.includes('--refresh');
  console.log(`build-index: ${SOURCES.length} sources -> ${cacheDir}${refresh ? ' (refresh)' : ''}`);
  const dl = await downloadAll(SOURCES, cacheDir, { refresh });
  const src = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

  const ep = await parseEmploymentProjections(dl['bls-ep'].buffer);
  const aiExposure = await parseAiExposure(dl['bls-ai-exposure'].buffer);
  const oews = await parseOews(dl['bls-oews'].buffer, src['bls-oews'].zipEntry);
  const crosswalk = await parseCrosswalk(dl['bls-crosswalk'].buffer);
  const microsoft = parseMicrosoft(dl['msft-ai-applicability'].buffer.toString('utf8'));
  const eloundou = parseEloundou(dl['openai-gpts-are-gpts'].buffer.toString('utf8'));
  const onet = parseOnet(dl['onet-31'].buffer);
  console.log(
    [
      `parse: EP Table 1.2 ${ep.table12Rows} data rows -> ${ep.occupations.length} Line items; Table 1.5 fastest declining ${ep.fastestDeclining.length}`,
      `       AI exposure ${aiExposure.bySoc.size} coded rows (${aiExposure.footnotes} footnote rows dropped)`,
      `       OEWS ${oews.entry}: ${oews.detailed.size} detailed + ${oews.other.size} aggregate rows`,
      `       crosswalk ${crosswalk.onetToSoc.size} O*NET codes -> ${crosswalk.socToOnet.size} SOC codes`,
      `       Microsoft ${microsoft.size} rows; Eloundou ${eloundou.size} rows`,
      `       O*NET 31.0 tasks ${onet.counts.tasks}, task ratings ${onet.counts.ratings}, related ${onet.counts.related}`,
    ].join('\n'),
  );

  const universe = buildUniverse({ ep, aiExposure, oews, crosswalk, microsoft, eloundou });
  assignSlugs(universe);
  const scores = computeScores(universe.map((u) => ({ msft: u.msft, eld: u.eld, changePercent: u.ep.changePercent })));
  universe.forEach((u, i) => (u.scores = scores[i]));

  const selection = selectOccupations(universe, ep.fastestDeclining);
  const bySoc = new Map(universe.map((u) => [u.soc, u]));
  const selectedSocs = new Set(selection.selected.map((u) => u.soc));
  const ctx = { onet, crosswalk, bySoc, selectedSocs, reasons: selection.reasons, leaderboardRank: selection.leaderboardRank };
  const occupations = selection.selected.map((u, i) => occupationPayload(u, { ...ctx, rank: i + 1 }));

  const microsoftOutsideUniverse = [...microsoft.keys()].filter((soc) => !bySoc.has(soc)).sort();
  const meta = buildMeta({ universe, selection, fastestDeclining: ep.fastestDeclining, downloads: dl, microsoftOutsideUniverse });
  const sources = SOURCES.map((s) => ({
    id: s.id,
    name: s.name,
    publisher: s.publisher,
    url: s.url,
    methodologyUrl: s.methodologyUrl,
    file: s.zipEntry ? `${s.file} (${s.zipEntry})` : s.file,
    retrievedAt: dl[s.id].retrievedAt,
    sha256: dl[s.id].sha256,
    bytes: dl[s.id].bytes,
    license: s.license,
    licenseUrl: s.licenseUrl,
    citation: s.citation,
  }));
  sources.push(compositeSource(meta));

  mkdirSync(dataDir, { recursive: true });
  writeJson(join(dataDir, 'occupations.json'), { meta, occupations, universe: universe.map(universeEntry) });
  writeJson(join(dataDir, 'sources.json'), { generatedFor: meta.edition, sources });

  const u = meta.universe;
  console.log(
    `score: universe ${u.size}; Microsoft ${u.microsoftCovered} (${u.size - u.microsoftCovered} missing); Eloundou ${u.eloundouCovered}; ` +
      `OEWS ${u.oesCovered}; OBS scored ${u.obsScored}`,
  );
  console.log(
    `select: ${selection.eligibleCount} eligible (OEWS >= 50,000), leaderboard cutoff OBS ${selection.cutoff}, ` +
      `${occupations.length} occupations emitted`,
  );
  for (const o of occupations.slice(0, 3)) {
    console.log(`  #${o.rank} ${o.soc} ${o.title}: OBS ${o.scores.obs.value} (Exposure ${o.scores.exposure.value}, Trajectory ${o.scores.trajectory.value}, BLS ${o.blsCategory.value})`);
  }
  console.log(`emit: src/data/occupations.json, src/data/sources.json (${sources.length} sources)`);
}

main().catch((err) => {
  console.error(`build-index FAILED: ${err.message}`);
  process.exit(1);
});
