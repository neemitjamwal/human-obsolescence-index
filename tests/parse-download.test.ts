import { describe, expect, it } from 'vitest';
import { deflateRawSync } from 'node:zlib';
import { validatePayload } from '../scripts/lib/download.mjs';
import { cleanText, parseCsv, parseMicrosoft, toNumber } from '../scripts/lib/parse.mjs';
import { readZip } from '../scripts/lib/zip.mjs';
import { SOURCES } from '../scripts/lib/config.mjs';

const src = (id: string) => SOURCES.find((s: { id: string }) => s.id === id)!;

describe('download validation (fail loudly)', () => {
  it('rejects HTML error pages served in place of data', () => {
    const html = Buffer.from('<!DOCTYPE html><html><head><title>Access Denied</title></head></html>');
    for (const id of ['bls-ep', 'bls-oews', 'msft-ai-applicability']) {
      expect(() => validatePayload(src(id), html)).toThrow(/HTML/);
    }
    expect(() => validatePayload(src('bls-ep'), Buffer.from('  <html lang="en">denied</html>'))).toThrow(/HTML/);
  });

  it('rejects empty bodies, non-ZIP spreadsheets and CSVs with the wrong header', () => {
    expect(() => validatePayload(src('bls-ep'), Buffer.alloc(0))).toThrow(/empty/);
    expect(() => validatePayload(src('bls-ep'), Buffer.from('not a spreadsheet'))).toThrow(/ZIP/);
    expect(() => validatePayload(src('msft-ai-applicability'), Buffer.from('a,b,c\n1,2,3'))).toThrow(/header/);
  });

  it('accepts genuine payload shapes', () => {
    expect(() => validatePayload(src('bls-ep'), Buffer.from('PK\u0003\u0004rest-of-file'))).not.toThrow();
    expect(() => validatePayload(src('msft-ai-applicability'), Buffer.from('SOC Code,title,ai_applicability_score\n11-1011,Chief Executives,0.15'))).not.toThrow();
  });

  it('pins 7 dated sources, BLS ones on bls.gov', () => {
    expect(SOURCES).toHaveLength(7);
    for (const s of SOURCES) expect(s.url).toMatch(/^https:\/\//);
    expect(src('bls-oews').url).toContain('oesm25nat.zip');
    expect(src('onet-31').url).toContain('db_31_0_text.zip');
    expect(SOURCES.filter((s: { url: string }) => s.url.includes('bls.gov'))).toHaveLength(4);
  });
});

describe('cell coercion', () => {
  it('coerces BLS text numerics and treats dashes and OEWS markers as null', () => {
    expect(toNumber('291.6')).toBe(291.6);
    expect(toNumber('-1.2')).toBe(-1.2);
    expect(toNumber('155,495,730')).toBe(155495730);
    expect(toNumber(42)).toBe(42);
    for (const v of ['—', '–', '', '*', '#', null, undefined, 'abc']) expect(toNumber(v)).toBeNull();
  });

  it('trims EP title indentation', () => {
    expect(cleanText('        Marketing managers')).toBe('Marketing managers');
    expect(cleanText('   ')).toBeNull();
  });

  it('parses quoted CSV fields', () => {
    const rows = parseCsv('SOC Code,title,ai_applicability_score\r\n11-9199,"Managers, All Other",0.2\r\n');
    expect(rows).toEqual([{ 'SOC Code': '11-9199', title: 'Managers, All Other', ai_applicability_score: '0.2' }]);
    expect(parseMicrosoft('SOC Code,title,ai_applicability_score\n11-1011,X,0.15\nbad,Y,0.3\n').size).toBe(1);
  });
});

describe('zip reader', () => {
  // Builds a tiny archive with a stray 1-byte folder entry, like BLS's oesm25nat.zip.
  function makeZip(files: [string, Buffer][]): Buffer {
    const locals: Buffer[] = [];
    const centrals: Buffer[] = [];
    let offset = 0;
    for (const [name, data] of files) {
      const comp = deflateRawSync(data);
      const nameBuf = Buffer.from(name);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(8, 8);
      local.writeUInt32LE(comp.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      const central = Buffer.alloc(46);
      central.writeUInt32LE(0x02014b50, 0);
      central.writeUInt16LE(8, 10);
      central.writeUInt32LE(comp.length, 20);
      central.writeUInt32LE(data.length, 24);
      central.writeUInt16LE(nameBuf.length, 28);
      central.writeUInt32LE(offset, 42);
      locals.push(local, nameBuf, comp);
      centrals.push(central, nameBuf);
      offset += 30 + nameBuf.length + comp.length;
    }
    const cd = Buffer.concat(centrals);
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(cd.length, 12);
    eocd.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, eocd]);
  }

  it('extracts an entry by base name, ignoring the stray entry', () => {
    const zip = readZip(makeZip([['oesm25nat', Buffer.from('x')], ['oesm25nat/national_M2025_dl.xlsx', Buffer.from('hello data')]]));
    expect(zip.names).toEqual(['oesm25nat', 'oesm25nat/national_M2025_dl.xlsx']);
    const entry = zip.findByBaseName('national_M2025_dl.xlsx')!;
    expect(zip.read(entry).toString()).toBe('hello data');
    expect(zip.findByBaseName('missing.xlsx')).toBeNull();
  });
});
