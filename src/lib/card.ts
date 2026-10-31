import { ART, artSrc } from '../data/art';
import { ROBOT_LABELS, ROBOT_POSE_BY_BAND, ROBOT_VIEWBOX, robotSvg, type RobotPose } from './robots';
import { FORMULA_LINE, type VerdictView } from './verdict-view';
import { SITE_DOMAIN } from './site';

export type CardKind = 'story' | 'post';
export const CARD_SIZES: Record<CardKind, { width: number; height: number }> = {
  story: { width: 1080, height: 1920 },
  post: { width: 1200, height: 630 },
};

const C = { ink: '#0b0b0b', paper: '#fffbea', yellow: '#ffe500', red: '#e4002b', blue: '#1f5bff', white: '#ffffff' };
const ANTON = 'Anton, Impact, sans-serif';
const ARCHIVO = 'Archivo, Arial, sans-serif';
const MARKER = '"Permanent Marker", cursive';

/** Faces the cards draw with; each must be loaded before drawing so no fallback font lands on a card. */
export const CARD_FONTS = ['400 100px Anton', '900 40px Archivo', '700 40px Archivo', '400 40px Archivo', '400 40px "Permanent Marker"'];

/** The photo robot drawn on the story card (same-origin, so the canvas stays exportable). */
export const CARD_PHOTO_SRC = artSrc(ART.verdictRobot, 640, 'webp');

/**
 * Every string a card prints. All of it comes from the verdict view, and so from the data. The cards carry the
 * site URL but not the disclaimer, which sits on the page next to the result.
 */
export type CardText = {
  masthead: string;
  strap: string;
  stinger: string;
  headline: string;
  who: string;
  score: string;
  scoreLabel: string;
  title: string;
  band: string;
  rank: string;
  roast: string;
  stat: string;
  bls: string;
  robotLine: string;
  formula: string;
  url: string;
};

export function cardText(view: VerdictView): CardText {
  return {
    masthead: 'THE DAILY DOOM',
    strap: `HUMAN OBSOLESCENCE INDEX · ${view.edition} EDITION`,
    stinger: view.stinger.toUpperCase(),
    headline: view.headline.toUpperCase(),
    who: view.who.toUpperCase(),
    score: view.score,
    scoreLabel: 'DOOM SCORE / 100',
    title: view.title.toUpperCase(),
    band: view.bandLabel.toUpperCase(),
    rank: view.rankShort.toUpperCase(),
    roast: view.roast,
    stat: view.changeShort,
    bls: `BLS AI exposure category: ${view.blsCategory}`,
    robotLine: `“${view.robotLine}”`,
    formula: FORMULA_LINE,
    url: SITE_DOMAIN,
  };
}

/** Loads every card face (for the exact text to draw) and reports whether all of them are really available. */
export async function loadCardFonts(sample: string): Promise<boolean> {
  if (typeof document === 'undefined' || !('fonts' in document)) return false;
  try {
    await document.fonts.ready;
    const loaded = await Promise.all(CARD_FONTS.map((f) => document.fonts.load(f, sample)));
    return loaded.every((faces) => faces.length > 0) && CARD_FONTS.every((f) => document.fonts.check(f, sample));
  } catch {
    return false;
  }
}

export type CardArt = { photo: CanvasImageSource | null; robots: Partial<Record<RobotPose, CanvasImageSource>> };

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let artPromise: Promise<CardArt> | null = null;

/** The robot photo and the SVG robot set as drawable images; missing art never blocks a card. */
export function loadCardArt(): Promise<CardArt> {
  artPromise ??= (async () => {
    const poses = Object.keys(ROBOT_LABELS) as RobotPose[];
    const [photo, ...robots] = await Promise.all([
      loadImage(CARD_PHOTO_SRC),
      ...poses.map((pose) => {
        const svg = robotSvg(pose, { id: `card-${pose}`, width: ROBOT_VIEWBOX.width * 3 });
        return loadImage(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })));
      }),
    ]);
    const out: CardArt = { photo, robots: {} };
    poses.forEach((pose, i) => {
      if (robots[i]) out.robots[pose] = robots[i]!;
    });
    return out;
  })();
  return artPromise;
}

