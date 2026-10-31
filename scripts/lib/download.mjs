import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MIN_INTERVAL_MS = 1100;

// bls.gov rejects curl/Invoke-WebRequest from this machine at the TLS layer; Node's fetch (undici) gets 200.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** Throws when a downloaded or cached file is not the data file it claims to be. */
export function validatePayload(source, buf, contentType = '') {
  if (buf.length === 0) throw new Error(`${source.id}: empty response body`);
  const head = buf.subarray(0, 512).toString('utf8').replace(/^\uFEFF/, '');
  if (/^\s*<(!doctype|html|\?xml[^>]*>\s*<html)/i.test(head) || /<html[\s>]/i.test(head)) {
    throw new Error(`${source.id}: got an HTML page instead of data (${source.url})`);
  }
  if (source.kind === 'xlsx' || source.kind === 'zip') {
    if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error(`${source.id}: not a ZIP/XLSX container (magic bytes ${buf.subarray(0, 4).toString('hex')})`);
    if (/text\/html/i.test(contentType)) throw new Error(`${source.id}: server labeled the body text/html`);
  }
  if (source.kind === 'csv') {
    const firstLine = head.split(/\r?\n/)[0].trim();
    if (firstLine !== source.expectedHeader) throw new Error(`${source.id}: unexpected CSV header "${firstLine}"`);
  }
}

let lastRequestAt = 0;
async function politeFetch(url) {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  return fetch(url, { headers: HEADERS, redirect: 'follow', signal: AbortSignal.timeout(180_000) });
}

/**
 * Ensures every source is present in the cache. Cached files are re-validated and reused (with their original
 * retrieval date) so re-runs are idempotent; `refresh` forces a new download of everything.
 */
export async function downloadAll(sources, cacheDir, { refresh = false, log = console.log } = {}) {
  mkdirSync(cacheDir, { recursive: true });
  const manifestPath = join(cacheDir, 'manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const results = {};
  for (const source of sources) {
    const path = join(cacheDir, source.file);
    const cached = manifest[source.id];
    if (!refresh && cached && cached.url === source.url && existsSync(path)) {
      const buf = readFileSync(path);
      validatePayload(source, buf);
      const digest = sha256(buf);
      if (digest !== cached.sha256) throw new Error(`${source.id}: cached file hash changed; rerun with --refresh`);
      log(`  cache  ${source.id.padEnd(22)} ${String(buf.length).padStart(9)} bytes  retrieved ${cached.retrievedAt}`);
      results[source.id] = { buffer: buf, path, ...cached };
      continue;
    }
    let res;
    try {
      res = await politeFetch(source.url);
    } catch (err) {
      throw new Error(`${source.id}: download failed (${source.url}): ${err.message}`);
    }
    if (!res.ok) throw new Error(`${source.id}: HTTP ${res.status} ${res.statusText} from ${source.url}`);
    const buf = Buffer.from(await res.arrayBuffer());
    validatePayload(source, buf, res.headers.get('content-type') ?? '');
    writeFileSync(`${path}.tmp`, buf);
    renameSync(`${path}.tmp`, path);
    const entry = { url: source.url, retrievedAt: new Date().toISOString(), sha256: sha256(buf), bytes: buf.length };
    manifest[source.id] = entry;
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    log(`  fetch  ${source.id.padEnd(22)} ${String(buf.length).padStart(9)} bytes  HTTP ${res.status}`);
    results[source.id] = { buffer: buf, path, ...entry };
  }
  return results;
}
