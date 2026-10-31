/** Longest first name a card or headline will print. */
export const NAME_MAX = 20;

/**
 * Reduces any input to letters, spaces, hyphens, apostrophes and periods, at most NAME_MAX characters.
 * The result is only ever written with textContent or drawn on a canvas, never parsed as HTML.
 */
export function sanitizeName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw
    .normalize('NFC')
    .replace(/[’‘`]/g, "'")
    .replace(/[^\p{L} '.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trimStart();
  // Counted in code points: slicing UTF-16 units could split an astral letter and leave a lone surrogate.
  const short = Array.from(cleaned).slice(0, NAME_MAX).join('').trim();
  return /\p{L}/u.test(short) ? short : '';
}

/**
 * A name from a share link. Anything the sanitizer would have to change (markup, digits, over-long input) drops the
 * name entirely instead of printing a mangled one.
 */
export function nameFromQuery(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw.length > NAME_MAX * 2) return '';
  const name = sanitizeName(raw);
  return name && name === raw.normalize('NFC').replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim() ? name : '';
}

/** "Dave" -> "Dave's". */
export function possessive(name: string): string {
  return `${name}'s`;
}
