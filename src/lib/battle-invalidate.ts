import { committedPick, type Side } from './battle';

export type CornerWatch<T extends { title: string }> = {
  inputs: Record<Side, HTMLInputElement>;
  picks: Record<Side, T | null>;
  zone: HTMLElement;
  location: Pick<Location, 'pathname' | 'search'>;
  history: Pick<History, 'replaceState'>;
};

/**
 * Withdraws a corner's committed pick as soon as its input stops reading as that job (typing, clearing, or the
 * combobox's Escape-clear, which emits an input event), together with the matchup on screen and its ?a=&b= link.
 */
export function watchCornerEdits<T extends { title: string }>(w: CornerWatch<T>) {
  for (const side of ['a', 'b'] as Side[]) {
    w.inputs[side].addEventListener('input', () => {
      const pick = w.picks[side];
      if (!pick || committedPick(pick, w.inputs[side].value)) return;
      w.picks[side] = null;
      // The matchup on screen no longer matches the corners, so it must not stay up for sharing or come back on reload.
      w.zone.hidden = true;
      if (w.location.search) w.history.replaceState(null, '', w.location.pathname);
    });
  }
}
