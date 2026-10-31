import type { Matcher, Suggestion } from './match';

export type JobComboboxOptions = {
  input: HTMLInputElement;
  list: HTMLUListElement;
  /** Polite live region for result counts and choices. */
  status: HTMLElement;
  /** Unique per page: option element ids are `${idPrefix}-${i}`. */
  idPrefix: string;
  /** Resolves the matcher, fetching the search index on first use. */
  load: () => Promise<Matcher>;
  onChoose: (s: Suggestion) => void | Promise<void>;
  /** Enter or form submit: the highlighted option, else the best match (null when nothing matches). */
  onSubmit: (query: string, pick: Suggestion | null, matcher: Matcher) => void | Promise<void>;
  minQuery?: number;
  /** Spoken when Enter is pressed on fewer than minQuery characters. */
  tooShort?: string;
  /** Spoken when typing finds nothing; {q} is the query. */
  noMatch?: string;
};

export type JobCombobox = {
  say: (msg: string) => void;
  /** Writes the chosen title into the input and closes the popup. */
  select: (title: string) => void;
  /** Same as pressing Enter in the input (for a form's submit button). */
  submit: () => Promise<void>;
};

/**
 * The job search combobox (ARIA 1.2 combobox with a listbox popup) shared by the home hero and the battle page: the
 * same matcher, the same keyboard model, and text-only option rendering.
 */
export function createJobCombobox(o: JobComboboxOptions): JobCombobox {
  const { input, list, status, idPrefix } = o;
  const minQuery = o.minQuery ?? 2;
  let options: Suggestion[] = [];
  /** The trimmed query the current options were rendered for. */
  let optionsQuery = '';
  let active = -1;

  const say = (msg: string) => {
    // Clearing first makes screen readers announce a repeated message again.
    status.textContent = '';
    requestAnimationFrame(() => (status.textContent = msg));
  };

  function setActive(i: number) {
    active = i;
    list.querySelectorAll<HTMLElement>('[role="option"]').forEach((el, j) => {
      el.setAttribute('aria-selected', String(j === i));
      el.classList.toggle('is-active', j === i);
    });
    if (i >= 0 && options[i]) {
      input.setAttribute('aria-activedescendant', `${idPrefix}-${i}`);
      list.querySelector<HTMLElement>(`#${idPrefix}-${i}`)?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }

  function setOpen(open: boolean) {
    list.hidden = !open;
    input.setAttribute('aria-expanded', String(open));
    if (!open) setActive(-1);
  }

  function optionLabel(s: Suggestion): string {
    return `${s.title}, Doom Score ${s.obs}${s.kind !== 'title' ? `, matched ${s.matched}` : ''}`;
  }

  function renderOptions(items: Suggestion[], query = '') {
    options = items;
    optionsQuery = query;
    const nodes = items.map((s, i) => {
      const li = document.createElement('li');
      li.id = `${idPrefix}-${i}`;
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
      li.addEventListener('click', () => void o.onChoose(s));
      return li;
    });
    list.replaceChildren(...nodes);
    // A highlight from the previous list would point at a missing or different job.
    setActive(-1);
  }

  async function update() {
    const q = input.value.trim();
    if (q.length < minQuery) {
      renderOptions([]);
      setOpen(false);
      return;
    }
    const matcher = await o.load();
    if (input.value.trim() !== q) return;
    const items = matcher(q);
    renderOptions(items, q);
    setOpen(items.length > 0);
    say(
      items.length
        ? `${items.length} ${items.length === 1 ? 'job matches' : 'jobs match'}. Use the up and down arrows to choose, then press Enter.`
        : (o.noMatch ?? 'No match for “{q}”. Press Enter to see the closest jobs we have.').replace('{q}', q),
    );
  }

  async function submit() {
    const q = input.value.trim();
    if (q.length < minQuery) {
      say(o.tooShort ?? 'Type at least two letters of your job title.');
      input.focus();
      return;
    }
    const matcher = await o.load();
    const highlighted = active >= 0 && optionsQuery === q ? options[active] : undefined;
    const pick = highlighted ?? matcher(q)[0];
    await o.onSubmit(q, pick ?? null, matcher);
  }

  input.addEventListener('focus', () => void o.load().catch(() => {}), { once: true });
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

  return {
    say,
    select(title: string) {
      input.value = title;
      setOpen(false);
    },
    submit,
  };
}
