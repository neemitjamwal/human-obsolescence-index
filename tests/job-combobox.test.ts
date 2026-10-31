import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createJobCombobox } from '../src/lib/job-combobox';
import { createMatcher, type SearchIndex, type Suggestion } from '../src/lib/match';

const live: SearchIndex = JSON.parse(readFileSync(join(__dirname, '..', 'public/data/search-index.json'), 'utf8'));
const matcher = createMatcher(live);

/** Just enough of the DOM for the combobox: attributes, children, ids and events. */
class FakeEl {
  id = '';
  className = '';
  hidden = false;
  value = '';
  textContent = '';
  children: FakeEl[] = [];
  attrs = new Map<string, string>();
  listeners = new Map<string, ((e: unknown) => void)[]>();
  classList = { toggle: (_c: string, _on?: boolean) => {} };
  setAttribute(k: string, v: string) { this.attrs.set(k, v); }
  getAttribute(k: string) { return this.attrs.get(k) ?? null; }
  removeAttribute(k: string) { this.attrs.delete(k); }
  append(...c: FakeEl[]) { this.children.push(...c); }
  replaceChildren(...c: FakeEl[]) { this.children = c; }
  addEventListener(type: string, fn: (e: unknown) => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]); }
  dispatch(type: string, e: Record<string, unknown> = {}) { for (const fn of this.listeners.get(type) ?? []) fn({ preventDefault() {}, ...e }); }
  querySelectorAll(_sel: string) { return this.children.filter((c) => c.getAttribute('role') === 'option'); }
  querySelector(sel: string) { return this.children.find((c) => `#${c.id}` === sel) ?? null; }
  focus() {}
  scrollIntoView() {}
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup() {
  const input = new FakeEl();
  const list = new FakeEl();
  const status = new FakeEl();
  const submitted: (Suggestion | null)[] = [];
  createJobCombobox({
    input: input as unknown as HTMLInputElement,
    list: list as unknown as HTMLUListElement,
    status: status as unknown as HTMLElement,
    idPrefix: 'opt',
    load: async () => matcher,
    onChoose: () => {},
    onSubmit: (_q, pick) => void submitted.push(pick),
  });
  const type = async (v: string) => {
    input.value = v;
    input.dispatch('input');
    await flush();
  };
  const key = async (k: string) => {
    input.dispatch('keydown', { key: k });
    await flush();
  };
  const activeOption = () => {
    const id = input.getAttribute('aria-activedescendant');
    return id ? list.children.find((c) => c.id === id) : undefined;
  };
  return { input, list, status, submitted, type, key, activeOption };
}

describe('job combobox keeps the highlight in step with the suggestions', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { createElement: () => new FakeEl() });
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => cb());
  });
  afterEach(() => vi.unstubAllGlobals());

  it('"tele", ArrowDown x5, then "m": the stale fifth highlight is dropped and Enter picks a real option', async () => {
    expect(matcher('tele')).toHaveLength(5);
    const telem = matcher('telem');
    expect(telem.length).toBeGreaterThan(0);
    expect(telem.length).toBeLessThan(5);

    const c = setup();
    await c.type('tele');
    for (let i = 0; i < 5; i++) await c.key('ArrowDown');
    expect(c.activeOption()?.id).toBe('opt-4');

    await c.type('telem');
    expect(c.list.children).toHaveLength(telem.length);
    expect(c.input.getAttribute('aria-activedescendant')).toBeNull();
    expect(c.list.children.every((li) => li.getAttribute('aria-selected') === 'false')).toBe(true);

    await c.key('Enter');
    expect(c.submitted).toHaveLength(1);
    expect(c.submitted[0]).not.toBeNull();
    expect(c.submitted[0]!.slug).toBe(telem[0].slug);
  });

  it('after refining, ArrowDown highlights the new first option and Enter picks exactly that one', async () => {
    const c = setup();
    await c.type('tele');
    for (let i = 0; i < 3; i++) await c.key('ArrowDown');
    await c.type('telem');
    await c.key('ArrowDown');
    expect(c.activeOption()?.id).toBe('opt-0');
    await c.key('Enter');
    expect(c.submitted[0]!.slug).toBe(matcher('telem')[0].slug);
  });

  it('a highlight is never applied to a different query than the one it was made on', async () => {
    const c = setup();
    await c.type('tele');
    await c.key('ArrowDown');
    await c.key('ArrowDown');
    // The input changes but the suggestions have not been rebuilt yet (no input event yet).
    c.input.value = 'lawyer';
    await c.key('Enter');
    expect(c.submitted[0]!.slug).toBe(matcher('lawyer')[0].slug);
  });
});
