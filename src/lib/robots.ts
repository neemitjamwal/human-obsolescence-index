import type { ScoreBand } from './ledger';

/**
 * Cartoon robot set in the Daily Doom ink-and-halftone style. Plain SVG strings with no runtime imports, so the same
 * drawings render inline on pages (src/components/Robot.astro), on the canvas share cards and in the sharp OG cards.
 */
export type RobotPose = 'peeking' | 'pointing' | 'pinkslip' | 'shovel';

export const ROBOT_POSES: RobotPose[] = ['peeking', 'pointing', 'pinkslip', 'shovel'];

export const ROBOT_LABELS: Record<RobotPose, string> = {
  peeking: 'Cartoon robot with glowing red eyes peeking over office blinds',
  pointing: 'Cartoon robot with glowing red eyes pointing straight at you',
  pinkslip: 'Cartoon robot with glowing red eyes holding out a pink slip',
  shovel: 'Cartoon robot with glowing red eyes leaning on a shovel',
};

/** Which robot turns up for each Doom band. */
export const ROBOT_POSE_BY_BAND: Record<ScoreBand, RobotPose> = {
  severe: 'pinkslip',
  elevated: 'pointing',
  moderate: 'peeking',
  low: 'shovel',
};

export const ROBOT_EYE = '#e4002b';
const INK = '#0b0b0b';
const METAL = '#efeadb';
const METAL_DARK = '#cfc9b6';
const YELLOW = '#ffe500';
const PINK = '#ff8fb1';

export const ROBOT_VIEWBOX = { width: 200, height: 240 };

function head(id: string): string {
  return `<g class="robot-head">
<line x1="100" y1="10" x2="100" y2="30" stroke="${INK}" stroke-width="5"/>
<circle cx="100" cy="9" r="7" fill="${ROBOT_EYE}" stroke="${INK}" stroke-width="3"/>
<rect x="40" y="50" width="14" height="30" rx="3" fill="${INK}"/>
<rect x="146" y="50" width="14" height="30" rx="3" fill="${INK}"/>
<rect x="52" y="28" width="96" height="74" rx="9" fill="${METAL}" stroke="${INK}" stroke-width="5"/>
<rect x="52" y="28" width="96" height="74" rx="9" fill="url(#${id}-dots)"/>
<path d="M63 49 L92 59 M137 49 L108 59" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
<circle class="robot-eye-glow" cx="80" cy="69" r="17" fill="${ROBOT_EYE}" fill-opacity="0.3"/>
<circle class="robot-eye-glow" cx="120" cy="69" r="17" fill="${ROBOT_EYE}" fill-opacity="0.3"/>
<circle class="robot-eye" cx="80" cy="69" r="9" fill="${ROBOT_EYE}" stroke="${INK}" stroke-width="3"/>
<circle class="robot-eye" cx="120" cy="69" r="9" fill="${ROBOT_EYE}" stroke="${INK}" stroke-width="3"/>
<circle cx="77" cy="66" r="2.6" fill="#ffffff"/>
<circle cx="117" cy="66" r="2.6" fill="#ffffff"/>
<rect x="70" y="84" width="60" height="11" fill="${INK}"/>
<path d="M80 84v11M90 84v11M100 84v11M110 84v11M120 84v11" stroke="#ffffff" stroke-width="2"/>
</g>`;
}

function body(id: string): string {
  return `<g class="robot-body">
<rect x="88" y="100" width="24" height="12" fill="${INK}"/>
<rect x="66" y="186" width="22" height="38" fill="${METAL_DARK}" stroke="${INK}" stroke-width="5"/>
<rect x="112" y="186" width="22" height="38" fill="${METAL_DARK}" stroke="${INK}" stroke-width="5"/>
<rect x="56" y="222" width="38" height="13" rx="4" fill="${INK}"/>
<rect x="106" y="222" width="38" height="13" rx="4" fill="${INK}"/>
<rect x="54" y="110" width="92" height="80" rx="7" fill="${METAL}" stroke="${INK}" stroke-width="5"/>
<rect x="54" y="110" width="92" height="80" rx="7" fill="url(#${id}-dots)"/>
<rect x="78" y="124" width="44" height="24" fill="${YELLOW}" stroke="${INK}" stroke-width="3"/>
<circle cx="90" cy="136" r="5" fill="${ROBOT_EYE}"/>
<path d="M100 132h16M100 140h12" stroke="${INK}" stroke-width="3"/>
<path d="M66 166h68M66 176h68" stroke="${INK}" stroke-width="3"/>
</g>`;
}

