/**
 * "Who's safer?" battle data: the curated static matchups (each gets /vs/<a>-vs-<b>/ and its own OG card) and the
 * number-free copy the battle reveal prints. Every score and projection on a battle surface comes from verdicts.json;
 * nothing here carries a number.
 *
 * This module has no runtime imports so the Node build scripts (OG cards) can load it with type stripping.
 */

/** [red corner, blue corner] verdict slugs. The first three are the launch examples. */
export const BATTLE_PAIRS: [string, string][] = [
  ['lawyers', 'plumbers-pipefitters-and-steamfitters'],
  ['software-developers', 'electricians'],
  ['accountants-and-auditors', 'registered-nurses'],
  ['telemarketers', 'plumbers-pipefitters-and-steamfitters'],
  ['computer-programmers', 'carpenters'],
  ['customer-service-representatives', 'hairdressers-hairstylists-and-cosmetologists'],
  ['data-entry-keyers', 'dental-hygienists'],
  ['news-analysts-reporters-and-journalists', 'firefighters'],
  ['writers-and-authors', 'chefs-and-head-cooks'],
  ['graphic-designers', 'photographers'],
  ['web-developers', 'roofers'],
  ['cashiers', 'waiters-and-waitresses'],
  ['bookkeeping-accounting-and-auditing-clerks', 'accountants-and-auditors'],
  ['paralegals-and-legal-assistants', 'lawyers'],
  ['data-scientists', 'mathematicians'],
  ['editors', 'writers-and-authors'],
  ['tellers', 'loan-officers'],
  ['secretaries-and-administrative-assistants-except-legal-medical-and-executive', 'medical-assistants'],
  ['interpreters-and-translators', 'tutors'],
  ['retail-salespersons', 'stockers-and-order-fillers'],
  ['real-estate-sales-agents', 'construction-laborers'],
  ['financial-and-investment-analysts', 'personal-financial-advisors'],
  ['pharmacists', 'pharmacy-technicians'],
  ['elementary-school-teachers-except-special-education', 'childcare-workers'],
  ['chief-executives', 'janitors-and-cleaners-except-maids-and-housekeeping-cleaners'],
  ['heavy-and-tractor-trailer-truck-drivers', 'taxi-drivers'],
  ['airline-pilots-copilots-and-flight-engineers', 'flight-attendants'],
  ['police-and-sheriff-s-patrol-officers', 'security-guards'],
  ['marketing-managers', 'public-relations-specialists'],
  ['human-resources-specialists', 'management-analysts'],
  ['information-security-analysts', 'computer-user-support-specialists'],
  ['architects-except-landscape-and-naval', 'civil-engineers'],
  ['family-medicine-physicians', 'nurse-practitioners'],
  ['bartenders', 'fast-food-and-counter-workers'],
  ['receptionists-and-information-clerks', 'massage-therapists'],
  ['insurance-sales-agents', 'automotive-service-technicians-and-mechanics'],
  ['market-research-analysts-and-marketing-specialists', 'actors'],
  ['musicians-and-singers', 'athletes-and-sports-competitors'],
  ['travel-agents', 'tour-and-travel-guides'],
  ['proofreaders-and-copy-markers', 'welders-cutters-solderers-and-brazers'],
];

/** The matchup the front-page teaser shows. */
export const FEATURED_BATTLE: [string, string] = ['telemarketers', 'plumbers-pipefitters-and-steamfitters'];

export type BattleLine = { id: string; text: string };

/** Scrawled under a decided fight. The robots are the villains; neither job is mocked. */
export const BATTLE_QUIPS: BattleLine[] = [
  { id: 'q-softer-target', text: 'The robots checked both task lists and went for the softer target.' },
  { id: 'q-one-name', text: 'The referee robot has already written one name on the pink slip.' },
  { id: 'q-snack', text: 'One of these task lists looks like a snack to a chatbot.' },
  { id: 'q-clipboard', text: 'The machines brought one clipboard. They know exactly whose desk it is for.' },
  { id: 'q-ringside', text: 'Ringside, a server rack is placing bets. It already knows the result.' },
  { id: 'q-hands', text: "The robots tried both jobs. One of them kept asking for hands they don't have." },
  { id: 'q-surveillance', text: 'Surveillance report: the robots spent more time watching one corner than the other.' },
  { id: 'q-rematch', text: 'No rematch clause. The machines are already circling the next fight.' },
];

/** Scrawled under a dead heat. */
export const TIE_QUIPS: BattleLine[] = [
  { id: 't-cant-decide', text: "Dead heat. The referee robot is holding the pink slip and can't decide." },
  { id: 't-both-watched', text: 'Too close to call. The robots are watching both corners, equally hungry.' },
];

/** What the referee robot says over the ring. {job} is the occupation title, filled as plain text. */
export const REFEREE_WIN = 'The pink slip goes to: {job}.';
export const REFEREE_TIE = 'Same Doom Score. The pink slip stays in my hand.';
export const REFEREE_SAME = 'Same job in both corners. Pick a real opponent.';
