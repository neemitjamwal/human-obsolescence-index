import type { LineupView, RankedEntry } from './lineup';
import { ANTON, ARCHIVO, C, CARD_SIZES, MARKER, bandColor, boxedLabel, fitArea, font, halftone, loadImage, rotated, shadowText, speechBubble, stamp, type CardKind, type Ctx } from './card';
import { ROBOT_VIEWBOX, robotSvg } from './robots';
import { SITE_DOMAIN } from './site';
import { LINEUP_STINGER } from '../data/lineup';

export type LineupCardRow = {
  placard: string;
  who: string;
  title: string;
  score: string;
  band: string;
  boss: boolean;
  first: boolean;
};

export type LineupCardText = {
  masthead: string;
  strap: string;
  stinger: string;
  headline: string;
  subhead: string;
  rows: LineupCardRow[];
  scoreLabel: string;
  bossLabel: string;
  firstLabel: string;
  robotLine: string;
  quip: string;
  scoreLine: string;
  url: string;
};

/** Every string a lineup card prints, all from the lineup view. Cards carry the site URL, not the disclaimer. */
export function lineupCardText(v: LineupView, edition: string): LineupCardText {
  const row = (e: RankedEntry): LineupCardRow => ({
    placard: e.placard.toUpperCase(),
    who: e.who.toUpperCase(),
    title: e.title.toUpperCase(),
    score: String(e.obs),
    band: e.band,
    boss: e.role === 'boss',
    first: e.rank === 1,
  });
  return {
    masthead: 'THE DAILY DOOM',
    strap: `HUMAN OBSOLESCENCE INDEX · ${edition} EDITION`,
    stinger: LINEUP_STINGER.toUpperCase(),
    headline: v.headline.toUpperCase(),
    subhead: v.subhead.toUpperCase(),
    rows: v.entries.map(row),
    scoreLabel: 'DOOM SCORE',
    bossLabel: 'BOSS',
    firstLabel: v.topTied ? 'TIED FIRST' : 'PICKED FIRST',
    robotLine: `“${v.robotLine}”`,
    quip: v.quip,
    scoreLine: v.scoreLine.toUpperCase(),
    url: SITE_DOMAIN,
  };
}

export type LineupArt = { robot: CanvasImageSource | null };

let artPromise: Promise<LineupArt> | null = null;

export function loadLineupArt(): Promise<LineupArt> {
  artPromise ??= (async () => {
    const svg = robotSvg('pointing', { id: 'lineup-card-pointing', width: ROBOT_VIEWBOX.width * 3 });
    return { robot: await loadImage(URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))) };
  })();
  return artPromise;
}

/** The lineup wall: evenly spaced height-chart rules with no numbers on them. */
function heightChart(ctx: Ctx, x: number, y: number, w: number, h: number, step: number) {
  ctx.fillStyle = '#ece6cf';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(11,11,11,0.45)';
  for (let ly = y + step, i = 1; ly < y + h; ly += step, i++) {
    ctx.lineWidth = i % 4 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.ink;
  ctx.strokeRect(x, y, w, h);
}

/** A plain head-and-shoulders silhouette, the same for everyone in the lineup. */
function silhouette(ctx: Ctx, cx: number, top: number, h: number, color: string) {
  const r = h * 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, top + r, r, 0, Math.PI * 2);
  ctx.fill();
  const sw = h * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx - sw, top + h);
  ctx.quadraticCurveTo(cx - sw, top + r * 2.3, cx, top + r * 2.3);
  ctx.quadraticCurveTo(cx + sw, top + r * 2.3, cx + sw, top + h);
  ctx.closePath();
  ctx.fill();
}

