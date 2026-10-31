import { ART, artSrc } from '../data/art';
import type { BattleView, FighterView } from './battle';
import {
  ANTON,
  ARCHIVO,
  C,
  CARD_SIZES,
  MARKER,
  boxedLabel,
  drawImageBox,
  fitArea,
  font,
  halftone,
  loadImage,
  rotated,
  shadowText,
  speechBubble,
  type CardKind,
  type Ctx,
} from './card';
import { ROBOT_VIEWBOX, robotSvg } from './robots';
import { SITE_DOMAIN } from './site';

const PINK = '#ff8fb1';

/** Same-origin art, so the canvas stays exportable. */
export const BATTLE_PHOTO_SRC = artSrc(ART.battleExecutioner, 640, 'webp');

export type BattleCardText = {
  masthead: string;
  strap: string;
  stinger: string;
  headline: string;
  scoreLine: string;
  a: { score: string; title: string; tag: string; fate: FighterView['fate']; stat: string };
  b: { score: string; title: string; tag: string; fate: FighterView['fate']; stat: string };
  referee: string;
  quip: string;
  pinkSlip: string;
  url: string;
};

/** Every string a battle card prints, all from the battle view. Cards carry the site URL, not the disclaimer. */
export function battleCardText(v: BattleView, edition: string): BattleCardText {
  const side = (f: FighterView) => ({ score: f.score, title: f.title.toUpperCase(), tag: f.tag.toUpperCase(), fate: f.fate, stat: f.changeLine });
  return {
    masthead: 'THE DAILY DOOM',
    strap: `HUMAN OBSOLESCENCE INDEX · ${edition} EDITION`,
    stinger: "WHO'S SAFER? · FIGHT NIGHT",
    headline: v.headline.toUpperCase(),
    scoreLine: v.scoreLine.toUpperCase(),
    a: side(v.a),
    b: side(v.b),
    referee: `“${v.referee}”`,
    quip: v.quip,
    pinkSlip: 'PINK SLIP',
    url: SITE_DOMAIN,
  };
}

export type BattleArt = { photo: CanvasImageSource | null; slipRobot: CanvasImageSource | null };

let artPromise: Promise<BattleArt> | null = null;

export function loadBattleArt(): Promise<BattleArt> {
  artPromise ??= (async () => {
    const svg = robotSvg('pinkslip', { id: 'battle-card-pinkslip', width: ROBOT_VIEWBOX.width * 3 });
    const [photo, slipRobot] = await Promise.all([
      loadImage(BATTLE_PHOTO_SRC),
      loadImage(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))),
    ]);
    return { photo, slipRobot };
  })();
  return artPromise;
}

/** The pink slip stapled to the safer job's opponent: a tilted pink form with the label. */
function pinkSlip(ctx: Ctx, cx: number, cy: number, w: number, label: string) {
  const h = w * 0.44;
  rotated(ctx, cx, cy, 5, () => {
    ctx.fillStyle = C.ink;
    ctx.fillRect(-w / 2 + 8, -h / 2 + 8, w, h);
    ctx.fillStyle = PINK;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = Math.max(3, w * 0.025);
    ctx.strokeStyle = C.ink;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    font(ctx, 400, w * 0.19, ANTON, 2);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, h * 0.06, w * 0.9);
    font(ctx, 900, w * 0.06, ARCHIVO, 1);
    ctx.fillText('ISSUED BY: THE ROBOTS', 0, h * 0.34, w * 0.88);
  });
}

function tile(
  ctx: Ctx,
  f: BattleCardText['a'],
  o: { x: number; y: number; w: number; h: number; bg: string; deg: number; scoreSize: number; titleSizes: number[]; tagSize: number; statSize: number },
) {
  rotated(ctx, o.x + o.w / 2, o.y + o.h / 2, o.deg, () => {
    const left = -o.w / 2;
    const top = -o.h / 2;
    ctx.fillStyle = C.ink;
    ctx.fillRect(left + 12, top + 12, o.w, o.h);
    ctx.fillStyle = o.bg;
    ctx.fillRect(left, top, o.w, o.h);
    ctx.lineWidth = 6;
    ctx.strokeStyle = C.white;
    ctx.strokeRect(left + 8, top + 8, o.w - 16, o.h - 16);
    ctx.textAlign = 'center';
    font(ctx, 400, o.scoreSize, ANTON);
    shadowText(ctx, f.score, 0, top + o.scoreSize * 0.95, C.white, C.ink, Math.round(o.scoreSize * 0.04));
    font(ctx, 900, o.statSize, ARCHIVO, 1);
    ctx.fillStyle = C.white;
    ctx.fillText('DOOM SCORE / 100', 0, top + o.scoreSize * 1.12);
    const titleTop = top + o.scoreSize * 1.22;
    const titleH = o.h - (titleTop - top) - o.tagSize * 2.6 - o.statSize * 1.6;
    const t = fitArea(ctx, f.title, 900, ARCHIVO, o.titleSizes, o.w - 40, titleH, 1.12);
    font(ctx, 900, t.size, ARCHIVO);
    ctx.fillStyle = C.white;
    t.lines.forEach((line, i) => ctx.fillText(line, 0, titleTop + t.size + i * t.size * 1.12));
    font(ctx, 700, o.statSize, ARCHIVO);
    ctx.fillText(f.stat, 0, top + o.h - o.tagSize * 2.3, o.w - 30);
    if (f.fate !== 'pinkslip') {
      boxedLabel(ctx, f.tag, 0, top + o.h - o.tagSize * 1.1, {
        size: o.tagSize,
        family: ANTON,
        weight: 400,
        bg: f.fate === 'safer' ? C.yellow : C.white,
        fg: C.ink,
        padX: o.tagSize * 0.4,
        padY: o.tagSize * 0.12,
        border: C.ink,
        spacing: 2,
      });
    }
  });
}

