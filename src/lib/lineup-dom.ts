import { BAND_LABELS } from './ledger';
import type { LineupView, RankedEntry } from './lineup';
import { prefersReducedMotion } from './verdict-dom';

const VIEW_FIELDS = ['headline', 'subhead', 'quip', 'robotLine', 'scoreLine', 'fine'] as const;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

function sr(text: string): HTMLSpanElement {
  return el('span', 'sr-only', text);
}

/** One person in the lineup. Built with textContent only, so a name can never become markup. */
function suspect(e: RankedEntry, firstLabel: string): HTMLLIElement {
  const li = el('li', 'suspect');
  li.dataset.slot = String(e.slot);
  li.dataset.role = e.role;
  li.dataset.slug = e.slug;
  li.dataset.rank = String(e.rank);
  li.dataset.tied = String(e.tied);
  li.dataset.first = String(e.rank === 1);
  li.dataset.band = e.band;

  const placard = el('p', 'suspect-placard', e.placard);
  const figure = el('div', 'suspect-figure');
  figure.setAttribute('aria-hidden', 'true');
  const who = el('p', 'suspect-who');
  who.append(sr(', '), e.who);
  if (e.role === 'boss') {
    who.append(sr(', '), el('span', 'suspect-boss', 'Boss'));
  }
  const score = el('p', 'suspect-score');
  const n = el('span', 'suspect-n', String(e.obs));
  n.dataset.obsScore = String(e.obs);
  score.append(sr(', Doom Score '), n, el('span', 'suspect-of', 'Doom Score / 100'));
  const title = el('p', 'suspect-t');
  title.append(sr(', job: '), e.title);
  const band = el('p', 'suspect-band', BAND_LABELS[e.band]);
  band.prepend(sr(', band: '));
  const receipts = el('a', 'suspect-receipts', 'Receipts');
  receipts.href = `/v/${e.slug}/`;
  receipts.dataset.receipts = e.slug;
  receipts.append(sr(` for ${e.title}, Doom Score ${e.obs}`), ' →');
  li.append(placard, figure, who, score, title, band, receipts);
  if (e.rank === 1) {
    const stamp = el('p', 'suspect-stamp', firstLabel);
    stamp.setAttribute('aria-hidden', 'true');
    li.append(stamp);
  }
  return li;
}

/** Writes a lineup into the result article. Text only (textContent), so names and data can never become markup. */
export function fillLineup(root: HTMLElement, view: LineupView): void {
  for (const field of VIEW_FIELDS) {
    root.querySelectorAll<HTMLElement>(`[data-lf="${field}"]`).forEach((n) => {
      n.textContent = view[field];
    });
  }
  root.querySelector<HTMLElement>('[data-lf="quip"]')?.setAttribute('data-quip-id', view.quipId);
  const list = root.querySelector<HTMLOListElement>('[data-lineup-list]');
  if (list) {
    list.replaceChildren(...view.entries.map((e) => suspect(e, view.topTied ? 'Tied first' : 'Picked first')));
    list.style.setProperty('--n', String(view.count));
  }
  root.dataset.lineupKey = view.key;
  root.dataset.count = String(view.count);
  root.dataset.boss = String(view.hasBoss);
  root.dataset.topTied = String(view.topTied);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const runs = new WeakMap<HTMLElement, number>();

/** The suspects shuffle in one by one and the robot points. Reduced motion shows the final state at once. */
export async function revealLineup(root: HTMLElement): Promise<void> {
  const run = (runs.get(root) ?? 0) + 1;
  runs.set(root, run);
  root.dataset.revealed = 'false';
  try {
    if (prefersReducedMotion()) return;
    root.classList.remove('is-lineup');
    void root.offsetWidth;
    root.classList.add('is-lineup');
    await sleep(1600);
  } finally {
    if (runs.get(root) === run) {
      root.classList.remove('is-lineup');
      root.dataset.revealed = 'true';
    }
  }
}
