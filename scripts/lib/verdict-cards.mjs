export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// "The Daily Doom" palette (library/design-direction.md).
const C = {
  ink: '#0b0b0b',
  paper: '#fffbea',
  yellow: '#ffe500',
  red: '#e4002b',
  blue: '#1f5bff',
  white: '#ffffff',
  muted: '#3d3a33',
};

const DISPLAY = "Anton, Impact, 'Arial Narrow', 'DejaVu Sans Condensed', sans-serif";
const BODY = "Archivo, 'Arial Black', Arial, 'DejaVu Sans', sans-serif";
const MONO_EM = 0.6;

// Mirrors scoreBand() in src/lib/ledger.ts (a test keeps the two in step).
export const BANDS = [
  { id: 'severe', label: 'Severe', min: 75, color: C.red },
  { id: 'elevated', label: 'Elevated', min: 50, color: C.red },
  { id: 'moderate', label: 'Moderate', min: 25, color: C.ink },
  { id: 'low', label: 'Low', min: 0, color: C.blue },
];

const CATEGORY_COLORS = {
  'Very high': { bg: C.red, fg: C.white },
  High: { bg: C.ink, fg: C.yellow },
  Moderate: { bg: C.yellow, fg: C.ink },
  Low: { bg: C.blue, fg: C.white },
};

export function bandFor(score) {
  const s = Math.min(100, Math.max(0, Math.round(score)));
  return BANDS.find((b) => s >= b.min) ?? BANDS[BANDS.length - 1];
}

