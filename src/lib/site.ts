export const SITE_NAME = 'Human Obsolescence Index';
export const MASTHEAD = 'The Daily Doom';
export const SITE_DOMAIN = 'humanobsolescenceindex.com';
export const SITE_TAGLINE = 'The front page for human work: occupations ranked by a Doom Score built from AI exposure and projected job growth, with receipts.';

export type NavItem = { label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Front page', href: '/' },
  { label: 'Leaderboard', href: '/leaderboard/' },
  { label: "Who's safer?", href: '/vs/' },
  { label: 'Methodology', href: '/methodology/' },
  { label: 'Press', href: '/press/' },
  { label: 'About', href: '/about/' },
];

const normalize = (p: string) => (p.endsWith('/') ? p : `${p}/`);

export function isActive(item: NavItem, pathname: string): boolean {
  const path = normalize(pathname);
  if (item.href === '/') return path === '/';
  // The leaderboard owns every occupation page it links to.
  if (item.href === '/leaderboard/') return path === '/leaderboard/' || path.startsWith('/occupations/');
  return path.startsWith(normalize(item.href));
}
