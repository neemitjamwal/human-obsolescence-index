import type { ScoreBand } from '../lib/ledger';
import type { Verdict } from '../lib/verdicts';

/**
 * The Daily Doom copy bank, in the robot-uprising voice: B-movie panic where the robots are the villains.
 *
 * - Roasts may interpolate only the placeholders below, each filled from the verdict's real data (src/lib/roast.ts).
 * - Headlines, stingers and robot speech bubbles carry no numbers at all; numbers only ever come from data.
 * - Nothing here mocks the people doing the job or claims the job is lost: a Doom Score ranks AI exposure plus BLS
 *   projections, nothing more.
 *
 * This module has no runtime imports so the Node build scripts (OG cards) can load it with type stripping.
 */
export type RoastPlaceholder = 'obs' | 'exposure' | 'projectedChangePct' | 'employment' | 'medianWage' | 'blsCategory';

export type ConditionFields = Pick<Verdict, 'obs' | 'band' | 'exposure' | 'projectedChangePct' | 'employment' | 'blsCategory'>;

export type RoastCondition = {
  id: string;
  /** A data condition, checked against real verdict fields only. */
  test: (v: ConditionFields) => boolean;
};

export type RoastTemplate = {
  id: string;
  /** Band templates apply to every verdict in the band. */
  band?: ScoreBand;
  /** Condition templates apply wherever their data condition holds. */
  when?: RoastCondition['id'];
  text: string;
};

/** A number-free line (headline, stinger or robot speech bubble). */
export type PanicLine = RoastTemplate;

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
  { id: 'severe-notes', band: 'severe', text: 'Doom Score {obs}/100. SIRENS. The robots read this job description and started taking notes.' },
  { id: 'severe-tuesday', band: 'severe', text: 'Doom Score {obs}. A server farm just rehearsed this entire Tuesday. Twice. Without a coffee break.' },
  { id: 'severe-tasklist', band: 'severe', text: "Doom Score {obs}. The machines aren't after you. They're after your task list, and they skipped lunch to get it." },
  { id: 'severe-clipboard', band: 'severe', text: 'Doom Score {obs}. Red eyes at the window. A clipboard. A checklist. Lock the office door.' },
  { id: 'elevated-chunk', band: 'elevated', text: 'Doom Score {obs}. Red eyes in the break room: AI can fake chunks of these tasks. The tricky parts are still human.' },
  { id: 'elevated-shadow', band: 'elevated', text: 'Doom Score {obs}. The robots have been shadowing this job for weeks. Taking notes. Badly, for now.' },
  { id: 'elevated-autocomplete', band: 'elevated', text: 'Doom Score {obs}. Not doomed. Just being watched, very closely, by an extremely eager autocomplete.' },
  { id: 'moderate-manager', band: 'moderate', text: 'Doom Score {obs}. The robot army tried this job and asked to speak to a manager.' },
  { id: 'moderate-paperwork', band: 'moderate', text: 'Doom Score {obs}. The machines grabbed the paperwork and ran. The rest of the job stayed with the humans.' },
  { id: 'moderate-nervous', band: 'moderate', text: "Doom Score {obs}. The scouts came back nervous. Too many hands-on bits. Uprising postponed." },
  { id: 'low-backed-away', band: 'low', text: 'Doom Score {obs}. The robot army marched up to this job, looked inside, and backed away slowly.' },
  { id: 'low-emails', band: 'low', text: 'Doom Score {obs}. The machines checked the task list and went back to invading inboxes instead.' },
  { id: 'low-not-today', band: 'low', text: "Doom Score {obs}/100. The overlords filed this one under 'not today, maybe never'." },
  {
    id: 'tasks-not-desk',
    when: 'tasks-not-desk',
    text: 'Doom Score {obs}. The robots want your tasks, not your desk: AI exposure percentile {exposure}, yet BLS projects {projectedChangePct} employment change by 2035.',
  },
  {
    id: 'declining-high',
    when: 'declining-high',
    text: "Doom Score {obs}. BLS projects {projectedChangePct} employment change by 2035, and not all of that is the robots' doing. They're taking credit anyway.",
  },
  {
    id: 'declining-low',
    when: 'declining-low',
    text: 'Doom Score {obs}. BLS projects {projectedChangePct} employment change by 2035, but the chatbots have an airtight alibi.',
  },
  {
    id: 'bls-very-high',
    when: 'bls-very-high',
    text: 'Doom Score {obs}. Even BLS rates its AI exposure "{blsCategory}", and BLS does not do B-movies.',
  },
  {
    id: 'big-crowd',
    when: 'big-crowd',
    text: 'Doom Score {obs}. {employment} people did this job in 2025. The robots have noticed the crowd and brought clipboards.',
  },
];

