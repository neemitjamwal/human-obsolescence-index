import { createMatcher, type Matcher, type SearchIndex, type Suggestion } from './match';
import { sanitizeName } from './name';
import { createSharePanel } from './share-panel';
import { fillName, fillVerdict, prefersReducedMotion, reveal } from './verdict-dom';
import { verdictView, type VerdictFeed, type VerdictRecord } from './verdict-view';

type Data = { matcher: Matcher; feed: VerdictFeed; bySlug: Map<string, VerdictRecord> };

const MIN_QUERY = 2;

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * The "Type your job" combobox (ARIA 1.2 combobox with a listbox popup), the optional name field, the reveal and the
 * share panel. The search index and the verdict feed are fetched on first focus or keystroke, never on page load.
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
  let options: Suggestion[] = [];
  let active = -1;
  let current: VerdictRecord | null = null;
  let nameTimer: ReturnType<typeof setTimeout> | undefined;

  const say = (msg: string) => {
    // Clearing first makes screen readers announce a repeated message again.
    status.textContent = '';
    requestAnimationFrame(() => (status.textContent = msg));
  };

  function load(): Promise<Data> {
    data ??= Promise.all([fetchJson<SearchIndex>('/data/search-index.json'), fetchJson<VerdictFeed>('/data/verdicts.json')])
      .then(([index, feed]) => {
        root.dataset.searchReady = 'true';
        return { matcher: createMatcher(index), feed, bySlug: new Map(feed.verdicts.map((v) => [v.slug, v])) };
      })
      .catch((err) => {
        data = null;
        root.dataset.searchReady = 'error';
        say('The search files did not load. Check your connection and try again, or browse the full leaderboard.');
        throw err;
      });
    return data;
  }

  function setOpen(open: boolean) {
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) setActive(-1);
  }

  function setActive(i: number) {
    active = i;
    list.querySelectorAll<HTMLElement>('[role="option"]').forEach((el, j) => {
      el.setAttribute('aria-selected', String(j === i));
      el.classList.toggle('is-active', j === i);
    });
    if (i >= 0 && options[i]) {
      input.setAttribute('aria-activedescendant', `job-opt-${i}`);
      list.querySelector<HTMLElement>(`#job-opt-${i}`)?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function optionLabel(s: Suggestion): string {
    return `${s.title}, Doom Score ${s.obs}${s.kind !== 'title' ? `, matched ${s.matched}` : ''}`;
  }

  function renderOptions(items: Suggestion[]) {
    options = items;
    const nodes = items.map((s, i) => {
      const li = document.createElement('li');
      li.id = `job-opt-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.setAttribute('aria-label', optionLabel(s));
      li.className = 'job-opt';
      const title = document.createElement('span');
      title.className = 'job-opt-title';
      title.textContent = s.title;
      li.append(title);
      if (s.kind !== 'title') {
        const via = document.createElement('span');
        via.className = 'job-opt-via';
        via.textContent = s.note ? `“${s.matched}”: ${s.note}` : `also called “${s.matched}”`;
        li.append(via);
      }
      const score = document.createElement('span');
      score.className = 'job-opt-score';
      score.textContent = String(s.obs);
      li.append(score);
      li.addEventListener('mousedown', (e) => e.preventDefault());
      li.addEventListener('click', () => choose(s));
      return li;
    });
    list.replaceChildren(...nodes);
  }

  async function update() {
    const q = input.value.trim();
    if (q.length < MIN_QUERY) {
      renderOptions([]);
      setOpen(false);
      return;
    }
    const { matcher } = await load();
    if (input.value.trim() !== q) return;
    const items = matcher(q);
    renderOptions(items);
    setOpen(items.length > 0);
    say(
      items.length
        ? `${items.length} ${items.length === 1 ? 'job matches' : 'jobs match'}. Use the up and down arrows to choose, then press Enter.`
        : `No match for “${q}”. Press Enter to see the closest jobs we have.`,
    );
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
    say(`No job called “${q}” in our files. ${near.length ? `${near.length} closest titles listed below the search box.` : 'Try another word.'}`);
  }

  async function choose(s: Suggestion) {
    const { feed, bySlug } = await load();
    const record = bySlug.get(s.slug);
    if (!record) return;
    input.value = s.title;
    setOpen(false);
    current = record;
    noMatch.hidden = true;
    zone.hidden = false;
    panel.hidden = false;
    zone.querySelector<HTMLElement>('[data-share-panel]')!.hidden = false;
    const name = sanitizeName(nameInput.value);
    const view = verdictView(record, feed, name);
    fillVerdict(panel, view, record);
    panel.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    say(`Verdict: ${view.title}. Doom Score ${view.score} out of 100, ${view.bandLabel}. ${view.headline}. The share buttons follow the verdict.`);
    const shown = share.show(view, name);
    await reveal(panel);
    await shown;
  }

  async function submit() {
    const q = input.value.trim();
    if (q.length < MIN_QUERY) {
      say('Type at least two letters of your job title.');
      input.focus();
      return;
    }
    const { matcher } = await load();
    const pick = active >= 0 ? options[active] : matcher(q)[0];
    if (pick) await choose(pick);
    else showNoMatch(q, looseSuggestions(matcher, q));
  }

  input.addEventListener('focus', () => void load().catch(() => {}), { once: true });
  input.addEventListener('input', () => void update().catch(() => {}));
  input.addEventListener('keydown', (e) => {
    const open = !list.hidden && options.length > 0;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!options.length) return;
      e.preventDefault();
      if (!open) setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      const next = active < 0 ? (step === 1 ? 0 : options.length - 1) : (active + step + options.length) % options.length;
      setActive(next);
      say(`${optionLabel(options[next])}. ${next + 1} of ${options.length}.`);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      void submit().catch(() => {});
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
      } else if (input.value) {
        e.preventDefault();
        input.value = '';
        renderOptions([]);
      }
    } else if (e.key === 'Tab') setOpen(false);
  });
  input.addEventListener('blur', () => setTimeout(() => setOpen(false), 120));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void submit().catch(() => {});
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
