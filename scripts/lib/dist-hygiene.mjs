import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const LOCAL_URL = /127\.0\.0\.1|localhost/i;
export const RED_LIST = /weforum\.org|layoffs\.fyi/i;
const TEXT_FILE = /\.(html|xml|txt|css|js|mjs|json|csv|svg|webmanifest)$/;
// Raw-data formats the sites never publish; Stanford "Canaries" (ADP payroll) data must never be re-hosted.
const DATA_FILE = /\.(csv|tsv|xlsx|xls|zip|dta|parquet|sav|feather)$/i;
const CITE_ONLY_LINK = /<a\b[^>]*\bdata-cite-only\b[^>]*>[\s\S]*?<\/a>/g;

/** Every file under `dir`, as paths relative to it with forward slashes. */
export function listFiles(dir, prefix = '') {
  return readdirSync(dir).flatMap((name) => {
    const rel = prefix ? `${prefix}/${name}` : name;
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full, rel) : [rel];
  });
}

/** Built text files that mention localhost or 127.0.0.1. */
export function filesWithLocalUrls(dist) {
  return listFiles(dist).filter((rel) => TEXT_FILE.test(rel) && LOCAL_URL.test(readFileSync(join(dist, rel), 'utf8')));
}

/** Text with every labeled cite-only link removed; any red-list host left over is a violation. */
export function stripCiteOnlyLinks(html) {
  return html.replace(CITE_ONLY_LINK, '');
}

/** Built files that mention a red-list source anywhere other than inside a labeled cite-only link. */
export function filesWithRedListOutsideCiteLinks(dist) {
  return listFiles(dist).filter((rel) => TEXT_FILE.test(rel) && RED_LIST.test(stripCiteOnlyLinks(readFileSync(join(dist, rel), 'utf8'))));
}

/** Built raw-data files that are not on the site's allow-list, plus anything named after the Canaries study. */
export function unexpectedDataFiles(dist, allowed = []) {
  return listFiles(dist).filter((rel) => (DATA_FILE.test(rel) && !allowed.includes(rel)) || /canar/i.test(rel));
}
