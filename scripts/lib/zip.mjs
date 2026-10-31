import { inflateRawSync } from 'node:zlib';

/** Minimal ZIP reader (central directory based) so the pipeline needs no extra archive dependency. */
export function readZip(buffer) {
  const eocdSig = 0x06054b50;
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
    if (buffer.readUInt32LE(i) === eocdSig) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a ZIP archive (no end-of-central-directory record)');
  const count = buffer.readUInt16LE(eocd + 10);
  let p = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let n = 0; n < count; n++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('corrupt ZIP central directory');
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const size = buffer.readUInt32LE(p + 24);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    if (compressedSize === 0xffffffff || localOffset === 0xffffffff) throw new Error(`ZIP64 entry not supported: ${name}`);
    entries.set(name, { name, method, compressedSize, size, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return {
    names: [...entries.keys()],
    /** Finds an entry by its base file name (ignoring folders), e.g. "national_M2025_dl.xlsx". */
    findByBaseName(base) {
      return [...entries.values()].find((e) => e.name.split('/').pop() === base) ?? null;
    },
    read(entry) {
      const lp = entry.localOffset;
      if (buffer.readUInt32LE(lp) !== 0x04034b50) throw new Error(`corrupt ZIP local header: ${entry.name}`);
      const start = lp + 30 + buffer.readUInt16LE(lp + 26) + buffer.readUInt16LE(lp + 28);
      const raw = buffer.subarray(start, start + entry.compressedSize);
      if (entry.method === 0) return Buffer.from(raw);
      if (entry.method === 8) return inflateRawSync(raw);
      throw new Error(`unsupported ZIP compression method ${entry.method} for ${entry.name}`);
    },
  };
}