type Ctx = CanvasRenderingContext2D;

function font(ctx: Ctx, weight: number, size: number, family: string, spacing = 0) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.letterSpacing = `${spacing}px`;
}

/** Greedy word wrap by measured width; a single word wider than the line is kept whole. */
function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Largest size from `sizes` whose wrapped lines fit maxWidth and maxHeight (at lineHeight × size). Below the list it
 * keeps shrinking rather than truncating, so every word of the data always lands on the card.
 */
function fitArea(ctx: Ctx, text: string, weight: number, family: string, sizes: number[], maxWidth: number, maxHeight: number, lineHeight: number) {
  const fits = (size: number) => {
    font(ctx, weight, size, family);
    const lines = wrap(ctx, text, maxWidth);
    const ok = lines.length * size * lineHeight <= maxHeight && lines.every((l) => ctx.measureText(l).width <= maxWidth);
    return { ok, lines };
  };
  for (const size of sizes) {
    const r = fits(size);
    if (r.ok) return { size, lines: r.lines };
  }
  let size = sizes[sizes.length - 1];
  let r = fits(size);
  while (!r.ok && size > 12) {
    size -= 2;
    r = fits(size);
  }
  return { size, lines: r.lines };
}

function halftone(ctx: Ctx, w: number, h: number, color: string, step: number, r: number) {
  ctx.fillStyle = color;
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function rotated(ctx: Ctx, x: number, y: number, deg: number, draw: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((deg * Math.PI) / 180);
  draw();
  ctx.restore();
}

/** A label in a filled box, centred on (x, y). */
function boxedLabel(ctx: Ctx, text: string, x: number, y: number, o: { size: number; family: string; weight: number; bg: string; fg: string; padX: number; padY: number; border?: string; spacing?: number; maxWidth?: number }) {
  font(ctx, o.weight, o.size, o.family, o.spacing ?? 0);
  let size = o.size;
  while (o.maxWidth && ctx.measureText(text).width + o.padX * 2 > o.maxWidth && size > 12) {
    size -= 2;
    font(ctx, o.weight, size, o.family, o.spacing ?? 0);
  }
  const w = ctx.measureText(text).width + o.padX * 2;
  const h = size + o.padY * 2;
  ctx.fillStyle = o.bg;
  ctx.fillRect(x - w / 2, y - h / 2, w, h);
  if (o.border) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = o.border;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  }
  ctx.fillStyle = o.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + size * 0.04);
  ctx.textBaseline = 'alphabetic';
  return { w, h };
}

function stamp(ctx: Ctx, text: string, x: number, y: number, size: number, color: string) {
  rotated(ctx, x, y, -8, () => {
    font(ctx, 400, size, ANTON, size * 0.06);
    const w = ctx.measureText(text).width + size * 0.7;
    const h = size * 1.3;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = Math.max(4, size * 0.1);
    ctx.strokeStyle = color;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, size * 0.05);
    ctx.textBaseline = 'alphabetic';
  });
}

const BURST = [
  [50, 0], [61, 14], [79, 7], [80, 25], [98, 28], [88, 44], [100, 58], [83, 66], [88, 85], [69, 83], [60, 100],
  [47, 86], [31, 97], [27, 79], [8, 80], [14, 62], [0, 50], [14, 38], [6, 20], [25, 19], [30, 2], [43, 14],
];

function burstPath(ctx: Ctx, x: number, y: number, size: number) {
  ctx.beginPath();
  BURST.forEach(([px, py], i) => {
    const X = x + (px / 100) * size;
    const Y = y + (py / 100) * size;
    if (i === 0) ctx.moveTo(X, Y);
    else ctx.lineTo(X, Y);
  });
  ctx.closePath();
}

function bandColor(band: string) {
  return band === 'low' ? C.blue : band === 'moderate' ? C.ink : C.red;
}

function shadowText(ctx: Ctx, text: string, x: number, y: number, fill: string, shadow: string, off: number, stroke?: { color: string; width: number }) {
  ctx.fillStyle = shadow;
  ctx.fillText(text, x + off, y + off);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  if (stroke) {
    ctx.lineWidth = stroke.width;
    ctx.strokeStyle = stroke.color;
    ctx.strokeText(text, x, y);
  }
}

