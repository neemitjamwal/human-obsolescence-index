export type MuseumPrecedent = { exhibit: string; url: string; line: string };

/** SOC code → Museum of Extinct Jobs exhibit. Filled in by the launch milestone's cross-linking work. */
export const MUSEUM_PRECEDENTS: Record<string, MuseumPrecedent> = {};
