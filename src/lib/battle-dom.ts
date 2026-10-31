import { fighterPath, type BattleView, type FighterView, type Side } from './battle';
import { prefersReducedMotion } from './verdict-dom';

const VIEW_FIELDS = ['headline', 'scoreLine', 'referee', 'quip', 'projectionLine', 'fine'] as const;
const FIGHTER_FIELDS = ['score', 'title', 'changeLine', 'tag'] as const;

function fillFighter(el: HTMLElement, f: FighterView) {
  for (const field of FIGHTER_FIELDS) {
    el.querySelectorAll<HTMLElement>(`[data-ff="${field}"]`).forEach((n) => {
      n.textContent = f[field];
    });
  }
  el.querySelector<HTMLElement>('[data-ff="score"]')?.setAttribute('data-obs-score', f.score);
  el.querySelector<HTMLAnchorElement>('[data-ff-link]')?.setAttribute('href', fighterPath(f.slug));
  el.dataset.fate = f.fate;
  const tag = el.querySelector<HTMLElement>('[data-ff="tag"]');
  if (tag) tag.hidden = f.fate === 'pinkslip';
  const slip = el.querySelector<HTMLElement>('[data-pink-slip]');
  if (slip) slip.hidden = f.fate !== 'pinkslip';
}

/** Writes a battle into a BattleResult. Text only (textContent), so data can never become markup. */
export function fillBattle(root: HTMLElement, view: BattleView, fighters: unknown): void {
  for (const field of VIEW_FIELDS) {
    root.querySelectorAll<HTMLElement>(`[data-bf="${field}"]`).forEach((n) => {
      n.textContent = view[field];
    });
  }
  root.querySelector<HTMLElement>('[data-bf="quip"]')?.setAttribute('data-quip-id', view.quipId);
  for (const side of ['a', 'b'] as Side[]) {
    const el = root.querySelector<HTMLElement>(`[data-fighter="${side}"]`);
    if (el) fillFighter(el, view[side]);
  }
  root.dataset.battleKey = view.key;
  root.dataset.outcome = view.outcome.kind;
  root.dataset.winner = view.outcome.kind === 'win' ? view.outcome.winner : '';
  root.dataset.battleRecord = JSON.stringify(fighters);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const runs = new WeakMap<HTMLElement, number>();

/** The fighters slide in, the referee stomps up and the pink slip slaps on. Reduced motion shows the final state. */
export async function revealBattle(root: HTMLElement): Promise<void> {
  const run = (runs.get(root) ?? 0) + 1;
  runs.set(root, run);
  root.dataset.revealed = 'false';
  try {
    if (prefersReducedMotion()) return;
    root.classList.remove('is-fight');
    void root.offsetWidth;
    root.classList.add('is-fight');
    await sleep(1600);
  } finally {
    if (runs.get(root) === run) {
      root.classList.remove('is-fight');
      root.dataset.revealed = 'true';
    }
  }
}
