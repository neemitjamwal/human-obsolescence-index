/** Production origin of the Museum of Extinct Jobs. Every historical-precedent link is built from it. */
export const MUSEUM_BASE_URL = 'https://museumofextinctjobs.com';

/** A museum exhibit; name matches the museum's src/data/exhibits.ts, context restates facts from its plaque. */
export type MuseumExhibit = { slug: string; name: string; headline: string; context: string };

export type MuseumPrecedent = { exhibit: MuseumExhibit; why: string };

const SWITCHBOARD: MuseumExhibit = {
  slug: 'switchboard-operator',
  name: 'Switchboard operator',
  headline: 'The Switchboard Operator',
  context:
    'Switchboard operators plugged cords into jacks by hand to connect every call; in 1950 the US still employed about 342,000 of them. Automated switching and direct-distance dialing, from the early 1950s, taught the network to connect itself.',
};

const HUMAN_COMPUTER: MuseumExhibit = {
  slug: 'human-computer',
  name: 'Human computer',
  headline: 'The Human Computer',
  context:
    'The word "computer" once meant a person who did mathematics by hand; the Nautical Almanac began employing them in 1767. From ENIAC (1945) onward, electronic computers did in minutes what a room of humans did in weeks, and kept the job title.',
};

const TELEGRAPH: MuseumExhibit = {
  slug: 'telegraph-operator',
  name: 'Telegraph operator',
  headline: 'The Telegraph Operator',
  context:
    'Telegraph operators translated the world into Morse code at 30+ words a minute. The telephone, then telex, then email took the traffic layer by layer; Western Union sent its last telegram in 2006.',
};

const TYPESETTER: MuseumExhibit = {
  slug: 'typesetter',
  name: 'Typesetter / compositor',
  headline: 'The Typesetter',
  context:
    'Typesetters assembled every printed word in metal type for 500 years, until photocomposition (1960s–70s) and then desktop publishing (from the mid-1980s) turned type into software.',
};

const LECTOR: MuseumExhibit = {
  slug: 'lector',
  name: 'Lector (cigar factory reader)',
  headline: 'The Lector',
  context:
    'Lectors were hired by cigar workers themselves to read newspapers and novels aloud all day from a platform above the factory floor. After the Ybor City strike of 1931 they were banned; radio and mechanization finished the job.',
};

/** SOC 2018 code → Museum of Extinct Jobs exhibit. Every key must be an occupation the Index publishes. */
export const MUSEUM_PRECEDENTS: Record<string, MuseumPrecedent> = {
  '43-4051': { exhibit: SWITCHBOARD, why: 'Same brief, a century apart: pick up, answer, route the caller.' },
  '43-4171': { exhibit: SWITCHBOARD, why: 'The front desk has answered and routed the calls since the operator left.' },
  '43-2011': { exhibit: SWITCHBOARD, why: 'Not a metaphor. BLS still counts the survivors of this exact trade.' },
  '43-2021': { exhibit: SWITCHBOARD, why: '"Number, please" is still an occupation on the BLS books.' },
  '15-1252': { exhibit: HUMAN_COMPUTER, why: 'Last time a machine learned to do the calculating, it took the job title too.' },
  '15-1251': { exhibit: HUMAN_COMPUTER, why: 'Last time a machine learned to do the calculating, it took the job title too.' },
  '13-2011': { exhibit: HUMAN_COMPUTER, why: 'Doing the numbers by hand was a whole profession, until it took a machine minutes.' },
  '43-3031': { exhibit: HUMAN_COMPUTER, why: 'Doing the numbers by hand was a whole profession, until it took a machine minutes.' },
  '27-3091': { exhibit: TELEGRAPH, why: 'Turning one language into another was a skilled trade, until the network did it for free.' },
  '43-9021': { exhibit: TYPESETTER, why: 'Keying words in by hand was a 500-year craft before it was a data-entry job.' },
  '43-9022': { exhibit: TYPESETTER, why: 'Keying words in by hand was a 500-year craft before it was a typing job.' },
  '43-9031': { exhibit: TYPESETTER, why: 'Desktop publishing killed the typesetter. The heir is now on this exchange.' },
  '43-6012': { exhibit: TYPESETTER, why: 'Producing documents letter by letter was skilled work, until type became software.' },
  '27-4021': { exhibit: TYPESETTER, why: 'A visual craft that software on a desk swallowed once already. The museum\'s Wing V keeps the stock-photo receipts.' },
  '27-1013': { exhibit: TYPESETTER, why: 'A visual craft that software on a desk swallowed once already. The museum\'s Wing V keeps the image-generator receipts.' },
  '23-2011': { exhibit: TYPESETTER, why: 'Producing documents letter by letter was skilled work, until type became software.' },
  '27-2011': { exhibit: LECTOR, why: 'A paid human voice, performing for a room, was replaced once already: by the radio.' },
};

export function museumExhibitUrl(exhibit: Pick<MuseumExhibit, 'slug'>): string {
  return `${MUSEUM_BASE_URL}/exhibits/${exhibit.slug}/`;
}

export function precedentHeadline(p: MuseumPrecedent): string {
  return `Historical precedent: ${p.exhibit.headline} thought so too`;
}

/** The museum publishes an obituary for every scored occupation under the same slug the Index uses for /v/<slug>/. */
export function museumObituaryUrl(slug: string): string {
  return `${MUSEUM_BASE_URL}/obituary/${slug}/`;
}

export type PrecedentLink = { url: string; label: string; exhibitSlug: string };

export function precedentLink(soc: string): PrecedentLink | null {
  const p = MUSEUM_PRECEDENTS[soc];
  return p ? { url: museumExhibitUrl(p.exhibit), label: precedentHeadline(p), exhibitSlug: p.exhibit.slug } : null;
}
