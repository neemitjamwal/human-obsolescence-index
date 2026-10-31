export const SITE_NAME = 'Human Obsolescence Index';
export const SITE_TAGLINE = 'A stock exchange for human worth: occupations ranked by AI exposure and projected decline, with receipts.';
export const MUSEUM_URL = 'https://museumofextinctjobs.com';

export type NavItem = { label: string; href: string };

export const NAV_ITEMS: NavItem[] = [
  { label: 'Leaderboard', href: '/' },
  { label: 'Methodology', href: '/methodology/' },
  { label: 'Press', href: '/press/' },
  { label: 'About', href: '/about/' },
];

const normalize = (p: string) => (p.endsWith('/') ? p : `${p}/`);

export function isActive(item: NavItem, pathname: string): boolean {
  const path = normalize(pathname);
  // The leaderboard owns the home page and every occupation page it links to.
  if (item.href === '/') return path === '/' || path.startsWith('/occupations/');
  return path.startsWith(normalize(item.href));
}