/** Highlighter-block lines (the tabloid headline treatment). */
function highlightLines(ctx: Ctx, lines: string[], size: number, x: number, top: number, lh: number, align: 'center' | 'left', bg: string) {
  font(ctx, 400, size, ANTON);
  ctx.textAlign = align;
  lines.forEach((line, i) => {
    const y = top + size * 0.92 + i * lh;
    const lw = ctx.measureText(line).width;
    const left = align === 'center' ? x - lw / 2 : x;
    ctx.fillStyle = bg;
    ctx.fillRect(left - 12, y - size * 0.9, lw + 24, size * 1.02);
    ctx.fillStyle = C.ink;
    ctx.fillText(line, x, y);
  });
}

function drawImageBox(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, h: number, deg: number, shadow = C.red) {
  rotated(ctx, x + w / 2, y + h / 2, deg, () => {
    ctx.fillStyle = shadow;
    ctx.fillRect(-w / 2 + 14, -h / 2 + 14, w, h);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.lineWidth = 8;
    ctx.strokeStyle = C.ink;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  });
}

function speechBubble(ctx: Ctx, text: string, x: number, y: number, w: number, h: number, tailX: number, tailY: number, sizes: number[]) {
  ctx.fillStyle = C.white;
  ctx.strokeStyle = C.ink;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 28);
  ctx.fill();
  ctx.stroke();
  const baseX = Math.min(Math.max(tailX, x + 40), x + w - 80);
  const baseY = tailY > y + h ? y + h : y;
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.lineTo(tailX, tailY);
  ctx.lineTo(baseX + 44, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.white;
  ctx.fillRect(baseX + 4, baseY - 4, 36, 8);
  const pad = 24;
  const fit = fitArea(ctx, text, 900, ARCHIVO, sizes, w - pad * 2, h - pad * 2, 1.15);
  font(ctx, 900, fit.size, ARCHIVO);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  const block = fit.lines.length * fit.size * 1.15;
  fit.lines.forEach((line, i) => ctx.fillText(line, x + w / 2, y + (h - block) / 2 + fit.size * 0.95 + i * fit.size * 1.15));
}

