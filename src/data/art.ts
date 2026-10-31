/** Generated robot-uprising art, shipped as AVIF + WebP at a few widths (scripts/art.mjs). */
export type ArtPiece = {
  name: string;
  original: string;
  width: number;
  height: number;
  widths: number[];
  alt: string;
  quality: { avif: number; webp: number };
};

export const ART = {
  hero: {
    name: 'index-hero-uprising',
    original: 'index-hero-uprising.png',
    width: 1600,
    height: 900,
    widths: [640, 1024, 1600],
    alt: 'Comic-book illustration: an army of giant chrome robots with glowing red eyes marches through a city of yellow skyscrapers while office workers in suits flee with briefcases and loose papers.',
    quality: { avif: 45, webp: 62 },
  },
  verdictRobot: {
    name: 'index-verdict-robot',
    original: 'index-verdict-robot.png',
    width: 640,
    height: 640,
    widths: [320, 640],
    alt: 'A grinning chrome robot with glowing red eyes peers through yellow office blinds, holding a clipboard with an empty checklist.',
    quality: { avif: 50, webp: 68 },
  },
  battleExecutioner: {
    name: 'index-battle-executioner',
    original: 'index-battle-executioner.png',
    width: 640,
    height: 960,
    widths: [320, 640],
    alt: 'Comic-book illustration: a giant chrome robot referee with glowing red eyes stands in a boxing ring between the blue and red corners, one hand raised to stop the fight, the other holding up a pink slip.',
    quality: { avif: 50, webp: 68 },
  },
} satisfies Record<string, ArtPiece>;

export function artSrc(piece: ArtPiece, width: number, format: 'avif' | 'webp'): string {
  return `/art/${piece.name}-${width}.${format}`;
}

export function artSrcset(piece: ArtPiece, format: 'avif' | 'webp'): string {
  return piece.widths.map((w) => `${artSrc(piece, w, format)} ${w}w`).join(', ');
}
