import { committedPick } from './battle';
import { fetchJson } from './hero';
import { createJobCombobox, type JobCombobox } from './job-combobox';
import {
  MAX_COWORKERS,
  MIN_COWORKERS,
  hasLineupLink,
  lineupPath,
  lineupProblem,
  lineupView,
  parseLineupLink,
  resolveLineup,
  slotLabel,
  type LineupRole,
  type LineupSlot,
  type LineupView,
} from './lineup';
import { lineupCardAlt, lineupCardFileName, lineupCardText, drawLineupCard, loadLineupArt } from './lineup-card';
import { fillLineup, revealLineup } from './lineup-dom';
import { createMatcher, type Matcher, type SearchIndex, type Suggestion } from './match';
import { sanitizeName } from './name';
import { createShareCore, type ShareSubject } from './share-panel';
import { prefersReducedMotion } from './verdict-dom';
import type { VerdictFeed, VerdictRecord } from './verdict-view';

export function lineupSubject(view: LineupView, edition: string, url: string): ShareSubject {
  const t = lineupCardText(view, edition);
  return {
    key: `${view.key}|${view.entries.map((e) => e.who).join(',')}`,
    url,
    title: 'Office lineup: who do the robots pick first?',
    text: `${view.headline}. ${view.subhead}. ${view.quip}`,
    sample: [t.masthead, t.strap, t.stinger, t.headline, t.subhead, t.robotLine, t.quip, t.scoreLine, t.url, t.firstLabel, t.bossLabel, t.scoreLabel, ...t.rows.flatMap((r) => [r.placard, r.who, r.title, r.score])].join(' '),
    fileName: (kind) => lineupCardFileName(view, kind),
    alt: (kind) => lineupCardAlt(view, kind),
    prepare: async () => {
      const art = await loadLineupArt();
      return { draw: (canvas, kind) => drawLineupCard(canvas, kind, view, edition, art), art: art.robot ? 'pointing-robot' : 'no-robot' };
    },
  };
}

type Data = { matcher: Matcher; feed: VerdictFeed; bySlug: Map<string, VerdictRecord> };

type Slot = {
  index: number;
  role: LineupRole;
  root: HTMLElement;
  input: HTMLInputElement;
  name: HTMLInputElement;
  combo: JobCombobox;
  pick: VerdictRecord | null;
};

const BOSS = MAX_COWORKERS;

