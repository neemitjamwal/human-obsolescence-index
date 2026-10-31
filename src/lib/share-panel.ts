import { CARD_SIZES, cardAlt, cardFileName, cardText, drawCard, loadCardArt, loadCardFonts, type CardKind } from './card';
import { sharePath, type VerdictView } from './verdict-view';

/** Anything a share panel can print: two canvas cards, a link and the share-sheet text. */
export type ShareSubject = {
  /** Written to data-cards once both cards are drawn. */
  key: string;
  url: string;
  title: string;
  text: string;
  /** Every string the cards print, so the fonts are loaded for exactly that text. */
  sample: string;
  fileName: (kind: CardKind) => string;
  alt: (kind: CardKind) => string;
  /** Loads the card art, then returns the drawer plus a short description of the art that loaded. */
  prepare: () => Promise<{ draw: (canvas: HTMLCanvasElement, kind: CardKind) => void; art: string }>;
};

type State = { subject: ShareSubject; drawn: Promise<void> };

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas export failed'))), 'image/png'));
}

/** Wires a SharePanel for any subject: draws both cards and runs Download / Share / Copy link. */
export function createShareCore(root: HTMLElement) {
  const canvases: Record<CardKind, HTMLCanvasElement | null> = {
    story: root.querySelector('canvas[data-card="story"]'),
    post: root.querySelector('canvas[data-card="post"]'),
  };
  const status = root.querySelector<HTMLElement>('[data-share-status]');
  const urlInput = root.querySelector<HTMLInputElement>('[data-share-url]');
  let state: State | null = null;

  const say = (msg: string) => {
    if (status) status.textContent = msg;
  };

  async function draw(subject: ShareSubject) {
    const [fontsLoaded, prepared] = await Promise.all([loadCardFonts(subject.sample), subject.prepare()]);
    if (state?.subject !== subject) return;
    root.dataset.fonts = fontsLoaded ? 'loaded' : 'fallback';
    root.dataset.art = prepared.art;
    for (const kind of ['story', 'post'] as const) {
      const canvas = canvases[kind];
      if (!canvas) continue;
      prepared.draw(canvas, kind);
      canvas.setAttribute('aria-label', subject.alt(kind));
    }
    root.dataset.cards = subject.key;
  }

  function show(subject: ShareSubject) {
    if (urlInput) urlInput.value = subject.url;
    root.dataset.shareUrl = subject.url;
    const next: State = { subject, drawn: Promise.resolve() };
    state = next;
    next.drawn = draw(subject);
    return next.drawn;
  }

  async function copyLink(): Promise<boolean> {
    if (!state) return false;
    try {
      await navigator.clipboard.writeText(state.subject.url);
      return true;
    } catch {
      if (!urlInput) return false;
      urlInput.focus();
      urlInput.select();
      try {
        return document.execCommand('copy');
      } catch {
        return false;
      }
    }
  }

  root.querySelectorAll<HTMLButtonElement>('[data-share-download]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!state) return;
      const kind = button.dataset.shareDownload as CardKind;
      const canvas = canvases[kind];
      if (!canvas) return;
      await state.drawn;
      try {
        const blob = await toBlob(canvas);
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = state.subject.fileName(kind);
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
        const { width, height } = CARD_SIZES[kind];
        say(`Downloaded ${a.download} (${width} × ${height} PNG).`);
      } catch {
        say('This browser could not export the card. Try another browser, or copy the link instead.');
      }
    });
  });

  root.querySelector<HTMLButtonElement>('[data-share-copy]')?.addEventListener('click', async () => {
    if (!state) return;
    say((await copyLink()) ? `Link copied: ${state.subject.url}` : `Copy this link from the box above: ${state.subject.url}`);
  });

  root.querySelector<HTMLButtonElement>('[data-share-native]')?.addEventListener('click', async () => {
    if (!state) return;
    const { subject } = state;
    const data: ShareData = { title: subject.title, text: subject.text, url: subject.url };
    try {
      if (typeof navigator.share === 'function') {
        await state.drawn;
        const canvas = canvases.story;
        let files: File[] | null = null;
        if (canvas && typeof navigator.canShare === 'function') {
          const file = new File([await toBlob(canvas)], subject.fileName('story'), { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) files = [file];
        }
        root.dataset.sharePath = files ? 'native-files' : 'native-link';
        await navigator.share(files ? { ...data, files } : data);
        say(files ? 'Shared the story card and link.' : 'Shared the link.');
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') {
        say('Share cancelled.');
        return;
      }
    }
    root.dataset.sharePath = 'fallback';
    say(
      (await copyLink())
        ? `This browser has no share sheet, so we copied the link instead: ${subject.url}`
        : `This browser has no share sheet. Copy this link from the box above: ${subject.url}`,
    );
  });

  return { show };
}

/** A SharePanel for one verdict (home reveal and /v/ pages). */
export function createSharePanel(root: HTMLElement) {
  const core = createShareCore(root);
  function show(view: VerdictView, name: string) {
    return core.show({
      key: `${view.slug}|${view.headline}`,
      url: new URL(sharePath(view.slug, name), location.origin).href,
      title: `${view.title}: Doom Score ${view.score}/100`,
      text: `${view.headline}. ${view.roast}`,
      sample: Object.values(cardText(view)).join(' '),
      fileName: (kind) => cardFileName(view.slug, kind),
      alt: (kind) => cardAlt(view, kind),
      prepare: async () => {
        const art = await loadCardArt();
        return {
          draw: (canvas, kind) => drawCard(canvas, kind, view, art),
          art: `${art.photo ? 'photo' : 'no-photo'}+${Object.keys(art.robots).length}-robots`,
        };
      },
    });
  }
  return { show };
}