function drawStory(ctx: Ctx, t: BattleCardText, art: BattleArt) {
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

  ctx.fillStyle = C.ink;
  ctx.fillRect(16, 312, W - 32, 92);
  boxedLabel(ctx, t.stinger, cx, 358, { size: 58, family: ANTON, weight: 400, bg: C.ink, fg: C.yellow, padX: 20, padY: 6, spacing: 3, maxWidth: W - 80 });

  const head = fitArea(ctx, t.headline, 400, ANTON, [112, 100, 90, 80, 70, 62, 54], W - 120, 250, 1.04);
  font(ctx, 400, head.size, ANTON);
  const headBlock = head.lines.length * head.size * 1.04;
  head.lines.forEach((line, i) => {
    const y = 432 + (250 - headBlock) / 2 + head.size * 0.92 + i * head.size * 1.04;
    const lw = ctx.measureText(line).width;
    ctx.fillStyle = C.yellow;
    ctx.fillRect(cx - lw / 2 - 12, y - head.size * 0.9, lw + 24, head.size * 1.0);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(line, cx, y);
  });

  const tileY = 730;
  const tileW = 440;
  const tileH = 560;
  const common = { y: tileY, w: tileW, h: tileH, scoreSize: 230, titleSizes: [46, 40, 36, 32, 28, 24], tagSize: 54, statSize: 28 };
  tile(ctx, t.a, { ...common, x: 48, bg: C.red, deg: -2 });
  tile(ctx, t.b, { ...common, x: W - 48 - tileW, bg: C.blue, deg: 2 });
  ctx.beginPath();
  ctx.arc(cx, tileY + 250, 72, 0, Math.PI * 2);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  font(ctx, 400, 80, ANTON);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText('VS', cx, tileY + 280);

  const loser = t.a.fate === 'pinkslip' ? 'a' : t.b.fate === 'pinkslip' ? 'b' : null;
  if (loser) {
    const sx = loser === 'a' ? 48 + tileW / 2 : W - 48 - tileW / 2;
    pinkSlip(ctx, sx, tileY + tileH + 4, 320, t.pinkSlip);
  }

  const photo = { x: 56, y: 1390, w: 264, h: 396 };
  if (art.photo) drawImageBox(ctx, art.photo, photo.x, photo.y, photo.w, photo.h, -2);
  speechBubble(ctx, t.referee, 380, 1400, 640, 170, 340, 1490, [44, 40, 36, 32, 28, 24]);
  const quip = fitArea(ctx, t.quip, 400, MARKER, [42, 38, 34, 30, 27, 24], 460, 170, 1.2);
  rotated(ctx, 390, 1600, -1.5, () => {
    font(ctx, 400, quip.size, MARKER);
    ctx.fillStyle = C.blue;
    ctx.textAlign = 'left';
    quip.lines.forEach((line, i) => ctx.fillText(line, 0, quip.size + i * quip.size * 1.2));
  });
  if (art.slipRobot && loser) ctx.drawImage(art.slipRobot, W - 190, 1600, 140, 168);

  const footerTop = H - 120;
  ctx.fillStyle = C.yellow;
  ctx.fillRect(16, footerTop, W - 32, H - 16 - footerTop);
  ctx.fillStyle = C.ink;
  ctx.fillRect(16, footerTop - 6, W - 32, 6);
  ctx.textAlign = 'left';
  font(ctx, 900, 30, ARCHIVO, 1);
  ctx.fillText(t.scoreLine, 44, footerTop + 46, W - 100);
  font(ctx, 900, 36, ARCHIVO, 1);
  ctx.fillText(t.url, 44, footerTop + 92, W - 100);
}

