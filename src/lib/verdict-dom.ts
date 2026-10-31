import { categoryClass } from './ledger';
import { ROBOT_POSE_BY_BAND } from './robots';
import type { VerdictRecord, VerdictView } from './verdict-view';

const TEXT_FIELDS = ['stinger', 'kicker', 'title', 'headline', 'score', 'bandLabel', 'rankLine', 'changeLine', 'exposureLine', 'blsCategory', 'roast', 'robotLine', 'fine'] as const;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** The record a server-rendered verdict panel was built from. */
export function readRecord(panel: HTMLElement): VerdictRecord | null {
  try {
    return JSON.parse(panel.dataset.verdictRecord ?? 'null');
  } catch {
    return null;
  }
}

/** Writes a verdict into a VerdictPanel. Text only (textContent), so names and data can never become markup. */
export function fillVerdict(panel: HTMLElement, view: VerdictView, record: VerdictRecord): void {
  for (const field of TEXT_FIELDS) {
    panel.querySelectorAll<HTMLElement>(`[data-vf="${field}"]`).forEach((el) => {
      el.textContent = view[field];
    });
  }
  panel.dataset.slug = view.slug;
  panel.dataset.band = view.band;
  panel.dataset.verdictRecord = JSON.stringify(record);
  panel.querySelector<HTMLElement>('[data-vf="score"]')?.setAttribute('data-obs-score', view.score);
  panel.querySelector<HTMLElement>('[data-vf="roast"]')?.setAttribute('data-roast-id', record.roastId);
  const burst = panel.querySelector<HTMLElement>('[data-v-burst]');
  if (burst) {
    burst.setAttribute('aria-label', `Doom Score ${view.score} out of 100`);
    burst.classList.toggle('burst-blue', view.band === 'low');
    burst.classList.toggle('burst-ink', view.band === 'moderate');
  }
  const stamp = panel.querySelector<HTMLElement>('[data-vf="bandLabel"]');
  stamp?.classList.toggle('stamp-blue', view.band === 'low');
  stamp?.classList.toggle('stamp-ink', view.band === 'moderate');
  const chip = panel.querySelector<HTMLElement>('[data-v-chip]');
  if (chip) chip.className = `category-chip ${categoryClass(record.blsCategory)}`;
  const pose = ROBOT_POSE_BY_BAND[view.band];
  panel.querySelectorAll<HTMLElement>('[data-v-pose]').forEach((el) => {
    el.hidden = el.dataset.vPose !== pose;
  });
}

/** Updates only the name-dependent lines. */
export function fillName(panel: HTMLElement, view: VerdictView): void {
  panel.querySelectorAll<HTMLElement>('[data-vf="headline"]').forEach((el) => {
    el.textContent = view.headline;
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const runs = new WeakMap<HTMLElement, number>();

function restart(el: HTMLElement, cls: string) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/**
 * Countdown, then the press slam. Only opacity/transform animate and the content is already in place, so nothing
 * moves when it finishes. Every path ends in the plain final state, even if a newer reveal interrupts this one.
 */
export async function reveal(panel: HTMLElement, opts: { countdown?: boolean } = {}): Promise<void> {
  const run = (runs.get(panel) ?? 0) + 1;
  runs.set(panel, run);
  const countdown = panel.querySelector<HTMLElement>('[data-countdown]');
  const n = panel.querySelector<HTMLElement>('[data-countdown-n]');
  const current = () => runs.get(panel) === run;
  const finish = () => {
    if (!current()) return;
    panel.classList.remove('is-printing', 'is-slam');
    if (countdown) countdown.hidden = true;
    panel.dataset.revealed = 'true';
  };
  panel.dataset.revealed = 'false';
  if (prefersReducedMotion()) {
    finish();
    return;
  }
  try {
    if (opts.countdown !== false && countdown && n) {
      panel.classList.add('is-printing');
      countdown.hidden = false;
      for (const tick of ['3', '2', '1']) {
        if (!current()) return;
        n.textContent = tick;
        restart(n, 'is-tick');
        await sleep(330);
      }
      if (!current()) return;
      countdown.hidden = true;
      panel.classList.remove('is-printing');
    }
    restart(panel, 'is-slam');
    await sleep(1500);
  } finally {
    finish();
  }
}