export function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** Greedy word wrap by character budget; SVG text has no layout engine. */
export function wrapText(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest font size whose wrap fits in maxLines; the last resort truncates with an ellipsis. */
export function fitTitle(text, { width, sizes, maxLines }) {
  for (const size of sizes) {
    const lines = wrapText(text, Math.floor(width / (size * MONO_EM)));
    if (lines.length <= maxLines && lines.every((l) => l.length * size * MONO_EM <= width)) return { size, lines };
  }
  const size = sizes.at(-1);
  const lines = wrapText(text, Math.floor(width / (size * MONO_EM)));
  const kept = lines.slice(0, maxLines);
  if (lines.length > maxLines) kept[maxLines - 1] = `${kept[maxLines - 1].replace(/[\s.,;:]+$/, '')}…`;
  return { size, lines: kept };
}

/**
 * One verdict card per occupation, plus the site card used by every other page.
 * @param {{ meta: any; occupations: any[] }} data occupations.json
 */
export function buildCards(data) {
  const { meta, occupations } = data;
  const cards = occupations.map((o) => {
    const obs = o.scores.obs.value;
    if (obs == null) throw new Error(`og-cards: ${o.slug} has no OBS score`);
    return {
      slug: o.slug,
      variant: 'verdict',
      edition: meta.edition,
      eyebrow:
        o.leaderboardRank != null
          ? `SOC ${o.soc} · RANK #${o.leaderboardRank} OF ${meta.leaderboard.size}`
          : `SOC ${o.soc} · TRACKED OFF-BOARD`,
      title: o.title,
      obs,
      band: bandFor(obs),
      category: o.blsCategory.value ?? null,
    };
  });
  const top = occupations.find((o) => o.leaderboardRank === 1);
  cards.push({
    slug: 'index',
    variant: 'site',
    edition: meta.edition,
    eyebrow: `${meta.edition} EDITION · ${meta.leaderboard.size} OCCUPATIONS RANKED`,
    title: 'Human Obsolescence Index',
    obs: top.scores.obs.value,
    band: bandFor(top.scores.obs.value),
    category: null,
    topTitle: top.title,
  });
  return cards;
}

// Starburst outline from the mockup's clip-path, as fractions of the bounding box.
const BURST = [
  [50, 0], [61, 14], [79, 7], [80, 25], [98, 28], [88, 44], [100, 58], [83, 66], [88, 85], [69, 83], [60, 100],
  [47, 86], [31, 97], [27, 79], [8, 80], [14, 62], [0, 50], [14, 38], [6, 20], [25, 19], [30, 2], [43, 14],
];

function burst(x, y, size, fill) {
  const pts = BURST.map(([px, py]) => `${x + (px / 100) * size},${y + (py / 100) * size}`).join(' ');
  return `<polygon points="${pts}" transform="translate(8 8)" fill="${C.ink}"/>
  <polygon points="${pts}" fill="${fill}" stroke="${C.ink}" stroke-width="4"/>`;
}

function categoryChip(category, x, y) {
  const label = category ?? 'Not rated';
  const colors = category ? CATEGORY_COLORS[category] : { bg: C.paper, fg: C.muted };
  const size = 24;
  const srcW = 74;
  const w = Math.round(label.length * size * 0.8 + 28);
  return `<g data-chip="${escapeXml(label)}">
    <rect x="${x}" y="${y}" width="${srcW + w}" height="48" fill="${C.white}" stroke="${C.ink}" stroke-width="3"/>
    <rect x="${x + srcW}" y="${y}" width="${w}" height="48" fill="${colors.bg}" stroke="${C.ink}" stroke-width="3"/>
    <text x="${x + 14}" y="${y + 33}" font-family="${BODY}" font-size="${size}" font-weight="900" letter-spacing="2" fill="${C.ink}">BLS</text>
    <text x="${x + srcW + 14}" y="${y + 33}" font-family="${BODY}" font-size="${size}" font-weight="900" letter-spacing="2" fill="${colors.fg}">${escapeXml(label.toUpperCase())}</text>
  </g>`;
}

export function renderVerdictSvg(card) {
  const W = OG_WIDTH;
  const H = OG_HEIGHT;
  const pad = 52;
  const site = card.variant === 'site';
  const colX = 790;
  const leftW = colX - pad - 30;

  const title = fitTitle(site ? card.title.toUpperCase() : card.title, {
    width: leftW,
    sizes: site ? [64, 56, 50] : [60, 54, 48, 42, 38, 34],
    maxLines: site ? 3 : 4,
  });
  const lineH = Math.round(title.size * 1.14);
  const titleTop = 214;
  const titleLines = title.lines
    .map((l, i) => {
      const baseline = titleTop + title.size * 0.84 + i * lineH;
      // Highlighter block behind each line; Impact-class faces run about half an em per glyph.
      const hw = Math.min(leftW + 16, Math.round(l.length * title.size * 0.5 + 18));
      return `<rect x="${pad - 8}" y="${Math.round(baseline - title.size * 0.86)}" width="${hw}" height="${Math.round(title.size * 1.04)}" fill="${C.yellow}"/>
  <text x="${pad}" y="${baseline}" font-family="${DISPLAY}" font-size="${title.size}" fill="${C.ink}">${escapeXml(l)}</text>`;
    })
    .join('\n  ');
  const afterTitle = titleTop + title.lines.length * lineH + 22;

  const lower = site
    ? `<text x="${pad}" y="${afterTitle + 30}" font-family="${BODY}" font-size="26" font-weight="700" fill="${C.ink}">Occupations ranked by a Doom Score built from AI</text>
  <text x="${pad}" y="${afterTitle + 64}" font-family="${BODY}" font-size="26" font-weight="700" fill="${C.ink}">exposure and BLS projected job growth. With receipts.</text>`
    : categoryChip(card.category, pad, Math.min(afterTitle, 468));

  const band = card.band;
  const size = 290;
  const bx = colX + 50;
  const by = 148;
  const cx = bx + size / 2;
  const scoreLabel = site ? 'TOP DOOM SCORE' : 'DOOM SCORE / 100';
  const right = `${burst(bx, by, size, band.color)}
  <text x="${cx + 4}" y="${by + 190}" text-anchor="middle" font-family="${DISPLAY}" font-size="150" fill="${C.ink}">${card.obs}</text>
  <text x="${cx}" y="${by + 186}" text-anchor="middle" font-family="${DISPLAY}" font-size="150" fill="${C.white}" data-obs="${card.obs}">${card.obs}</text>
  <text x="${cx}" y="${by + 218}" text-anchor="middle" font-family="${BODY}" font-size="15" font-weight="900" letter-spacing="2" fill="${C.white}">${scoreLabel}</text>
  <g transform="rotate(-8 ${cx} ${by + size + 30})">
    <rect x="${cx - 120}" y="${by + size - 2}" width="240" height="62" fill="${C.white}" fill-opacity="0.7" stroke="${band.id === 'low' ? C.blue : C.red}" stroke-width="5"/>
    <text x="${cx}" y="${by + size + 48}" text-anchor="middle" font-family="${DISPLAY}" font-size="46" letter-spacing="3" fill="${band.id === 'low' ? C.blue : C.red}" data-band="${band.id}">${band.label.toUpperCase()}</text>
  </g>
  ${site ? `<text x="${pad}" y="${afterTitle + 112}" font-family="${BODY}" font-size="22" font-weight="900" letter-spacing="1" fill="${C.red}">#1 MOST DOOMED: ${escapeXml(fitTitle(card.topTitle.toUpperCase(), { width: 520, sizes: [22], maxLines: 1 }).lines[0])}</text>` : ''}`;

  const eyebrowW = Math.round(card.eyebrow.length * 22 * 0.8 + 28);
  const footerY = H - 52;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1" fill="${C.ink}" fill-opacity="0.09"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.paper}"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <text x="${pad}" y="34" font-family="${BODY}" font-size="16" font-weight="900" letter-spacing="2" fill="${C.ink}">${escapeXml(card.edition)} EDITION</text>
  <text x="${W - pad}" y="34" text-anchor="end" font-family="${BODY}" font-size="16" font-weight="900" letter-spacing="2" fill="${C.ink}">HUMAN OBSOLESCENCE INDEX</text>
  <text x="${W / 2 + 5}" y="117" text-anchor="middle" font-family="${DISPLAY}" font-size="92" fill="${C.ink}">THE DAILY DOOM</text>
  <text x="${W / 2}" y="112" text-anchor="middle" font-family="${DISPLAY}" font-size="92" fill="${C.red}" stroke="${C.ink}" stroke-width="2">THE DAILY DOOM</text>
  <rect x="${pad}" y="128" width="${W - pad * 2}" height="4" fill="${C.ink}"/>
  <rect x="${pad}" y="136" width="${W - pad * 2}" height="4" fill="${C.ink}"/>
  <g transform="rotate(-1.5 ${pad} 172)">
    <rect x="${pad}" y="152" width="${eyebrowW}" height="38" fill="${C.ink}"/>
    <text x="${pad + 14}" y="179" font-family="${BODY}" font-size="22" font-weight="900" letter-spacing="2" fill="${C.yellow}">${escapeXml(card.eyebrow)}</text>
  </g>
  ${titleLines}
  ${lower}
  ${right}
  <rect y="${footerY - 34}" width="${W}" height="${H - footerY + 34}" fill="${C.yellow}"/>
  <rect y="${footerY - 38}" width="${W}" height="4" fill="${C.ink}"/>
  <text x="${pad}" y="${footerY + 4}" font-family="${BODY}" font-size="19" font-weight="700" fill="${C.ink}">AI exposure ≠ job loss. Exposure measures tasks, not job loss.</text>
  <text x="${W - pad}" y="${footerY + 4}" text-anchor="end" font-family="${BODY}" font-size="20" font-weight="900" fill="${C.ink}">humanobsolescenceindex.com</text>
</svg>
`;
}

/**
 * One card per /v/<slug>/ verdict page (every scored occupation), in the robot-uprising treatment.
 * @param {{ meta: any; verdicts: any[] }} file verdicts.json
 * @param {(v: any) => { headline: string; stinger: string; robotLine: string }} panicFor src/data/roasts.ts
 */
export function buildVerdictPageCards(file, panicFor) {
  return file.verdicts.map((v) => {
    const panic = panicFor(v);
    return {
      slug: v.slug,
      soc: v.soc,
      edition: file.meta.edition,
      title: v.title,
      obs: v.obs,
      band: bandFor(v.obs),
      category: v.blsCategory ?? null,
      headline: panic.headline,
      stinger: panic.stinger,
      robotLine: panic.robotLine,
    };
  });
}

/** Places a standalone robot SVG (src/lib/robots.ts) inside the card at (x, y). */
function placeSvg(svg, x, y, width, height) {
  return svg
    .replace(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `<svg x="${x}" y="${y}"`)
    .replace(/ width="\d+" height="\d+"/, ` width="${width}" height="${height}"`);
}

export function renderVerdictPageSvg(card, robot) {
  const W = OG_WIDTH;
  const H = OG_HEIGHT;
  const pad = 52;
  const leftW = 700;
  const stinger = card.stinger.toUpperCase();
  const stingerW = Math.min(leftW, Math.round(stinger.length * 26 * 0.52 + 32));

  const title = fitTitle(card.title.toUpperCase(), { width: leftW, sizes: [58, 52, 46, 40, 36, 32], maxLines: 3 });
  const lineH = Math.round(title.size * 1.12);
  const titleTop = 214;
  const titleLines = title.lines
    .map((l, i) => {
      const baseline = titleTop + title.size * 0.86 + i * lineH;
      const hw = Math.min(leftW + 16, Math.round(l.length * title.size * 0.5 + 18));
      return `<rect x="${pad - 8}" y="${Math.round(baseline - title.size * 0.88)}" width="${hw}" height="${Math.round(title.size * 1.04)}" fill="${C.yellow}"/>
  <text x="${pad}" y="${baseline}" font-family="${DISPLAY}" font-size="${title.size}" fill="${C.ink}">${escapeXml(l)}</text>`;
    })
    .join('\n  ');
  let y = titleTop + title.lines.length * lineH + 26;
  const head = wrapText(card.headline.toUpperCase(), 40).slice(0, 2);
  const headLines = head
    .map((l, i) => `<text x="${pad}" y="${y + 24 + i * 32}" font-family="${BODY}" font-size="26" font-weight="900" fill="${C.red}" data-headline="">${escapeXml(l)}</text>`)
    .join('\n  ');
  y += head.length * 32 + 18;
  const chip = categoryChip(card.category, pad, Math.min(y, 478));

  const band = card.band;
  const size = 270;
  const bx = 830;
  const by = 150;
  const cx = bx + size / 2;
  const stampColor = band.id === 'low' ? C.blue : band.id === 'moderate' ? C.ink : C.red;
  const footerY = H - 52;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1" fill="${C.ink}" fill-opacity="0.09"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.paper}"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <text x="${pad}" y="34" font-family="${BODY}" font-size="16" font-weight="900" letter-spacing="2" fill="${C.ink}">${escapeXml(card.edition)} EDITION · SOC ${escapeXml(card.soc)}</text>
  <text x="${W - pad}" y="34" text-anchor="end" font-family="${BODY}" font-size="16" font-weight="900" letter-spacing="2" fill="${C.ink}">HUMAN OBSOLESCENCE INDEX</text>
  <text x="${W / 2 + 5}" y="117" text-anchor="middle" font-family="${DISPLAY}" font-size="92" fill="${C.ink}">THE DAILY DOOM</text>
  <text x="${W / 2}" y="112" text-anchor="middle" font-family="${DISPLAY}" font-size="92" fill="${C.red}" stroke="${C.ink}" stroke-width="2">THE DAILY DOOM</text>
  <rect x="${pad}" y="128" width="${W - pad * 2}" height="4" fill="${C.ink}"/>
  <rect x="${pad}" y="136" width="${W - pad * 2}" height="4" fill="${C.ink}"/>
  <rect x="${pad}" y="154" width="${stingerW}" height="42" fill="${C.red}"/>
  <text x="${pad + 16}" y="184" font-family="${DISPLAY}" font-size="26" letter-spacing="2" fill="${C.white}" data-stinger="">${escapeXml(stinger)}</text>
  ${titleLines}
  ${headLines}
  ${chip}
  ${burst(bx, by, size, band.color)}
  <text x="${cx + 4}" y="${by + 180}" text-anchor="middle" font-family="${DISPLAY}" font-size="140" fill="${C.ink}">${card.obs}</text>
  <text x="${cx}" y="${by + 176}" text-anchor="middle" font-family="${DISPLAY}" font-size="140" fill="${C.white}" data-obs="${card.obs}">${card.obs}</text>
  <text x="${cx}" y="${by + 206}" text-anchor="middle" font-family="${BODY}" font-size="15" font-weight="900" letter-spacing="2" fill="${C.white}">DOOM SCORE / 100</text>
  <g transform="rotate(-8 ${cx - 30} ${by + size + 30})">
    <rect x="${cx - 150}" y="${by + size - 2}" width="240" height="62" fill="${C.white}" fill-opacity="0.75" stroke="${stampColor}" stroke-width="5"/>
    <text x="${cx - 30}" y="${by + size + 48}" text-anchor="middle" font-family="${DISPLAY}" font-size="46" letter-spacing="3" fill="${stampColor}" data-band="${band.id}">${band.label.toUpperCase()}</text>
  </g>
  <rect y="${footerY - 34}" width="${W}" height="${H - footerY + 34}" fill="${C.yellow}"/>
  <rect y="${footerY - 38}" width="${W}" height="4" fill="${C.ink}"/>
  <text x="${pad}" y="${footerY + 4}" font-family="${BODY}" font-size="20" font-weight="900" fill="${C.ink}" data-robot-line="">“${escapeXml(card.robotLine)}”</text>
  <text x="${W - 190}" y="${footerY + 4}" text-anchor="end" font-family="${BODY}" font-size="20" font-weight="900" fill="${C.ink}">humanobsolescenceindex.com</text>
  ${robot ? placeSvg(robot, W - 170, H - 214, 150, 180) : ''}
</svg>
`;
}