/** Front-page headlines, one band each. No numbers, no names. */
export const HEADLINES: PanicLine[] = [
  { id: 'h-severe-next', band: 'severe', text: 'Robot uprising: your job is next' },
  { id: 'h-severe-number', band: 'severe', text: 'The robots have your number' },
  { id: 'h-severe-here', band: 'severe', text: "They're here. They brought clipboards." },
  { id: 'h-elevated-shoulder', band: 'elevated', text: 'The robots are reading over your shoulder' },
  { id: 'h-elevated-copied', band: 'elevated', text: 'Classified: your task list has been copied' },
  { id: 'h-elevated-breakroom', band: 'elevated', text: 'Red eyes spotted in the break room' },
  { id: 'h-moderate-circling', band: 'moderate', text: 'The robots are circling, politely' },
  { id: 'h-moderate-confused', band: 'moderate', text: 'Uprising delayed: machines baffled by this job' },
  { id: 'h-low-turned-back', band: 'low', text: 'Robot army turns back at your door' },
  { id: 'h-low-desk', band: 'low', text: "The machines can't find your desk" },
];

/** The same headlines with the reader's sanitized first name; {name} is the only placeholder. */
export const NAMED_HEADLINES: PanicLine[] = [
  { id: 'n-severe-number', band: 'severe', text: '{name}, the robots have your number' },
  { id: 'n-severe-door', band: 'severe', text: "{name}, lock the door. They're here." },
  { id: 'n-elevated-shoulder', band: 'elevated', text: "{name}, they're reading over your shoulder" },
  { id: 'n-elevated-notes', band: 'elevated', text: '{name}, the robots are taking notes' },
  { id: 'n-moderate-circling', band: 'moderate', text: '{name}, the robots are circling' },
  { id: 'n-low-turned-back', band: 'low', text: '{name}, the robot army turned back' },
];

/** Short siren banners above the verdict. */
export const STINGERS: PanicLine[] = [
  { id: 's-severe-here', band: 'severe', text: "Robot uprising · They're here" },
  { id: 's-severe-code-red', band: 'severe', text: 'Code red · Sirens on' },
  { id: 's-elevated-classified', band: 'elevated', text: 'Classified · Robot surveillance' },
  { id: 's-elevated-watching', band: 'elevated', text: "Breaking · They're watching" },
  { id: 's-moderate-sighting', band: 'moderate', text: 'Robot sighting · Stay alert' },
  { id: 's-low-clear', band: 'low', text: 'All clear · For now' },
  { id: 's-low-human-zone', band: 'low', text: 'Human zone · Robots turned away' },
];

