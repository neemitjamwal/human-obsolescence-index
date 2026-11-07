/**
 * Office Lineup copy: the number-free lines the lineup result and its share cards print. Every score, title and rank
 * comes from verdicts.json through src/lib/lineup.ts; nothing here carries a number. The robots are the villains and
 * the people in the lineup did nothing wrong.
 *
 * This module has no runtime imports so it can be loaded anywhere (tests, pages, browser).
 */

export type LineupLine = { id: string; text: string };

export const LINEUP_STINGER = 'Office lineup · The robots are picking';

/** {who} is the first-ranked person (a sanitized name or a slot label), filled as plain text. */
export const HEADLINE_ONE = 'The robots pick {who} first';
export const HEADLINE_TOP_TIE = 'Dead heat at the top of the lineup';
export const HEADLINE_ALL_TIED = 'Dead heat: the robots cannot split this lineup';

/** Scrawled under a lineup with one clear first pick and no boss involvement. */
export const LINEUP_QUIPS: LineupLine[] = [
  { id: 'l-task-lists', text: 'Nobody in this lineup did anything wrong. The robots just read the task lists and sorted by Doom Score.' },
  { id: 'l-server-rack', text: 'The only witness is a server rack. It picked by Doom Score and did not blink.' },
  { id: 'l-clipboard', text: 'The robots brought a clipboard and a highlighter. Guess which column they highlighted.' },
  { id: 'l-one-way-glass', text: 'Behind the one-way glass, three chatbots are whispering about your task lists.' },
];

/** The boss was added and has the lineup's highest Doom Score on its own. */
export const BOSS_FIRST_QUIPS: LineupLine[] = [
  { id: 'b-corner-office', text: 'Plot twist: the robots walked past the cubicles and straight into the corner office.' },
  { id: 'b-org-chart', text: 'The robots read the org chart upside down. The boss is first in line.' },
];

/** The boss was added and has the lineup's lowest Doom Score on its own. */
export const BOSS_LAST_QUIPS: LineupLine[] = [
  { id: 'b-last', text: 'The corner office is at the back of the line. The robots are taking the long way round.' },
  { id: 'b-meeting', text: 'The boss is last in line. The robots have scheduled a meeting about that.' },
];

/** The top of the lineup is a tie. */
export const TIE_QUIPS: LineupLine[] = [
  { id: 't-same-spot', text: 'Same Doom Score, same spot in line. The robots refuse to pick favorites.' },
  { id: 't-coin', text: 'The robots tried to break the tie and found nothing to break it with.' },
];

/** What the witness robot says over the lineup. */
export const ROBOT_PICK = 'That one. Highest Doom Score in the room.';
export const ROBOT_TIE = 'Same Doom Score. I will not pretend there is a difference.';

export const LINEUP_FINE =
  'AI exposure ≠ job loss. "Picked first" only means the highest Doom Score in this lineup (65% AI exposure research + 35% BLS 2025–35 projection), not a forecast for anyone\'s job.';

/** Every line above, for honesty scans. */
export const ALL_LINEUP_COPY: string[] = [
  LINEUP_STINGER,
  HEADLINE_ONE,
  HEADLINE_TOP_TIE,
  HEADLINE_ALL_TIED,
  ...LINEUP_QUIPS.map((l) => l.text),
  ...BOSS_FIRST_QUIPS.map((l) => l.text),
  ...BOSS_LAST_QUIPS.map((l) => l.text),
  ...TIE_QUIPS.map((l) => l.text),
  ROBOT_PICK,
  ROBOT_TIE,
];
