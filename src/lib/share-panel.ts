import { CARD_SIZES, cardAlt, cardFileName, cardText, drawCard, loadCardArt, loadCardFonts, type CardKind } from './card';
import { sharePath, type VerdictView } from './verdict-view';

type State = { view: VerdictView; url: string; drawn: Promise<void> };

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('canvas export failed'))), 'image/png'));
}

/** Wires a SharePanel: draws both cards for the current verdict and runs Download / Share / Copy link. */
export function createSharePanel(root: HTMLElement) {
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

  async function draw(view: VerdictView) {
    const sample = Object.values(cardText(view)).join(' ');
    const [fontsLoaded, art] = await Promise.all([loadCardFonts(sample), loadCardArt()]);
    if (state?.view !== view) return;
    root.dataset.fonts = fontsLoaded ? 'loaded' : 'fallback';
    root.dataset.art = `${art.photo ? 'photo' : 'no-photo'}+${Object.keys(art.robots).length}-robots`;
    for (const kind of ['story', 'post'] as const) {
      const canvas = canvases[kind];
      if (!canvas) continue;
      drawCard(canvas, kind, view, art);
      canvas.setAttribute('aria-label', cardAlt(view, kind));
    }
    root.dataset.cards = `${view.slug}|${view.headline}`;
  }

  function show(view: VerdictView, name: string) {
    const url = new URL(sharePath(view.slug, name), location.origin).href;
    if (urlInput) urlInput.value = url;
    root.dataset.shareUrl = url;
    const next: State = { view, url, drawn: Promise.resolve() };
    state = next;
    next.drawn = draw(view);
    return next.drawn;
  }

  async function copyLink(): Promise<boolean> {
    if (!state) return false;
    try {
      await navigator.clipboard.writeText(state.url);
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
        a.download = cardFileName(state.view.slug, kind);
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
    say((await copyLink()) ? `Link copied: ${state.url}` : `Copy this link from the box above: ${state.url}`);
  });

  root.querySelector<HTMLButtonElement>('[data-share-native]')?.addEventListener('click', async () => {
    if (!state) return;
    const { view, url } = state;
    const data: ShareData = { title: `${view.title}: Doom Score ${view.score}/100`, text: `${view.headline}. ${view.roast}`, url };
    try {
      if (typeof navigator.share === 'function') {
        await state.drawn;
        const canvas = canvases.story;
        let files: File[] | null = null;
        if (canvas && typeof navigator.canShare === 'function') {
          const file = new File([await toBlob(canvas)], cardFileName(view.slug, 'story'), { type: 'image/png' });
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
        ? `This browser has no share sheet, so we copied the link instead: ${url}`
        : `This browser has no share sheet. Copy this link from the box above: ${url}`,
    );
  });

  return { show };
}
