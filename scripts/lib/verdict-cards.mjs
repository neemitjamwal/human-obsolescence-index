export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

const C = {
  slate: '#0d1117',
  panel: '#161b22',
  grid: '#21262d',
  phosphor: '#2ea043',
  alert: '#f85149',
  amber: '#f0b429',
  paper: '#e6edf3',
  dim: '#9da7b3',
  orange: '#db6d28',
};

const DISPLAY = "'JetBrains Mono', 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', monospace";
const MONO = "'IBM Plex Mono', 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', monospace";
const MONO_EM = 0.6;

// Mirrors scoreBand() in src/lib/ledger.ts (a test keeps the two in step).
export const BANDS = [
  { id: 'severe', label: 'Severe', min: 75, color: C.alert },
  { id: 'elevated', label: 'Elevated', min: 50, color: C.orange },
  { id: 'moderate', label: 'Moderate', min: 25, color: C.amber },
  { id: 'low', label: 'Low', min: 0, color: C.phosphor },
];

const CATEGORY_COLORS = { 'Very high': '#ff7b72', High: '#f0883e', Moderate: C.amber, Low: '#56d364' };

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

function indexMark(x, y, scale) {
  // The favicon gauge, redrawn at card scale.
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect width="32" height="32" fill="${C.slate}" stroke="${C.grid}" stroke-width="1"/>
    <path d="M5 22a11 11 0 0 1 22 0" fill="none" stroke="${C.grid}" stroke-width="3"/>
    <path d="M5 22a11 11 0 0 1 5.5-9.5" fill="none" stroke="${C.phosphor}" stroke-width="3"/>
    <path d="M10.5 12.5a11 11 0 0 1 11 0" fill="none" stroke="${C.amber}" stroke-width="3"/>
    <path d="M21.5 12.5A11 11 0 0 1 27 22" fill="none" stroke="${C.alert}" stroke-width="3"/>
    <path d="M16 22l7-8" stroke="${C.paper}" stroke-width="2" stroke-linecap="square"/>
    <circle cx="16" cy="22" r="2" fill="${C.paper}"/>
  </g>`;
}

function categoryChip(category, x, y) {
  const label = category ?? 'Not rated';
  const color = category ? CATEGORY_COLORS[category] : C.dim;
  const size = 26;
  const w = Math.round((4 + label.length) * size * MONO_EM + 20 + 34);
  return `<g data-chip="${escapeXml(label)}">
    <rect x="${x}" y="${y}" width="${w}" height="52" fill="none" stroke="${color}" stroke-width="2"/>
    <text x="${x + 20}" y="${y + 35}" font-family="${MONO}" font-size="${size}" font-weight="600" letter-spacing="1"><tspan fill="${C.dim}">BLS</tspan><tspan fill="${color}" dx="${size * MONO_EM}">${escapeXml(label)}</tspan></text>
  </g>`;
}

export function renderVerdictSvg(card) {
  const W = OG_WIDTH;
  const H = OG_HEIGHT;
  const pad = 56;
  const barH = 72;
  const colX = 812;
  const leftW = colX - pad - 40;
  const site = card.variant === 'site';

  const title = fitTitle(site ? card.title.toUpperCase() : card.title, {
    width: leftW,
    sizes: site ? [64, 56, 50] : [60, 54, 48, 42, 38, 34],
    maxLines: site ? 3 : 4,
  });
  const lineH = Math.round(title.size * 1.18);
  const titleTop = barH + 112;
  const titleLines = title.lines
    .map(
      (l, i) =>
        `<text x="${pad}" y="${titleTop + title.size * 0.8 + i * lineH}" font-family="${DISPLAY}" font-size="${title.size}" font-weight="800" fill="${C.paper}">${escapeXml(l)}</text>`,
    )
    .join('\n  ');
  const afterTitle = titleTop + title.lines.length * lineH + 28;

  const lower = site
    ? `<text x="${pad}" y="${afterTitle + 30}" font-family="${MONO}" font-size="26" fill="${C.dim}">Occupations ranked by AI exposure and</text>
  <text x="${pad}" y="${afterTitle + 64}" font-family="${MONO}" font-size="26" fill="${C.dim}">BLS projected decline. With receipts.</text>`
    : categoryChip(card.category, pad, Math.min(afterTitle, 470));

  const band = card.band;
  const scoreLabel = site ? 'TOP SCORE TODAY' : 'OBS SCORE';
  const fill = Math.round((Math.min(100, Math.max(0, card.obs)) / 100) * 280);
  const panel = `<rect x="${colX}" y="${barH + 48}" width="${W - colX - pad}" height="412" fill="${C.panel}" stroke="${C.grid}" stroke-width="2"/>
  <rect x="${colX}" y="${barH + 48}" width="6" height="412" fill="${band.color}"/>
  <text x="${colX + 36}" y="${barH + 98}" font-family="${MONO}" font-size="22" font-weight="600" letter-spacing="4" fill="${C.dim}">${scoreLabel}</text>
  <text x="${colX + 30}" y="${barH + 286}" font-family="${DISPLAY}" font-size="196" font-weight="800" fill="${band.color}" data-obs="${card.obs}">${card.obs}</text>
  <text x="${colX + 36}" y="${barH + 324}" font-family="${MONO}" font-size="24" fill="${C.dim}">/ 100</text>
  <text x="${colX + 36}" y="${barH + 358}" font-family="${MONO}" font-size="24" font-weight="600" letter-spacing="1" fill="${C.paper}" data-band="${band.id}">BAND: ${band.label.toUpperCase()}</text>
  <rect x="${colX + 36}" y="${barH + 378}" width="280" height="14" fill="${C.grid}"/>
  <rect x="${colX + 36}" y="${barH + 378}" width="${fill}" height="14" fill="${band.color}"/>
  ${site ? `<text x="${colX + 36}" y="${barH + 428}" font-family="${MONO}" font-size="18" fill="${C.dim}">${escapeXml(fitTitle(card.topTitle, { width: 280, sizes: [18], maxLines: 1 }).lines[0])}</text>` : ''}`;

  const footerY = H - 34;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="1" fill="${C.paper}" fill-opacity="0.035"/>
    </pattern>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="${C.grid}" stroke-opacity="0.6" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.slate}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${barH}" fill="${C.panel}"/>
  <rect y="${barH}" width="${W}" height="2" fill="${C.phosphor}"/>
  ${indexMark(pad, 14, 1.4)}
  <text x="${pad + 62}" y="47" font-family="${DISPLAY}" font-size="26" font-weight="800" letter-spacing="3" fill="${C.phosphor}">HUMAN OBSOLESCENCE INDEX</text>
  <text x="${W - pad}" y="47" text-anchor="end" font-family="${MONO}" font-size="22" font-weight="600" letter-spacing="3" fill="${C.amber}">${escapeXml(card.edition)} · ${site ? 'THE EXCHANGE' : 'VERDICT'}</text>
  <text x="${pad}" y="${barH + 78}" font-family="${MONO}" font-size="22" font-weight="600" letter-spacing="3" fill="${C.dim}">${escapeXml(card.eyebrow)}</text>
  ${titleLines}
  ${lower}
  ${panel}
  <rect y="${footerY - 34}" width="${W}" height="1" fill="${C.grid}"/>
  <text x="${pad}" y="${footerY}" font-family="${MONO}" font-size="19" fill="${C.dim}">Exposure measures what AI can do to tasks, not job loss.</text>
  <text x="${W - pad}" y="${footerY}" text-anchor="end" font-family="${MONO}" font-size="19" font-weight="600" fill="${C.paper}">humanobsolescenceindex.com</text>
  <rect width="${W}" height="${H}" fill="url(#scan)"/>
</svg>
`;
}
