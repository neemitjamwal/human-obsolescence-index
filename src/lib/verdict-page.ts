import { nameFromQuery } from './name';
import { createSharePanel } from './share-panel';
import { fillName, readRecord } from './verdict-dom';
import { verdictView } from './verdict-view';

/** /v/<slug>/: restores the optional ?n= name into the headline and the cards. The verdict itself is static HTML. */
export function initVerdictPage(panel: HTMLElement, shareRoot: HTMLElement) {
  const record = readRecord(panel);
  if (!record) return;
  const feed = { edition: panel.dataset.edition ?? '', boardSize: Number(panel.dataset.boardSize) };
  const name = nameFromQuery(new URLSearchParams(location.search).get('n'));
  const view = verdictView(record, feed, name);
  if (name) fillName(panel, view);
  panel.dataset.name = name ? 'set' : 'none';
  panel.dataset.revealed = 'true';
  void createSharePanel(shareRoot).show(view, name);
}
