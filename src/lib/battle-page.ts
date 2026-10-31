import { battleQueryPath, battlePairPath, battleTitle, committedPair, committedPick, battleView, parseBattleQuery, type BattleView, type Fighter, type Side } from './battle';
import { battleCardAlt, battleCardFileName, battleCardText, drawBattleCard, loadBattleArt } from './battle-card';
import { fillBattle, revealBattle } from './battle-dom';
import { fetchJson } from './hero';
import { createJobCombobox, type JobCombobox } from './job-combobox';
import { createMatcher, type Matcher, type SearchIndex, type Suggestion } from './match';
import { createShareCore, type ShareSubject } from './share-panel';
import { prefersReducedMotion } from './verdict-dom';
import type { VerdictFeed, VerdictRecord } from './verdict-view';

function fighterOf(r: VerdictRecord): Fighter {
  return { slug: r.slug, title: r.title, obs: r.obs, band: r.band, projectedChangePct: r.projectedChangePct };
}

export function battleSubject(view: BattleView, edition: string, url: string): ShareSubject {
  return {
    key: `${view.key}|${view.outcome.kind}`,
    url,
    title: battleTitle(view),
    text: `${view.headline}. ${view.quip}`,
    sample: Object.values(battleCardText(view, edition)).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v))).join(' '),
    fileName: (kind) => battleCardFileName(view, kind),
    alt: (kind) => battleCardAlt(view, kind),
    prepare: async () => {
      const art = await loadBattleArt();
      return {
        draw: (canvas, kind) => drawBattleCard(canvas, kind, view, edition, art),
        art: `${art.photo ? 'referee' : 'no-referee'}+${art.slipRobot ? 'pinkslip-robot' : 'no-robot'}`,
      };
    },
  };
}

type Data = { matcher: Matcher; feed: VerdictFeed; bySlug: Map<string, VerdictRecord> };