function drawPost(ctx: Ctx, t: BattleCardText, art: BattleArt) {
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
  font(ctx, 400, 72, ANTON);
  shadowText(ctx, t.masthead, W / 2, 100, C.red, C.ink, 5, { color: C.ink, width: 2 });
  ctx.fillStyle = C.ink;
  ctx.fillRect(pad, 112, W - pad * 2, 4);
  ctx.fillRect(pad, 120, W - pad * 2, 4);

  const leftW = 780;
  ctx.textAlign = 'left';
  font(ctx, 400, 24, ANTON, 2);
  const sw = ctx.measureText(t.stinger).width + 28;
  ctx.fillStyle = C.ink;
  ctx.fillRect(pad, 136, sw, 36);
  ctx.fillStyle = C.yellow;
  ctx.textBaseline = 'middle';
  ctx.fillText(t.stinger, pad + 14, 155);
  ctx.textBaseline = 'alphabetic';
  const head = fitArea(ctx, t.headline, 400, ANTON, [48, 42, 38, 34, 30], leftW, 100, 1.05);
  font(ctx, 400, head.size, ANTON);
  head.lines.forEach((line, i) => {
    const y = 186 + head.size * 0.92 + i * head.size * 1.05;
    const lw = ctx.measureText(line).width;
    ctx.fillStyle = C.yellow;
    ctx.fillRect(pad - 8, y - head.size * 0.9, lw + 16, head.size * 1.0);
    ctx.fillStyle = C.ink;
    ctx.fillText(line, pad, y);
  });

  const tileY = 300;
  const tileW = 330;
  const tileH = 220;
  const common = { y: tileY, w: tileW, h: tileH, scoreSize: 96, titleSizes: [22, 20, 18, 16, 14], tagSize: 24, statSize: 14 };
  tile(ctx, t.a, { ...common, x: pad, bg: C.red, deg: -2 });
  tile(ctx, t.b, { ...common, x: pad + tileW + 110, bg: C.blue, deg: 2 });
  const vx = pad + tileW + 55;
  ctx.beginPath();
  ctx.arc(vx, tileY + 90, 38, 0, Math.PI * 2);
  ctx.fillStyle = C.yellow;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = C.ink;
  ctx.stroke();
  font(ctx, 400, 42, ANTON);
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'center';
  ctx.fillText('VS', vx, tileY + 105);
  if (art.photo) drawImageBox(ctx, art.photo, 896, 146, 250, 375, 2);

  ctx.fillStyle = C.yellow;
  ctx.fillRect(0, H - 76, W, 76);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, H - 80, W, 4);
  ctx.textAlign = 'left';
  font(ctx, 900, 20, ARCHIVO);
  ctx.fillText(t.referee, pad, H - 44, 780);
  font(ctx, 700, 17, ARCHIVO);
  ctx.fillText(t.scoreLine, pad, H - 18, 780);
  ctx.textAlign = 'right';
  font(ctx, 900, 22, ARCHIVO);
  ctx.fillText(t.url, W - pad, H - 30);
  // Drawn last so the slip overlaps the footer rule like a sticker instead of disappearing under it.
  const loser = t.a.fate === 'pinkslip' ? 'a' : t.b.fate === 'pinkslip' ? 'b' : null;
  if (loser) pinkSlip(ctx, loser === 'a' ? pad + tileW / 2 : pad + tileW * 1.5 + 110, tileY + tileH, 170, t.pinkSlip);
}

export function drawBattleCard(canvas: HTMLCanvasElement, kind: CardKind, v: BattleView, edition: string, art: BattleArt = { photo: null, slipRobot: null }): BattleCardText {
  const { width, height } = CARD_SIZES[kind];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const text = battleCardText(v, edition);
  if (!ctx) return text;
  ctx.clearRect(0, 0, width, height);
  if (kind === 'story') drawStory(ctx, text, art);
  else drawPost(ctx, text, art);
  return text;
}

export function battleCardFileName(v: BattleView, kind: CardKind): string {
  return `daily-doom-${v.key}-${kind}.png`;
}

export function battleCardAlt(v: BattleView, kind: CardKind): string {
  const { width, height } = CARD_SIZES[kind];
  const slip = v.pinkSlipTitle ? ` A robot referee hands the pink slip to ${v.pinkSlipTitle}.` : ' A robot referee holds the pink slip.';
  return `${kind === 'story' ? 'Story' : 'Post'} battle card, ${width} by ${height}: ${v.a.title}, Doom Score ${v.a.score}, versus ${v.b.title}, Doom Score ${v.b.score}. ${v.headline}.${slip} ${SITE_DOMAIN}`;
}
