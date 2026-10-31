import type { SlangAlias } from '../lib/match.ts';

/**
 * Hand-curated everyday names for jobs that the O*NET title lists miss. Each points at the nearest SOC
 * occupation BLS actually scores, and the note says plainly when that is an approximation.
 */
export const SLANG_ALIASES: SlangAlias[] = [
  { alias: 'coder', soc: '15-1252', note: 'Everyday name for software developers.' },
  { alias: 'dev', soc: '15-1252', note: 'Everyday name for software developers.' },
  { alias: 'swe', soc: '15-1252', note: 'Short for software engineer; BLS counts them as software developers.' },
  { alias: 'software engineer', soc: '15-1252', note: 'BLS counts software engineers as software developers.' },
  { alias: 'web dev', soc: '15-1254', note: 'Everyday name for web developers.' },
  { alias: 'frontend developer', soc: '15-1254', note: 'BLS counts front-end developers as web developers.' },
  { alias: 'ux designer', soc: '15-1255', note: 'BLS counts UX and UI designers as web and digital interface designers.' },
  { alias: 'ui designer', soc: '15-1255', note: 'BLS counts UX and UI designers as web and digital interface designers.' },
  { alias: 'uber driver', soc: '53-3054', note: 'BLS has no rideshare occupation; taxi drivers is the nearest scored match.' },
  { alias: 'lyft driver', soc: '53-3054', note: 'BLS has no rideshare occupation; taxi drivers is the nearest scored match.' },
  { alias: 'rideshare driver', soc: '53-3054', note: 'BLS has no rideshare occupation; taxi drivers is the nearest scored match.' },
  { alias: 'delivery driver', soc: '53-3033', note: 'Van and small-truck delivery drivers are counted as light truck drivers.' },
  { alias: 'doordash driver', soc: '53-3033', note: 'BLS has no app-delivery occupation; light truck drivers is the nearest scored match.' },
  { alias: 'trucker', soc: '53-3032', note: 'Everyday name for heavy and tractor-trailer truck drivers.' },
  { alias: 'barista', soc: '35-3023', note: 'BLS counts baristas with fast food and counter workers.' },
  { alias: 'server', soc: '35-3031', note: 'Restaurant servers are counted as waiters and waitresses.' },
  { alias: 'influencer', soc: '13-1161', note: 'BLS has no influencer occupation; paid brand promotion is closest to marketing specialists.' },
  { alias: 'content creator', soc: '27-3043', note: 'BLS has no content-creator occupation; writers and authors is the nearest scored match.' },
  { alias: 'youtuber', soc: '27-2012', note: 'BLS has no YouTuber occupation; producers and directors is the nearest scored match.' },
  { alias: 'tiktoker', soc: '13-1161', note: 'BLS has no influencer occupation; paid brand promotion is closest to marketing specialists.' },
  { alias: 'social media manager', soc: '13-1161', note: 'Social media marketing roles are closest to marketing specialists.' },
  { alias: 'cop', soc: '33-3051', note: 'Everyday name for police and sheriff’s patrol officers.' },
  { alias: 'doctor', soc: '29-1215', note: 'BLS splits physicians by specialty; family medicine physicians is the general-practice match.' },
  { alias: 'gp', soc: '29-1215', note: 'General practitioners are counted as family medicine physicians.' },
  { alias: 'nurse', soc: '29-1141', note: 'Most people who say “nurse” mean registered nurses.' },
  { alias: 'rn', soc: '29-1141', note: 'Short for registered nurse.' },
  { alias: 'call center agent', soc: '43-4051', note: 'Call-center agents are counted as customer service representatives.' },
  { alias: 'hr', soc: '13-1071', note: 'Short for human resources; BLS counts most HR staff as human resources specialists.' },
  { alias: 'warehouse worker', soc: '53-7062', note: 'Warehouse pickers and packers are counted as hand laborers and material movers.' },
  { alias: 'handyman', soc: '49-9071', note: 'BLS counts handymen as general maintenance and repair workers.' },
  { alias: 'realtor', soc: '41-9022', note: 'Realtor is a trademark of the National Association of Realtors; BLS counts real estate sales agents.' },
  { alias: 'teacher', soc: '25-2021', note: 'BLS splits teachers by grade and subject; elementary school teachers is the largest group. Try "high school teacher" or "professor" for others.' },
  { alias: 'nanny', soc: '39-9011', note: 'Nannies are counted as childcare workers.' },
  { alias: 'office worker', soc: '43-9061', note: 'Nearest scored match is general office clerks.' },
  { alias: 'retail worker', soc: '41-2031', note: 'Shop-floor retail staff are counted as retail salespersons.' },
  { alias: 'medical coder', soc: '29-2072', note: 'Medical coders are counted as medical records specialists.' },
];