function drawStory(ctx: Ctx, t: CardText, band: string, art: CardArt) {
  const { width: W, height: H } = CARD_SIZES.story;
  const cx = W / 2;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, W, H, 'rgba(228,0,43,0.14)', 26, 5);
  ctx.lineWidth = 16;
  ctx.strokeStyle = C.ink;
  ctx.strokeRect(8, 8, W - 16, H - 16);

  ctx.textAlign = 'center';
  font(ctx, 400, 150, ANTON);
  shadowText(ctx, t.masthead, cx, 190, C.red, C.ink, 9, { color: C.ink, width: 3 });
  ctx.fillStyle = C.ink;
  ctx.fillRect(48, 222, W - 96, 6);
  ctx.fillRect(48, 284, W - 96, 6);
  font(ctx, 900, 30, ARCHIVO, 4);
  ctx.fillText(t.strap, cx, 268);

  ctx.fillStyle = C.red;
  ctx.fillRect(16, 312, W - 32, 92);
  ctx.fillStyle = C.ink;
  ctx.fillRect(16, 404, W - 32, 8);
  boxedLabel(ctx, t.stinger, cx, 358, { size: 58, family: ANTON, weight: 400, bg: C.red, fg: C.white, padX: 20, padY: 6, spacing: 3, maxWidth: W - 80 });

  const head = fitArea(ctx, t.headline, 400, ANTON, [104, 96, 88, 80, 72, 64, 56], W - 120, 250, 1.06);
  font(ctx, 400, head.size, ANTON);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  const headBlock = head.lines.length * head.size * 1.06;
  head.lines.forEach((line, i) => ctx.fillText(line, cx, 440 + (250 - headBlock) / 2 + head.size * 0.92 + i * head.size * 1.06));

  rotated(ctx, 300, 735, -3, () => {
    boxedLabel(ctx, t.who, 0, 0, { size: 58, family: ANTON, weight: 400, bg: C.ink, fg: C.yellow, padX: 28, padY: 12, maxWidth: 520 });
  });

  ctx.textAlign = 'center';
  font(ctx, 400, 360, ANTON);
  shadowText(ctx, t.score, 300, 1100, bandColor(band), C.ink, 16);
  font(ctx, 900, 32, ARCHIVO, 5);
  ctx.fillStyle = C.ink;
  ctx.fillText(t.scoreLabel, 300, 1148);

  const photo = { x: 588, y: 690, size: 440 };
  if (art.photo) drawImageBox(ctx, art.photo, photo.x, photo.y, photo.size, photo.size, 3);
  speechBubble(ctx, t.robotLine, 560, 1150, 490, 150, 820, 1124, [44, 40, 36, 32, 28, 24]);

  const title = fitArea(ctx, t.title, 400, ANTON, [112, 100, 90, 80, 70, 62, 54], W - 140, 210, 1.08);
  const titleBlock = title.lines.length * title.size * 1.08;
  highlightLines(ctx, title.lines, title.size, cx, 1330 + (210 - titleBlock) / 2, title.size * 1.08, 'center', C.yellow);

  boxedLabel(ctx, t.rank, 330, 1574, { size: 32, family: ARCHIVO, weight: 900, bg: C.yellow, fg: C.ink, padX: 22, padY: 14, border: C.ink, spacing: 1, maxWidth: 600 });
  stamp(ctx, t.band, W - 230, 1574, 62, bandColor(band));

  // The roast and footer stop short of the right edge, where the cartoon robot stands.
  const textW = 800;
  const footerTop = H - 136;
  const roast = fitArea(ctx, t.roast, 400, MARKER, [46, 42, 38, 34, 30, 27, 24], textW, footerTop - 1666, 1.22);
  rotated(ctx, 56, 1656, -1.2, () => {
    font(ctx, 400, roast.size, MARKER);
    ctx.fillStyle = C.blue;
    ctx.textAlign = 'left';
    roast.lines.forEach((line, i) => ctx.fillText(line, 0, roast.size + i * roast.size * 1.22));
  });

  ctx.fillStyle = C.yellow;
  ctx.fillRect(16, footerTop, W - 32, H - 16 - footerTop);
  ctx.fillStyle = C.ink;
  ctx.fillRect(16, footerTop - 6, W - 32, 6);
  ctx.textAlign = 'left';
  font(ctx, 700, 26, ARCHIVO);
  ctx.fillText(`${t.stat} · ${t.bls}`, 44, footerTop + 48, textW);
  font(ctx, 900, 34, ARCHIVO, 1);
  ctx.fillText(t.url, 44, footerTop + 98, textW);

  const robot = art.robots[ROBOT_POSE_BY_BAND[band as keyof typeof ROBOT_POSE_BY_BAND]];
  if (robot) ctx.drawImage(robot, W - 210, H - 250, 180, 216);
}

