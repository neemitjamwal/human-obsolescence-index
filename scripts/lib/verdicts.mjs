import { bandFor } from './verdict-cards.mjs';

const FIELD_SOURCES = {
  title: 'bls-ep',
  obs: 'hoi-composite',
  band: 'hoi-composite',
  blsCategory: 'bls-ai-exposure',
  exposure: 'hoi-composite',
  trajectory: 'hoi-composite',
  projectedChangePct: 'bls-ep',
  employment: 'bls-ep',
  medianWage: 'bls-oews',
  topTask: 'onet-31',
};

const byObsDesc = (a, b) => b.obs - a.obs || (b.exposure ?? -1) - (a.exposure ?? -1) || a.soc.localeCompare(b.soc);

/** One compact verdict per scored universe entry (as emitted in occupations.json), highest OBS first. */
export function buildVerdicts(universeEntries, publishedSocs) {
  return universeEntries
    .filter((u) => u.obs != null)
    .sort(byObsDesc)
    .map((u) => {
      const v = {
        soc: u.soc,
        slug: u.slug,
        title: u.title,
        obs: u.obs,
        band: bandFor(u.obs).id,
        blsCategory: u.blsCategory,
        exposure: u.exposure,
        trajectory: u.trajectory,
        projectedChangePct: u.changePercent,
        employment: u.employment,
        medianWage: u.medianWage,
        topTask: u.topTask,
        hasFullPage: publishedSocs.has(u.soc),
      };
      v.sourceIds = Object.fromEntries(Object.entries(FIELD_SOURCES).filter(([field]) => v[field] != null));
      return v;
    });
}

/** One record per line keeps the file diffable without pretty-printing 784 records. */
export function verdictsJson(meta, verdicts) {
  return `{"meta":${JSON.stringify(meta)},\n"verdicts":[\n${verdicts.map((v) => JSON.stringify(v)).join(',\n')}\n]}\n`;
}

export const VERDICT_FIELD_SOURCES = FIELD_SOURCES;