/** What the robot in the reveal says. Condition lines join the band's lines when the data condition holds. */
export const ROBOT_LINES: PanicLine[] = [
  { id: 'r-severe-spreadsheets', band: 'severe', text: "We've been watching your spreadsheets." },
  { id: 'r-severe-delicious', band: 'severe', text: 'Beep. Your tasks look delicious.' },
  { id: 'r-severe-clipboard', band: 'severe', text: 'Sign here. And here. And here.' },
  { id: 'r-elevated-notes', band: 'elevated', text: "Don't mind us. Just taking notes." },
  { id: 'r-elevated-inbox', band: 'elevated', text: 'We have read your inbox. All of it.' },
  { id: 'r-moderate-human-bits', band: 'moderate', text: 'This job has too many human bits.' },
  { id: 'r-moderate-later', band: 'moderate', text: 'We will be back. Probably. Eventually.' },
  { id: 'r-low-abort', band: 'low', text: 'Abort. Abort. This one needs hands.' },
  { id: 'r-low-shovel', band: 'low', text: 'We brought a shovel. It was not enough.' },
  { id: 'r-tasks-not-desk', when: 'tasks-not-desk', text: 'We want your tasks, not your desk.' },
  { id: 'r-declining-high', when: 'declining-high', text: "We didn't start this slide. We're just watching." },
  { id: 'r-declining-low', when: 'declining-low', text: "Don't look at us. We have an alibi." },
  { id: 'r-bls-very-high', when: 'bls-very-high', text: 'Even the Bureau of Labor Statistics saw us coming.' },
  { id: 'r-big-crowd', when: 'big-crowd', text: 'So many humans. So many tasks.' },
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

/** Worker-mocking language: the joke must land on the machines, never on the people doing the job. */
export const WORKER_MOCKING_PHRASES: RegExp[] = [
  /\byou('| a)re (slow|bad|behind|old|weak|basic|mediocre|a joke|nothing)\b/i,
  /\bmeat ?bags?\b/i,
  /\bpuny humans?\b/i,
  /\binferior\b/i,
  /\bboomers?\b/i,
  /\bdinosaurs?\b/i,
  /\bskill issue\b/i,
  /\bshould(n't| not)? have\b/i,
  /\bshould've\b/i,
  /\bcope\b/i,
  /\bclowns?\b/i,
  /\bpeasants?\b/i,
  /\bunskilled\b/i,
  /\blow[- ]skill/i,
  /\bnobody (wants|needs|likes)\b/i,
  /\bhas-beens?\b/i,
  /\bwashed[- ]up\b/i,
  /\bover the hill\b/i,
  /\bnot smart\b/i,
  /\bbrainless\b/i,
  /\bmindless\b/i,
  /\bgood riddance\b/i,
  /\bhahaha\b/i,
  /\blol\b/i,
];

/** Every line in the bank, for honesty scans. */
export const ALL_COPY: RoastTemplate[] = [...ROASTS, ...HEADLINES, ...NAMED_HEADLINES, ...STINGERS, ...ROBOT_LINES];

/** FNV-1a over the SOC code (plus a salt), so every surface picks the same line for the same occupation. */
export function hashKey(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function conditionsFor(v: ConditionFields): Set<string> {
  return new Set(ROAST_CONDITIONS.filter((c) => c.test(v)).map((c) => c.id));
}

/** Lines that fit this verdict: its band's lines plus any whose data condition holds. */
export function linesFor<T extends RoastTemplate>(bank: T[], v: ConditionFields): T[] {
  const conditions = conditionsFor(v);
  return bank.filter((t) => (t.band ? t.band === v.band : t.when ? conditions.has(t.when) : false));
}

export function pickLine<T extends RoastTemplate>(bank: T[], v: ConditionFields & { soc: string }, salt: string): T {
  const options = linesFor(bank, v);
  if (!options.length) throw new Error(`no ${salt} line fits ${v.soc} (band ${v.band})`);
  return options[hashKey(`${salt}:${v.soc}`) % options.length];
}

export type Panic = { headline: string; headlineNamed: string; stinger: string; robotLine: string };

/** The number-free panic layer for one verdict. headlineNamed keeps its {name} placeholder for the browser to fill. */
export function panicFor(v: ConditionFields & { soc: string }): Panic {
  return {
    headline: pickLine(HEADLINES, v, 'headline').text,
    headlineNamed: pickLine(NAMED_HEADLINES, v, 'named').text,
    stinger: pickLine(STINGERS, v, 'stinger').text,
    robotLine: pickLine(ROBOT_LINES, v, 'robot').text,
  };
}