/** /vs/: two job comboboxes, the reveal, ?a=&b= restore and the battle share cards. */
export function initBattlePage(page: HTMLElement) {
  const form = page.querySelector<HTMLFormElement>('[data-battle-form]')!;
  const status = page.querySelector<HTMLElement>('[data-battle-status]')!;
  const zone = page.querySelector<HTMLElement>('[data-battle-zone]')!;
  const result = zone.querySelector<HTMLElement>('[data-battle]')!;
  const shareRoot = zone.querySelector<HTMLElement>('[data-share-panel]')!;
  const share = createShareCore(shareRoot);
  const picks: Record<Side, VerdictRecord | null> = { a: null, b: null };
  const corner = { a: 'red corner', b: 'blue corner' } as const;
  let data: Promise<Data> | null = null;
  // While the Fight button resolves both corners, choosing a corner must not start the fight on its own.
  let submitting = false;

  function load(): Promise<Data> {
    data ??= Promise.all([fetchJson<SearchIndex>('/data/search-index.json'), fetchJson<VerdictFeed>('/data/verdicts.json')])
      .then(([index, feed]) => {
        page.dataset.searchReady = 'true';
        return { matcher: createMatcher(index), feed, bySlug: new Map(feed.verdicts.map((v) => [v.slug, v])) };
      })
      .catch((err) => {
        data = null;
        page.dataset.searchReady = 'error';
        combos.a.say('The search files did not load. Check your connection and try again.');
        throw err;
      });
    return data;
  }

  const inputs = {
    a: page.querySelector<HTMLInputElement>('[data-battle-input="a"]')!,
    b: page.querySelector<HTMLInputElement>('[data-battle-input="b"]')!,
  };

  function makeCombo(side: Side): JobCombobox {
    return createJobCombobox({
      input: inputs[side],
      list: page.querySelector<HTMLUListElement>(`[data-battle-list="${side}"]`)!,
      status,
      idPrefix: `vs-${side}-opt`,
      load: () => load().then((d) => d.matcher),
      onChoose: (s) => choose(side, s),
      onSubmit: async (q, pick) => {
        if (pick) await choose(side, pick);
        else combos[side].say(`No job called “${q}” in our files. Try another word for the ${corner[side]}.`);
      },
      noMatch: 'No match for “{q}”. Try another word.',
    });
  }
  const combos: Record<Side, JobCombobox> = { a: makeCombo('a'), b: makeCombo('b') };
  const typed = () => ({ a: inputs.a.value, b: inputs.b.value });

  for (const side of ['a', 'b'] as Side[]) {
    inputs[side].addEventListener('input', () => {
      if (!picks[side] || committedPick(picks[side], inputs[side].value)) return;
      picks[side] = null;
      // The matchup on screen no longer matches the corners, so it must not stay up for sharing.
      if (!zone.hidden) {
        zone.hidden = true;
        history.replaceState(null, '', location.pathname);
      }
    });
  }

  async function choose(side: Side, s: Suggestion) {
    const { bySlug } = await load();
    const record = bySlug.get(s.slug);
    if (!record) return;
    picks[side] = record;
    combos[side].select(record.title);
    const other: Side = side === 'a' ? 'b' : 'a';
    const otherReady = committedPick(picks[other], inputs[other].value);
    if (otherReady && !submitting) await fight();
    else if (!otherReady) {
      combos[side].say(`${capital(corner[side])}: ${record.title}, Doom Score ${record.obs}. Now pick the ${corner[other]}.`);
      inputs[other].focus();
    }
  }

  async function fight() {
    const pair = committedPair(picks, typed());
    if (!pair) return;
    const { a, b } = pair;
    const view = battleView(fighterOf(a), fighterOf(b));
    const { feed } = await load();
    fillBattle(result, view, { a: fighterOf(a), b: fighterOf(b) });
    zone.hidden = false;
    result.hidden = false;
    const path = battleQueryPath(a.slug, b.slug);
    history.replaceState(null, '', path);
    const shown = share.show(battleSubject(view, feed.edition, new URL(path, location.origin).href));
    result.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    combos.a.say(
      view.outcome.kind === 'win'
        ? `${view.headline}. ${view.winnerTitle} is the safer job, Doom Score ${view[view.outcome.winner].score} against ${view[view.outcome.loser].score}. The pink slip goes to ${view.pinkSlipTitle}.`
        : `${view.headline}. ${view.referee}`,
    );
    await revealBattle(result);
    await shown;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    void (async () => {
      for (const side of ['a', 'b'] as Side[]) {
        const typed = inputs[side].value.trim();
        if (picks[side] && typed === picks[side]!.title) continue;
        picks[side] = null;
        if (!typed) {
          combos[side].say(`Pick a job for the ${corner[side]} first.`);
          inputs[side].focus();
          return;
        }
        await combos[side].submit();
        if (!picks[side]) return;
      }
      submitting = false;
      await fight();
    })()
      .catch(() => {})
      .finally(() => {
        submitting = false;
      });
  });

  async function restore() {
    const q = parseBattleQuery(location.search);
    if (!q.a && !q.b) return;
    page.dataset.restore = 'pending';
    const { bySlug } = await load();
    const found = { a: q.a ? bySlug.get(q.a) ?? null : null, b: q.b ? bySlug.get(q.b) ?? null : null };
    for (const side of ['a', 'b'] as Side[]) {
      const r = found[side];
      if (r) {
        picks[side] = r;
        combos[side].select(r.title);
      }
    }
    if (found.a && found.b) {
      page.dataset.restore = 'done';
      await fight();
    } else {
      page.dataset.restore = 'partial';
      combos.a.say('That battle link names a job we do not have. Pick the missing corner below.');
    }
  }

  void restore().catch(() => {});
}

function capital(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** /vs/<a>-vs-<b>/: the matchup is static HTML; this draws its share cards and plays the reveal. */
export function initBattlePairPage(result: HTMLElement, shareRoot: HTMLElement) {
  let fighters: { a: Fighter; b: Fighter } | null = null;
  try {
    fighters = JSON.parse(result.dataset.battleRecord ?? 'null');
  } catch {
    fighters = null;
  }
  if (!fighters) return;
  const view = battleView(fighters.a, fighters.b);
  const url = new URL(battlePairPath(fighters.a.slug, fighters.b.slug), location.origin).href;
  void createShareCore(shareRoot).show(battleSubject(view, result.dataset.edition ?? '', url));
  void revealBattle(result);
}