function drawPost(ctx: Ctx, t: CardText, band: string, art: CardArt) {
  const { width: W, height: H } = CARD_SIZES.post;
  const pad = 52;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, W, H, 'rgba(11,11,11,0.09)', 6, 1);

  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  font(ctx, 900, 16, ARCHIVO, 2);
  ctx.fillText(t.strap, pad, 32);
  ctx.textAlign = 'center';
  font(ctx, 400, 80, ANTON);
  shadowText(ctx, t.masthead, W / 2, 108, C.red, C.ink, 5, { color: C.ink, width: 2 });
  ctx.fillStyle = C.ink;
  ctx.fillRect(pad, 122, W - pad * 2, 4);
  ctx.fillRect(pad, 130, W - pad * 2, 4);

  const leftW = 700;
  ctx.textAlign = 'left';
  font(ctx, 400, 26, ANTON, 2);
  const sw = Math.min(leftW, ctx.measureText(t.stinger).width + 28);
  ctx.fillStyle = C.red;
  ctx.fillRect(pad, 150, sw, 40);
  ctx.fillStyle = C.white;
  ctx.textBaseline = 'middle';
  ctx.fillText(t.stinger, pad + 14, 171, leftW - 28);
  font(ctx, 400, 26, ANTON, 1);
  const ww = ctx.measureText(t.who).width + 28;
  ctx.fillStyle = C.ink;
  ctx.fillRect(pad + sw + 12, 150, ww, 40);
  ctx.fillStyle = C.yellow;
  ctx.fillText(t.who, pad + sw + 26, 171);
  ctx.textBaseline = 'alphabetic';

  const title = fitArea(ctx, t.title, 400, ANTON, [60, 54, 48, 42, 38, 34], leftW, 140, 1.1);
  highlightLines(ctx, title.lines, title.size, pad, 206, title.size * 1.1, 'left', C.yellow);
  const roastTop = 206 + title.lines.length * title.size * 1.1 + 14;
  const roast = fitArea(ctx, t.roast, 400, MARKER, [30, 27, 24, 22, 20, 18], leftW, 528 - roastTop, 1.2);
  font(ctx, 400, roast.size, MARKER);
  ctx.fillStyle = C.blue;
  ctx.textAlign = 'left';
  roast.lines.forEach((line, i) => ctx.fillText(line, pad, roastTop + roast.size + i * roast.size * 1.2));

  const size = 250;
  const bx = 820;
  const by = 146;
  ctx.save();
  ctx.translate(8, 8);
  burstPath(ctx, bx, by, size);
  ctx.fillStyle = C.ink;
  ctx.fill();
  ctx.restore();
  burstPath(ctx, bx, by, size);
  ctx.fillStyle = bandColor(band);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  const cx = bx + size / 2;
  ctx.textAlign = 'center';
  font(ctx, 400, 130, ANTON);
  shadowText(ctx, t.score, cx, by + 166, C.white, C.ink, 4);
  font(ctx, 900, 13, ARCHIVO, 2);
  ctx.fillStyle = C.white;
  ctx.fillText(t.scoreLabel, cx, by + 194);
  stamp(ctx, t.band, cx - 20, by + size + 34, 38, bandColor(band));
  font(ctx, 700, 18, ARCHIVO);
  ctx.fillStyle = C.ink;
  ctx.fillText(t.rank.charAt(0) + t.rank.slice(1).toLowerCase(), cx - 20, by + size + 92);

  ctx.fillStyle = C.yellow;
  ctx.fillRect(0, H - 82, W, 82);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, H - 86, W, 4);
  ctx.textAlign = 'left';
  font(ctx, 900, 22, ARCHIVO);
  ctx.fillText(t.robotLine, pad, H - 48, 760);
  font(ctx, 700, 17, ARCHIVO);
  ctx.fillText(`${t.stat} · ${t.bls}`, pad, H - 20, 760);
  ctx.textAlign = 'right';
  font(ctx, 900, 22, ARCHIVO);
  ctx.fillText(t.url, W - 180, H - 34);

  const robot = art.robots[ROBOT_POSE_BY_BAND[band as keyof typeof ROBOT_POSE_BY_BAND]];
  if (robot) ctx.drawImage(robot, W - 160, H - 200, 140, 168);
}

/** Draws a share card onto `canvas`, resizing it to the card's exact pixel size. */
export function drawCard(canvas: HTMLCanvasElement, kind: CardKind, view: VerdictView, art: CardArt = { photo: null, robots: {} }): CardText {
  const { width, height } = CARD_SIZES[kind];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const text = cardText(view);
  if (!ctx) return text;
  ctx.clearRect(0, 0, width, height);
  if (kind === 'story') drawStory(ctx, text, view.band, art);
  else drawPost(ctx, text, view.band, art);
  return text;
}

export function cardFileName(slug: string, kind: CardKind): string {
  return `daily-doom-${slug}-${kind}.png`;
}

export function cardAlt(view: VerdictView, kind: CardKind): string {
  const t = cardText(view);
  const { width, height } = CARD_SIZES[kind];
  return `${kind === 'story' ? 'Story' : 'Post'} card, ${width} by ${height}: ${view.who}, ${view.title}, Doom Score ${view.score} out of 100, ${view.bandLabel}. ${view.headline}. ${view.roast} A robot says ${t.robotLine}. ${t.stat}. ${t.url}`;
}