/** An outlined arm: a thick ink stroke with a lighter metal stroke on top. */
function arm(d: string): string {
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${d}" fill="none" stroke="${METAL_DARK}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function hand(x: number, y: number, r = 10): string {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${METAL}" stroke="${INK}" stroke-width="4"/>`;
}

const POSES: Record<RobotPose, (id: string) => string> = {
  pointing: (id) => `${body(id)}
${arm('M58 124 L36 150 L32 176')}${hand(32, 180)}
${arm('M142 124 L166 106 L180 86')}${hand(182, 82, 11)}
<path d="M186 76 L197 62" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
<path d="M186 76 L197 62" stroke="${METAL}" stroke-width="4" stroke-linecap="round"/>
${head(id)}`,
  pinkslip: (id) => `${body(id)}
${arm('M58 124 L36 150 L32 176')}${hand(32, 180)}
${arm('M142 126 L170 140 L176 150')}
<g transform="rotate(12 172 150)">
<rect x="150" y="112" width="44" height="58" fill="${PINK}" stroke="${INK}" stroke-width="4"/>
<path d="M158 126h28M158 136h28M158 146h20M158 156h24" stroke="${INK}" stroke-width="3"/>
</g>
${hand(172, 156)}
${head(id)}`,
  shovel: (id) => `<g class="robot-shovel">
<line x1="24" y1="56" x2="30" y2="206" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
<line x1="24" y1="56" x2="30" y2="206" stroke="${YELLOW}" stroke-width="5" stroke-linecap="round"/>
<path d="M12 200 h36 v18 q-18 22 -36 0 z" fill="${METAL_DARK}" stroke="${INK}" stroke-width="4"/>
<rect x="14" y="46" width="22" height="10" rx="3" fill="${INK}"/>
</g>
${body(id)}
${arm('M58 124 L40 118 L30 110')}${hand(28, 108)}
${arm('M58 150 L40 156 L30 150')}${hand(30, 150, 9)}
${arm('M142 124 L160 148 L156 174')}${hand(156, 178)}
${head(id)}`,
  peeking: (id) => `${head(id)}
<g class="robot-blinds">
<rect x="0" y="100" width="200" height="140" fill="${YELLOW}"/>
<path d="M0 104h200M0 128h200M0 152h200M0 176h200M0 200h200M0 224h200" stroke="${INK}" stroke-width="7"/>
<rect x="0" y="100" width="200" height="140" fill="url(#${id}-dots)"/>
<line x1="14" y1="96" x2="14" y2="240" stroke="${INK}" stroke-width="3"/>
<line x1="186" y1="96" x2="186" y2="240" stroke="${INK}" stroke-width="3"/>
</g>
<rect x="44" y="90" width="26" height="22" rx="8" fill="${METAL}" stroke="${INK}" stroke-width="4"/>
<path d="M51 90v12M57 90v12M63 90v12" stroke="${INK}" stroke-width="2.5"/>
<rect x="130" y="90" width="26" height="22" rx="8" fill="${METAL}" stroke="${INK}" stroke-width="4"/>
<path d="M137 90v12M143 90v12M149 90v12" stroke="${INK}" stroke-width="2.5"/>`,
};

export type RobotSvgOptions = {
  /** Unique per document: the halftone pattern id is derived from it. */
  id: string;
  /** Accessible name; omit for a decorative robot (aria-hidden). */
  label?: string;
  className?: string;
  width?: number;
  height?: number;
};

export function robotSvg(pose: RobotPose, opts: RobotSvgOptions): string {
  const { width, height } = ROBOT_VIEWBOX;
  const size = opts.width ? ` width="${opts.width}" height="${opts.height ?? Math.round((opts.width * height) / width)}"` : '';
  const a11y = opts.label ? ` role="img" aria-label="${opts.label.replace(/"/g, '&quot;')}"` : ' aria-hidden="true" focusable="false"';
  const cls = ` class="robot robot-${pose}${opts.className ? ` ${opts.className}` : ''}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"${size}${cls}${a11y} data-robot-pose="${pose}">
<defs><pattern id="${opts.id}-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.3" fill="${INK}" fill-opacity="0.32"/></pattern></defs>
${POSES[pose](opts.id)}
</svg>`;
}
