import { describe, expect, it } from 'vitest';
import verdictsFile from '../src/data/verdicts.json';
import { ALL_COPY, BANNED_ROAST_PHRASES, HEADLINES, NAMED_HEADLINES, ROBOT_LINES, STINGERS, WORKER_MOCKING_PHRASES, panicFor } from '../src/data/roasts';
import { CARD_SIZES, cardText } from '../src/lib/card';
import { formatJobs, formatScore, formatSignedPercent, formatUsd } from '../src/lib/format';
import { SCORE_BANDS } from '../src/lib/ledger';
import { NAME_MAX, nameFromQuery, sanitizeName } from '../src/lib/name';
import { ROBOT_EYE, ROBOT_LABELS, ROBOT_POSES, ROBOT_POSE_BY_BAND, robotSvg } from '../src/lib/robots';
import { verdictFeed } from '../src/lib/verdict-feed';
import { DISCLAIMER_SHORT, sharePath, verdictView } from '../src/lib/verdict-view';
import { SITE_DOMAIN } from '../src/lib/site';
import { VERDICTS } from '../src/lib/verdicts';
import { buildVerdictPageCards, renderVerdictPageSvg } from '../scripts/lib/verdict-cards.mjs';

const feed = verdictFeed();

describe('first-name sanitizer', () => {
  it('keeps letters, spaces, hyphens, apostrophes and periods', () => {
    expect(sanitizeName('Dave')).toBe('Dave');
    expect(sanitizeName("  Mary-Jane O’Neil  ")).toBe("Mary-Jane O'Neil");
    expect(sanitizeName('Zoë')).toBe('Zoë');
    expect(sanitizeName('J.R.')).toBe('J.R.');
  });

  it('makes XSS payloads inert text', () => {
    for (const bad of ['<img src=x onerror=alert(1)>', '<script>alert(1)</script>', '"><svg onload=alert(1)>', 'javascript:alert(1)']) {
      const out = sanitizeName(bad);
      expect(out).not.toMatch(/[<>"=():/&;]/);
      expect(out.length).toBeLessThanOrEqual(NAME_MAX);
    }
    expect(sanitizeName('<script>')).toBe('script');
    expect(sanitizeName('12345')).toBe('');
    expect(sanitizeName(null)).toBe('');
  });

  it('caps a 200-character name at NAME_MAX', () => {
    expect(sanitizeName('a'.repeat(200))).toHaveLength(NAME_MAX);
  });

  it('share links drop any name the sanitizer would have to change', () => {
    expect(nameFromQuery('Dave')).toBe('Dave');
    expect(nameFromQuery('Mary Jane')).toBe('Mary Jane');
    expect(nameFromQuery('<img src=x onerror=alert(1)>')).toBe('');
    expect(nameFromQuery('<script>')).toBe('');
    expect(nameFromQuery('a'.repeat(200))).toBe('');
    expect(nameFromQuery(null)).toBe('');
    expect(nameFromQuery('')).toBe('');
  });

  it('share paths encode the name', () => {
    expect(sharePath('telemarketers')).toBe('/v/telemarketers/');
    expect(sharePath('telemarketers', "Mary O'Neil")).toBe("/v/telemarketers/?n=Mary%20O'Neil");
  });
});

describe('verdict feed', () => {
  it('has one record per scored occupation with numbers equal to the data', () => {
    expect(feed.verdicts).toHaveLength(VERDICTS.length);
    expect(feed.verdicts).toHaveLength(784);
    for (const [i, r] of feed.verdicts.entries()) {
      const v = VERDICTS[i];
      expect([r.soc, r.slug, r.obs, r.band, r.exposure, r.projectedChangePct, r.employment, r.medianWage, r.blsCategory]).toEqual([
        v.soc, v.slug, v.obs, v.band, v.exposure, v.projectedChangePct, v.employment, v.medianWage, v.blsCategory,
      ]);
    }
  });

  it('views print only data numbers and label the composite as the Doom Score', () => {
    for (const r of feed.verdicts) {
      const view = verdictView(r, feed, 'Dave');
      expect(view.score).toBe(String(r.obs));
      expect(view.exposureLine).toContain(formatScore(r.exposure));
      expect(view.employmentLine).toContain(formatJobs(r.employment));
      expect(view.employmentLine).toContain(formatUsd(r.medianWage));
      if (r.projectedChangePct != null) expect(view.changeLine).toContain(formatSignedPercent(r.projectedChangePct));
      expect(view.fine).toContain(DISCLAIMER_SHORT);
      expect(view.who).toBe("Dave's job");
      expect(view.headline).toContain('Dave');
      expect(view.headline).not.toContain('{name}');
    }
  });
});

describe('share cards', () => {
  it('have the story and post sizes', () => {
    expect(CARD_SIZES.story).toEqual({ width: 1080, height: 1920 });
    expect(CARD_SIZES.post).toEqual({ width: 1200, height: 630 });
  });

  it('carry data text and the site URL but not the disclaimer', () => {
    for (const r of feed.verdicts.slice(0, 50)) {
      const t = cardText(verdictView(r, feed, 'Dave'));
      expect(t.score).toBe(String(r.obs));
      expect(t.scoreLabel).toBe('DOOM SCORE / 100');
      expect(t.title).toBe(r.title.toUpperCase());
      expect(t.url).toBe(SITE_DOMAIN);
      expect(Object.values(t).join(' ')).not.toContain(DISCLAIMER_SHORT);
      expect(Object.values(t).join(' ')).not.toMatch(/≠ job loss/);
    }
  });
});

describe('robot set', () => {
  it('has at least four poses, each with red eyes', () => {
    expect(ROBOT_POSES.length).toBeGreaterThanOrEqual(4);
    for (const pose of ROBOT_POSES) {
      const svg = robotSvg(pose, { id: `t-${pose}`, label: ROBOT_LABELS[pose] });
      expect(svg).toContain(`data-robot-pose="${pose}"`);
      expect(svg.match(/class="robot-eye"[^>]*fill="#e4002b"/g)).toHaveLength(2);
      expect(svg).toContain(ROBOT_EYE);
      expect(svg).toContain('role="img"');
    }
    expect(robotSvg('peeking', { id: 'x' })).toContain('aria-hidden="true"');
    for (const band of SCORE_BANDS) expect(ROBOT_POSES).toContain(ROBOT_POSE_BY_BAND[band]);
  });
});

describe('robot-uprising copy', () => {
  it('headlines, stingers and robot lines cover every band and carry no numbers', () => {
    for (const bank of [HEADLINES, NAMED_HEADLINES, STINGERS, ROBOT_LINES]) {
      for (const band of SCORE_BANDS) expect(bank.some((t) => t.band === band), band).toBe(true);
      for (const t of bank) expect(t.text, t.id).not.toMatch(/\d/);
    }
    for (const t of NAMED_HEADLINES) expect(t.text).toContain('{name}');
  });

  it('never mocks workers or claims the job is lost', () => {
    for (const t of ALL_COPY) {
      for (const re of [...BANNED_ROAST_PHRASES, ...WORKER_MOCKING_PHRASES]) expect(t.text, `${t.id} ${re}`).not.toMatch(re);
    }
  });

  it('the worker-mocking list catches what it exists for', () => {
    for (const bad of ['Puny humans', 'meatbags', 'skill issue', "You're slow", 'should have retrained', 'good riddance', 'washed-up typists', 'a bunch of has-beens']) {
      expect(WORKER_MOCKING_PHRASES.some((re) => re.test(bad)), bad).toBe(true);
    }
  });

  it('every verdict gets one deterministic panic layer', () => {
    for (const v of VERDICTS) {
      const p = panicFor(v);
      expect(panicFor(v)).toEqual(p);
      for (const s of Object.values(p)) expect(s.length).toBeGreaterThan(5);
    }
  });
});

describe('/v/ verdict-page OG cards', () => {
  const cards = buildVerdictPageCards(verdictsFile as never, panicFor);
  it('one card per scored occupation with the Doom Score, a robot, the URL and no disclaimer', () => {
    expect(cards).toHaveLength(VERDICTS.length);
    for (const c of cards.slice(0, 40)) {
      const svg = renderVerdictPageSvg(c, robotSvg(ROBOT_POSE_BY_BAND[c.band.id as 'low'], { id: `og-${c.slug}`, width: 150 }));
      expect(svg).toContain('width="1200" height="630"');
      expect(svg).toContain(`data-obs="${c.obs}"`);
      expect(svg).toContain('DOOM SCORE / 100');
      expect(svg).toContain('humanobsolescenceindex.com');
      expect(svg).toContain('data-robot-pose=');
      expect(svg).not.toContain('job loss');
      expect(svg).not.toMatch(/\d+\s*(\/\s*100)?\s*expos/i);
    }
  });
});