/** /office-lineup/: two to four coworker pickers plus an optional boss, the ranked lineup, and its share cards. */
export function initLineupPage(page: HTMLElement) {
  const form = page.querySelector<HTMLFormElement>('[data-lineup-form]')!;
  const status = page.querySelector<HTMLElement>('[data-lineup-status]')!;
  const zone = page.querySelector<HTMLElement>('[data-lineup-zone]')!;
  const result = zone.querySelector<HTMLElement>('[data-lineup]')!;
  const share = createShareCore(zone.querySelector<HTMLElement>('[data-share-panel]')!);
  const addCoworker = page.querySelector<HTMLButtonElement>('[data-add-coworker]')!;
  const addBoss = page.querySelector<HTMLButtonElement>('[data-add-boss]')!;
  const removeBoss = page.querySelector<HTMLButtonElement>('[data-remove-boss]')!;
  let data: Promise<Data> | null = null;
  let visible = MIN_COWORKERS;
  let bossOn = false;
  let shown = false;
  let submitting = false;
  let nameTimer: ReturnType<typeof setTimeout> | undefined;

  function load(): Promise<Data> {
    data ??= Promise.all([fetchJson<SearchIndex>('/data/search-index.json'), fetchJson<VerdictFeed>('/data/verdicts.json')])
      .then(([index, feed]) => {
        page.dataset.searchReady = 'true';
        return { matcher: createMatcher(index), feed, bySlug: new Map(feed.verdicts.map((v) => [v.slug, v])) };
      })
      .catch((err) => {
        data = null;
        page.dataset.searchReady = 'error';
        say('The search files did not load. Check your connection and try again.');
        throw err;
      });
    return data;
  }

  const say = (msg: string) => slots[0].combo.say(msg);
  const label = (s: Slot) => slotLabel(s.role, s.index);

  const slots: Slot[] = [...page.querySelectorAll<HTMLElement>('[data-slot]')].map((root) => {
    const index = Number(root.dataset.slot);
    const role = root.dataset.role as LineupRole;
    const input = root.querySelector<HTMLInputElement>('[data-slot-job]')!;
    const slot = { index, role, root, input, name: root.querySelector<HTMLInputElement>('[data-slot-name]')!, pick: null } as Omit<Slot, 'combo'> as Slot;
    slot.combo = createJobCombobox({
      input,
      list: root.querySelector<HTMLUListElement>('[data-slot-list]')!,
      status,
      idPrefix: `ol-${index}-opt`,
      load: () => load().then((d) => d.matcher),
      onChoose: (s) => choose(slot, s),
      onSubmit: async (q, pick) => {
        if (pick) await choose(slot, pick);
        else slot.combo.say(`No job called “${q}” in our files. Try another word for ${label(slot).toLowerCase()}.`);
      },
      noMatch: 'No match for “{q}”. Try another word.',
    });
    return slot;
  });

  const active = () => [...slots.slice(0, visible), ...(bossOn ? [slots[BOSS]] : [])];

  function committed(s: Slot): VerdictRecord | null {
    return committedPick(s.pick, s.input.value);
  }

  function lineupSlots(): LineupSlot<VerdictRecord>[] | null {
    const out: LineupSlot<VerdictRecord>[] = [];
    for (const s of active()) {
      const pick = committed(s);
      if (!pick) return null;
      out.push({ role: s.role, pick, name: sanitizeName(s.name.value) });
    }
    return lineupProblem(out) ? null : out;
  }

  function withdraw() {
    if (!shown) return;
    shown = false;
    // The lineup on screen no longer matches the slots, so it must not stay up for sharing or come back on reload.
    zone.hidden = true;
    if (location.search || location.hash) history.replaceState(null, '', location.pathname);
  }

  function syncControls() {
    slots.forEach((s, i) => {
      if (s.role === 'coworker') s.root.hidden = i >= visible;
    });
    slots[BOSS].root.hidden = !bossOn;
    addCoworker.hidden = visible >= MAX_COWORKERS;
    addBoss.hidden = bossOn;
    page.dataset.coworkers = String(visible);
    page.dataset.bossSlot = String(bossOn);
  }

  async function choose(slot: Slot, s: Suggestion) {
    const { bySlug } = await load();
    const record = bySlug.get(s.slug);
    if (!record) return;
    slot.pick = record;
    slot.combo.select(record.title);
    if (shown && !submitting) {
      await render();
      return;
    }
    if (submitting) return;
    const next = active().find((x) => !committed(x));
    // Focus stays in DOM order: this slot's optional name comes next, then Tab reaches the next job.
    slot.name.focus();
    slot.combo.say(
      `${label(slot)}: ${record.title}, Doom Score ${record.obs}. Optional first name next, then ${next ? `pick a job for ${label(next).toLowerCase()}` : 'press Line them up'}.`,
    );
  }

  async function render(opts: { scroll?: boolean; reveal?: boolean } = {}) {
    const chosen = lineupSlots();
    if (!chosen) return;
    const { feed } = await load();
    const view = lineupView(chosen);
    fillLineup(result, view);
    zone.hidden = false;
    shown = true;
    const path = lineupPath(chosen.map((s) => ({ role: s.role, slug: s.pick.slug, name: s.name })));
    history.replaceState(null, '', path);
    const drawn = share.show(lineupSubject(view, feed.edition, new URL(path, location.origin).href));
    if (opts.scroll !== false) result.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    say(`${view.headline}. ${view.subhead}. Lineup, highest Doom Score first: ${view.entries.map((e) => `${e.placard}, ${e.who}, ${e.title}, Doom Score ${e.obs}`).join('; ')}.`);
    if (opts.reveal !== false) await revealLineup(result);
    await drawn;
  }

  for (const s of slots) {
    s.input.addEventListener('input', () => {
      if (!s.pick || committed(s)) return;
      s.pick = null;
      withdraw();
    });
    s.name.addEventListener('input', () => {
      clearTimeout(nameTimer);
      nameTimer = setTimeout(() => {
        if (shown) void render({ scroll: false, reveal: false }).catch(() => {});
      }, 250);
    });
  }

  function moveSlot(from: Slot, to: Slot) {
    to.input.value = from.input.value;
    to.pick = from.pick;
    to.name.value = from.name.value;
  }

  function clearSlot(s: Slot) {
    s.input.value = '';
    s.pick = null;
    s.name.value = '';
  }

  async function changed() {
    if (!shown) return;
    if (lineupSlots()) await render({ scroll: false, reveal: false });
    else withdraw();
  }

  addCoworker.addEventListener('click', () => {
    if (visible >= MAX_COWORKERS) return;
    visible += 1;
    syncControls();
    const s = slots[visible - 1];
    s.input.focus();
    s.combo.say(`${label(s)} added. Pick a job.`);
    withdraw();
  });

  page.querySelectorAll<HTMLButtonElement>('[data-slot-remove]').forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number(button.closest<HTMLElement>('[data-slot]')!.dataset.slot);
      if (index >= visible || visible <= MIN_COWORKERS) return;
      for (let i = index; i < visible - 1; i++) moveSlot(slots[i + 1], slots[i]);
      clearSlot(slots[visible - 1]);
      visible -= 1;
      syncControls();
      say(`Coworker removed. ${visible} coworkers in the lineup.`);
      (visible < MAX_COWORKERS ? addCoworker : slots[visible - 1].input).focus();
      void changed().catch(() => {});
    });
  });

  addBoss.addEventListener('click', () => {
    bossOn = true;
    syncControls();
    slots[BOSS].input.focus();
    slots[BOSS].combo.say('Boss slot added. Pick the boss’s job, or remove the boss to leave them out.');
    withdraw();
  });

  removeBoss.addEventListener('click', () => {
    bossOn = false;
    clearSlot(slots[BOSS]);
    syncControls();
    addBoss.focus();
    say('Boss removed from the lineup.');
    void changed().catch(() => {});
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    void (async () => {
      for (const s of active()) {
        if (committed(s)) continue;
        s.pick = null;
        if (!s.input.value.trim()) {
          s.combo.say(s.role === 'boss' ? 'Pick the boss’s job, or remove the boss.' : `Pick a job for ${label(s).toLowerCase()} first.`);
          s.input.focus();
          return;
        }
        await s.combo.submit();
        if (!committed(s)) return;
      }
      submitting = false;
      await render();
    })()
      .catch(() => {})
      .finally(() => {
        submitting = false;
      });
  });

  async function restore() {
    if (!hasLineupLink(location.search)) return;
    page.dataset.restore = 'pending';
    const { bySlug } = await load();
    const link = parseLineupLink(location.search, location.hash);
    const r = resolveLineup(link, bySlug);
    const coworkers = r.slots.filter((s) => s.role === 'coworker');
    const boss = r.slots.find((s) => s.role === 'boss');
    visible = Math.min(MAX_COWORKERS, Math.max(MIN_COWORKERS, coworkers.length));
    bossOn = Boolean(boss) || Boolean(link.boss);
    coworkers.forEach((s, i) => {
      slots[i].pick = s.pick;
      slots[i].combo.select(s.pick.title);
      slots[i].name.value = s.name;
    });
    if (boss) {
      slots[BOSS].pick = boss.pick;
      slots[BOSS].combo.select(boss.pick.title);
      slots[BOSS].name.value = boss.name;
    }
    syncControls();
    const notes = [
      r.dropped ? `${r.dropped === 1 ? 'One job' : `${r.dropped} jobs`} in that link ${r.dropped === 1 ? 'is' : 'are'} not in our files and ${r.dropped === 1 ? 'was' : 'were'} left out.` : '',
      link.extraDropped ? `Only the first ${MAX_COWORKERS === 4 ? 'four' : MAX_COWORKERS} coworkers were read.` : '',
      link.namesDropped ? 'The names in that link did not match its slots, so they were left out.' : '',
    ].filter(Boolean);
    if (r.ready && lineupSlots()) {
      page.dataset.restore = r.dropped || link.extraDropped || link.namesDropped ? 'partial' : 'done';
      await render();
      if (notes.length) say(notes.join(' '));
    } else {
      page.dataset.restore = 'partial';
      history.replaceState(null, '', location.pathname);
      say(`${notes.join(' ')} Pick the missing jobs below, then press Line them up.`.trim());
    }
  }

  syncControls();
  void restore().catch(() => {});
}