function drawStory(ctx: Ctx, t: LineupCardText, art: LineupArt) {
  const { width: W, height: H } = CARD_SIZES.story;
  const cx = W / 2;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, W, H, 'rgba(228,0,43,0.12)', 26, 5);
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
  boxedLabel(ctx, t.stinger, cx, 358, { size: 50, family: ANTON, weight: 400, bg: C.ink, fg: C.yellow, padX: 20, padY: 6, spacing: 3, maxWidth: W - 80 });

  const head = fitArea(ctx, t.headline, 400, ANTON, [104, 94, 84, 74, 66, 58, 50], W - 120, 220, 1.04);
  font(ctx, 400, head.size, ANTON);
  const headBlock = head.lines.length * head.size * 1.04;
  head.lines.forEach((line, i) => {
    const y = 428 + (220 - headBlock) / 2 + head.size * 0.92 + i * head.size * 1.04;
    const lw = ctx.measureText(line).width;
    ctx.fillStyle = C.yellow;
    ctx.fillRect(cx - lw / 2 - 12, y - head.size * 0.9, lw + 24, head.size * 1.0);
    ctx.fillStyle = C.ink;
    ctx.textAlign = 'center';
    ctx.fillText(line, cx, y);
  });
  font(ctx, 900, 34, ARCHIVO, 1);
  ctx.fillStyle = C.red;
  ctx.fillText(t.subhead, cx, 700, W - 120);

  const wall = { x: 40, y: 730, w: W - 80, h: 900 };
  heightChart(ctx, wall.x, wall.y, wall.w, wall.h, 45);
  const n = t.rows.length;
  const gap = 18;
  const rowH = Math.min(190, (wall.h - 40 - gap * (n - 1)) / n);
  const top = wall.y + (wall.h - (rowH * n + gap * (n - 1))) / 2;
  t.rows.forEach((r, i) => {
    const y = top + i * (rowH + gap);
    const x = wall.x + 24;
    const w = wall.w - 48;
    rotated(ctx, x + w / 2, y + rowH / 2, i % 2 ? 0.6 : -0.6, () => {
      const l = -w / 2;
      const tp = -rowH / 2;
      ctx.fillStyle = C.ink;
      ctx.fillRect(l + 8, tp + 8, w, rowH);
      ctx.fillStyle = r.first ? C.yellow : C.white;
      ctx.fillRect(l, tp, w, rowH);
      ctx.lineWidth = 5;
      ctx.strokeStyle = C.ink;
      ctx.strokeRect(l, tp, w, rowH);
      silhouette(ctx, l + 64, tp + rowH * 0.3, rowH * 0.7, C.ink);
      const pw = 190;
      const ph = Math.min(76, rowH * 0.45);
      ctx.fillStyle = C.ink;
      ctx.fillRect(l + 136, tp + 14, pw, ph);
      ctx.textAlign = 'center';
      ctx.fillStyle = C.white;
      font(ctx, 400, r.placard.length > 4 ? ph * 0.55 : ph * 0.8, ANTON, 1);
      ctx.fillText(r.placard, l + 136 + pw / 2, tp + 14 + ph * 0.8, pw - 16);
      const textX = l + 136;
      const textW = w - 136 - 230;
      ctx.textAlign = 'left';
      const whoSize = Math.min(52, rowH * 0.3);
      font(ctx, 400, whoSize, ANTON, 1);
      ctx.fillStyle = C.ink;
      const whoY = tp + 14 + ph + whoSize * 0.95;
      ctx.fillText(r.who, textX, whoY, textW - (r.boss ? 120 : 0));
      if (r.boss) {
        const ww = Math.min(ctx.measureText(r.who).width, textW - 120);
        boxedLabel(ctx, t.bossLabel, textX + ww + 64, whoY - whoSize * 0.36, { size: whoSize * 0.6, family: ANTON, weight: 400, bg: C.red, fg: C.white, padX: 10, padY: 4, spacing: 2 });
      }
      const titleH = rowH - (whoY - tp) - 10;
      const title = fitArea(ctx, r.title, 900, ARCHIVO, [28, 25, 22, 20, 18, 16], textW, Math.max(titleH, 20), 1.1);
      font(ctx, 900, title.size, ARCHIVO);
      ctx.textAlign = 'left';
      ctx.fillStyle = C.ink;
      title.lines.forEach((line, k) => ctx.fillText(line, textX, whoY + 6 + title.size + k * title.size * 1.1));
      const scoreSize = Math.min(130, rowH * 0.72);
      ctx.textAlign = 'center';
      font(ctx, 400, scoreSize, ANTON);
      shadowText(ctx, r.score, l + w - 110, tp + rowH * 0.5 + scoreSize * 0.36, bandColor(r.band), C.ink, 5);
      font(ctx, 900, 18, ARCHIVO, 2);
      ctx.fillStyle = C.ink;
      ctx.fillText(t.scoreLabel, l + w - 110, tp + rowH - 12);
    });
    if (r.first) stamp(ctx, t.firstLabel, wall.x + wall.w - 300, y + 18, 34, C.red);
  });

  if (art.robot) ctx.drawImage(art.robot, 60, 1630, 150, 180);
  speechBubble(ctx, t.robotLine, 250, 1650, 760, 120, 210, 1720, [40, 36, 32, 28, 24]);

  const footerTop = H - 110;
  ctx.fillStyle = C.yellow;
  ctx.fillRect(16, footerTop, W - 32, H - 16 - footerTop);
  ctx.fillStyle = C.ink;
  ctx.fillRect(16, footerTop - 6, W - 32, 6);
  ctx.textAlign = 'left';
  font(ctx, 700, 24, ARCHIVO);
  ctx.fillText(t.scoreLine, 44, footerTop + 40, W - 100);
  font(ctx, 900, 34, ARCHIVO, 1);
  ctx.fillText(t.url, 44, footerTop + 82, W - 100);
}

