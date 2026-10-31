import type { ScoreBand } from '../lib/ledger';
import type { Verdict } from '../lib/verdicts';

/**
 * Roast copy bank. Templates may only interpolate the placeholders below, each filled from the verdict's real
 * data (src/lib/roast.ts). Roasts punch at the machines and the situation, never at the people doing the job,
 * and never claim the job is lost: a Doom Score ranks AI exposure plus BLS projections, nothing more.
 */
export type RoastPlaceholder = 'obs' | 'exposure' | 'projectedChangePct' | 'employment' | 'medianWage' | 'blsCategory';

export type RoastCondition = {
  id: string;
  /** A data condition, checked against real verdict fields only. */
  test: (v: Verdict) => boolean;
};

export type RoastTemplate = {
  id: string;
  /** Band templates apply to every verdict in the band. */
  band?: ScoreBand;
  /** Condition templates apply wherever their data condition holds. */
  when?: RoastCondition['id'];
  text: string;
};

/** Literal numbers templates may contain (score scale and the BLS projection period). Everything else is data. */
export const ROAST_LITERAL_NUMBERS = ['100', '2025', '2035'];

export const ROAST_CONDITIONS: RoastCondition[] = [
  { id: 'tasks-not-desk', test: (v) => (v.exposure ?? 0) >= 80 && (v.projectedChangePct ?? 0) > 0 },
  { id: 'declining-high', test: (v) => (v.projectedChangePct ?? 0) < 0 && v.obs >= 50 },
  { id: 'declining-low', test: (v) => (v.projectedChangePct ?? 0) < 0 && v.obs < 50 },
  { id: 'bls-very-high', test: (v) => v.blsCategory === 'Very high' && v.band === 'severe' },
  { id: 'big-crowd', test: (v) => (v.employment ?? 0) >= 1_000_000 },
];

export const ROASTS: RoastTemplate[] = [
  { id: 'severe-notes', band: 'severe', text: 'Doom Score {obs}/100. The machines read this job description and took notes.' },
  { id: 'severe-tuesday', band: 'severe', text: 'Doom Score {obs}. Somewhere a server farm just rehearsed your entire Tuesday.' },
  { id: 'severe-tasklist', band: 'severe', text: "Doom Score {obs}. The chatbots aren't after you. They're after your task list." },
  { id: 'elevated-chunk', band: 'elevated', text: 'Doom Score {obs}. AI can already fake a decent chunk of these tasks. The tricky parts are still human.' },
  { id: 'elevated-shadow', band: 'elevated', text: 'Doom Score {obs}. The robots have been shadowing you at work. Taking notes. Badly, for now.' },
  { id: 'elevated-autocomplete', band: 'elevated', text: 'Doom Score {obs}. Not doomed. Just being watched by a very eager autocomplete.' },
  { id: 'moderate-manager', band: 'moderate', text: 'Doom Score {obs}. The robots tried this job and asked to speak to a manager.' },
  { id: 'moderate-paperwork', band: 'moderate', text: 'Doom Score {obs}. AI can help with the paperwork. The rest of the job is still yours.' },
  { id: 'moderate-nervous', band: 'moderate', text: "Doom Score {obs}. The machines are curious, but they've seen the job and they're nervous." },
  { id: 'low-backed-away', band: 'low', text: 'Doom Score {obs}. The robots looked at this job and backed away slowly.' },
  { id: 'low-emails', band: 'low', text: 'Doom Score {obs}. The machines checked the task list and went back to writing emails.' },
  { id: 'low-not-today', band: 'low', text: "Doom Score {obs}/100. The robots filed this one under 'not today'." },
  {
    id: 'tasks-not-desk',
    when: 'tasks-not-desk',
    text: 'Doom Score {obs}. The robots want your tasks, not your desk: AI exposure percentile {exposure}, yet BLS projects {projectedChangePct} employment change by 2035.',
  },
  {
    id: 'declining-high',
    when: 'declining-high',
    text: "Doom Score {obs}. BLS projects {projectedChangePct} employment change by 2035, and not all of that is the robots' doing.",
  },
  {
    id: 'declining-low',
    when: 'declining-low',
    text: 'Doom Score {obs}. BLS projects {projectedChangePct} employment change by 2035, but the chatbots have an alibi.',
  },
  {
    id: 'bls-very-high',
    when: 'bls-very-high',
    text: 'Doom Score {obs}. Even BLS rates its AI exposure "{blsCategory}", and BLS does not do jokes.',
  },
  {
    id: 'big-crowd',
    when: 'big-crowd',
    text: 'Doom Score {obs}. {employment} people did this job in 2025. The robots have noticed the crowd.',
  },
];

/** Phrases a roast must never contain: insults to workers and claims that the job is already lost. */
export const BANNED_ROAST_PHRASES: RegExp[] = [
  /\buseless\b/i,
  /\bworthless\b/i,
  /\blazy\b/i,
  /\bstupid\b/i,
  /\bdumb\b/i,
  /\bidiots?\b/i,
  /\bmorons?\b/i,
  /\blosers?\b/i,
  /\bpathetic\b/i,
  /\btalentless\b/i,
  /\bincompetent\b/i,
  /\bunemployable\b/i,
  /\breplaceable\b/i,
  /\bdeserve/i,
  /\byour fault\b/i,
  /\bget a real job\b/i,
  /\blearn to code\b/i,
  /\bnobody needs you\b/i,
  /\byou('| a)re fired\b/i,
  /\blos(e|ing) your job\b/i,
  /\bjob is (gone|dead|over)\b/i,
  /\breplaced you\b/i,
  /\bwill replace you\b/i,
  /\byou('| a)re (obsolete|doomed|finished|toast)\b/i,
];
