import { createJobCombobox } from './job-combobox';
import { createMatcher, type Matcher, type SearchIndex, type Suggestion } from './match';
import { sanitizeName } from './name';
import { createSharePanel } from './share-panel';
import { fillName, fillVerdict, prefersReducedMotion, reveal } from './verdict-dom';
import { verdictView, type VerdictFeed, type VerdictRecord } from './verdict-view';

type Data = { matcher: Matcher; feed: VerdictFeed; bySlug: Map<string, VerdictRecord> };

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * The "Type your job" combobox, the optional name field, the reveal and the share panel. The search index and the
 * verdict feed are fetched on first focus or keystroke, never on page load.
 */
export function initHero(root: HTMLElement) {
  const form = root.querySelector<HTMLFormElement>('[data-job-form]')!;
  const input = root.querySelector<HTMLInputElement>('[data-job-input]')!;
  const list = root.querySelector<HTMLUListElement>('[data-job-list]')!;
  const status = root.querySelector<HTMLElement>('[data-job-status]')!;
  const nameInput = root.querySelector<HTMLInputElement>('[data-name-input]')!;
  const nameEcho = root.querySelector<HTMLElement>('[data-name-echo]');
  const zone = document.querySelector<HTMLElement>('[data-verdict-zone]')!;
  const panel = zone.querySelector<HTMLElement>('[data-verdict]')!;
  const noMatch = zone.querySelector<HTMLElement>('[data-no-match]')!;
  const share = createSharePanel(zone.querySelector<HTMLElement>('[data-share-panel]')!);

  let data: Promise<Data> | null = null;
  let current: VerdictRecord | null = null;
  let nameTimer: ReturnType<typeof setTimeout> | undefined;

  function load(): Promise<Data> {
    data ??= Promise.all([fetchJson<SearchIndex>('/data/search-index.json'), fetchJson<VerdictFeed>('/data/verdicts.json')])
      .then(([index, feed]) => {
        root.dataset.searchReady = 'true';
        return { matcher: createMatcher(index), feed, bySlug: new Map(feed.verdicts.map((v) => [v.slug, v])) };
      })
      .catch((err) => {
        data = null;
        root.dataset.searchReady = 'error';
        combo.say('The search files did not load. Check your connection and try again, or browse the full leaderboard.');
        throw err;
      });
    return data;
  }

  function looseSuggestions(matcher: Matcher, q: string): Suggestion[] {
    const seen = new Map<string, Suggestion>();
    const words = q.split(/\s+/).filter((w) => w.length >= 3).sort((a, b) => b.length - a.length);
    const tries = [...words, ...words.map((w) => w.slice(0, 4)), ...words.map((w) => w.slice(0, 3))];
    for (const t of tries) {
      for (const s of matcher(t, 3)) if (!seen.has(s.slug)) seen.set(s.slug, s);
      if (seen.size >= 3) break;
    }
    return [...seen.values()].slice(0, 3);
  }

  function showNoMatch(q: string, near: Suggestion[]) {
    current = null;
    panel.hidden = true;
    zone.querySelector<HTMLElement>('[data-share-panel]')!.hidden = true;
    zone.hidden = false;
    noMatch.hidden = false;
    noMatch.querySelector('[data-no-match-q]')!.textContent = q;
    const listEl = noMatch.querySelector<HTMLUListElement>('[data-no-match-list]')!;
    const intro = noMatch.querySelector<HTMLElement>('[data-no-match-intro]')!;
    intro.textContent = near.length
      ? 'We will not guess. These are the closest titles in our files, and none of them is a verdict on your job until you pick it:'
      : 'We will not guess a verdict. Try another word for the job, or find it on the full board.';
    listEl.replaceChildren(
      ...near.map((s) => {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn';
        b.textContent = `${s.title} · Doom Score ${s.obs}`;
        b.addEventListener('click', () => choose(s));
        li.append(b);
        return li;
      }),
    );
    combo.say(`No job called “${q}” in our files. ${near.length ? `${near.length} closest titles listed below the search box.` : 'Try another word.'}`);
  }

  async function choose(s: Suggestion) {
    const { feed, bySlug } = await load();
    const record = bySlug.get(s.slug);
    if (!record) return;
    combo.select(s.title);
    current = record;
    noMatch.hidden = true;
    zone.hidden = false;
    panel.hidden = false;
    zone.querySelector<HTMLElement>('[data-share-panel]')!.hidden = false;
    const name = sanitizeName(nameInput.value);
    const view = verdictView(record, feed, name);
    fillVerdict(panel, view, record);
    panel.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    combo.say(`Verdict: ${view.title}. Doom Score ${view.score} out of 100, ${view.bandLabel}. ${view.headline}. The share buttons follow the verdict.`);
    const shown = share.show(view, name);
    await reveal(panel);
    await shown;
  }

  const combo = createJobCombobox({
    input,
    list,
    status,
    idPrefix: 'job-opt',
    load: () => load().then((d) => d.matcher),
    onChoose: choose,
    onSubmit: async (q, pick, matcher) => {
      if (pick) await choose(pick);
      else showNoMatch(q, looseSuggestions(matcher, q));
    },
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void combo.submit().catch(() => {});
  });

  nameInput.addEventListener('input', () => {
    const name = sanitizeName(nameInput.value);
    if (nameEcho) nameEcho.textContent = name ? `In print as: ${name}` : '';
    clearTimeout(nameTimer);
    nameTimer = setTimeout(async () => {
      if (!current) return;
      const { feed } = await load();
      const view = verdictView(current, feed, name);
      fillName(panel, view);
      void share.show(view, name);
    }, 250);
  });
}