function drawPost(ctx: Ctx, t: LineupCardText, art: LineupArt) {
  const { width: W, height: H } = CARD_SIZES.post;
  const pad = 40;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  halftone(ctx, W, H, 'rgba(11,11,11,0.09)', 6, 1);

  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  font(ctx, 900, 14, ARCHIVO, 2);
  ctx.fillText(t.strap, pad, 28);
  font(ctx, 400, 50, ANTON);
  shadowText(ctx, t.masthead, pad, 80, C.red, C.ink, 4, { color: C.ink, width: 2 });
  font(ctx, 400, 22, ANTON, 2);
  const sw = Math.min(W - 520, ctx.measureText(t.stinger).width + 24);
  ctx.fillStyle = C.ink;
  ctx.fillRect(pad + 390, 48, sw, 34);
  ctx.fillStyle = C.yellow;
  ctx.textBaseline = 'middle';
  ctx.fillText(t.stinger, pad + 402, 66, sw - 24);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = C.ink;
  ctx.fillRect(pad, 94, W - pad * 2, 4);

  const head = fitArea(ctx, t.headline, 400, ANTON, [40, 36, 32, 28, 24], W - pad * 2 - 180, 46, 1.05);
  font(ctx, 400, head.size, ANTON);
  ctx.textAlign = 'left';
  const line = head.lines.join(' ');
  const lw = Math.min(ctx.measureText(line).width, W - pad * 2 - 180);
  ctx.fillStyle = C.yellow;
  ctx.fillRect(pad - 6, 108, lw + 12, head.size * 1.05);
  ctx.fillStyle = C.ink;
  ctx.fillText(line, pad, 108 + head.size * 0.9, W - pad * 2 - 180);
  font(ctx, 900, 17, ARCHIVO, 1);
  ctx.fillStyle = C.red;
  ctx.fillText(t.subhead, pad, 108 + head.size * 1.05 + 22, W - pad * 2 - 180);
  if (art.robot) ctx.drawImage(art.robot, W - pad - 120, 100, 110, 132);

  const wall = { x: pad, y: 200, w: W - pad * 2 - 130, h: 330 };
  heightChart(ctx, wall.x, wall.y, wall.w, wall.h, 22);
  const n = t.rows.length;
  const gap = 12;
  const colW = (wall.w - 24 - gap * (n - 1)) / n;
  t.rows.forEach((r, i) => {
    const x = wall.x + 12 + i * (colW + gap);
    const y = wall.y + 12;
    const h = wall.h - 24;
    ctx.fillStyle = r.first ? C.yellow : C.white;
    ctx.fillRect(x, y, colW, h);
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.ink;
    ctx.strokeRect(x, y, colW, h);
    const cxc = x + colW / 2;
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 8, y + 8, colW - 16, 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = C.white;
    font(ctx, 400, 22, ANTON, 1);
    ctx.fillText(r.placard, cxc, y + 31, colW - 24);
    silhouette(ctx, cxc, y + 44, 64, C.ink);
    font(ctx, 400, 84, ANTON);
    shadowText(ctx, r.score, cxc, y + 190, bandColor(r.band), C.ink, 3);
    font(ctx, 900, 11, ARCHIVO, 1);
    ctx.fillStyle = C.ink;
    ctx.fillText(t.scoreLabel, cxc, y + 206);
    const who = fitArea(ctx, r.who, 400, ANTON, [24, 22, 20, 18, 16], colW - 16, 26, 1.05);
    font(ctx, 400, who.size, ANTON, 1);
    ctx.fillText(who.lines.join(' '), cxc, y + 234, colW - 12);
    const title = fitArea(ctx, r.title, 900, ARCHIVO, [14, 13, 12, 11, 10], colW - 14, h - 248 - (r.boss ? 22 : 0), 1.1);
    font(ctx, 900, title.size, ARCHIVO);
    title.lines.forEach((ln, k) => ctx.fillText(ln, cxc, y + 252 + k * title.size * 1.1, colW - 10));
    if (r.boss) boxedLabel(ctx, t.bossLabel, cxc, y + h - 16, { size: 16, family: ANTON, weight: 400, bg: C.red, fg: C.white, padX: 8, padY: 3, spacing: 2 });
  });
  t.rows.forEach((r, i) => {
    if (r.first) stamp(ctx, t.firstLabel, wall.x + 12 + i * (colW + gap) + colW / 2, wall.y + 4, 18, C.red);
  });
  ctx.textAlign = 'left';
  const quip = fitArea(ctx, t.quip, 400, MARKER, [17, 15, 14, 13, 12], 118, 290, 1.2);
  font(ctx, 400, quip.size, MARKER);
  ctx.fillStyle = '#0b3bd6';
  quip.lines.forEach((ln, k) => ctx.fillText(ln, W - pad - 118, 252 + quip.size + k * quip.size * 1.2));

  ctx.fillStyle = C.yellow;
  ctx.fillRect(0, H - 76, W, 76);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, H - 80, W, 4);
  ctx.textAlign = 'left';
  font(ctx, 900, 19, ARCHIVO);
  ctx.fillText(t.robotLine, pad, H - 44, 780);
  font(ctx, 700, 15, ARCHIVO);
  ctx.fillText(t.scoreLine, pad, H - 18, 780);
  ctx.textAlign = 'right';
  font(ctx, 900, 22, ARCHIVO);
  ctx.fillText(t.url, W - pad, H - 30);
}

export function drawLineupCard(canvas: HTMLCanvasElement, kind: CardKind, v: LineupView, edition: string, art: LineupArt = { robot: null }): LineupCardText {
  const { width, height } = CARD_SIZES[kind];
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const text = lineupCardText(v, edition);
  if (!ctx) return text;
  ctx.clearRect(0, 0, width, height);
  if (kind === 'story') drawStory(ctx, text, art);
  else drawPost(ctx, text, art);
  return text;
}

export function lineupCardFileName(v: LineupView, kind: CardKind): string {
  return `daily-doom-office-lineup-${v.entries[0].slug}-${v.count}-${kind}.png`;
}

export function lineupCardAlt(v: LineupView, kind: CardKind): string {
  const { width, height } = CARD_SIZES[kind];
  const rows = v.entries
    .map((e) => `${e.placard}: ${e.who}${e.role === 'boss' && e.name ? ' (the boss)' : ''}, ${e.title}, Doom Score ${e.obs}`)
    .join('; ');
  return `${kind === 'story' ? 'Story' : 'Post'} police-lineup card, ${width} by ${height}: ${v.headline}. ${rows}. A cartoon robot points and says “${v.robotLine}” ${SITE_DOMAIN}`;
}
