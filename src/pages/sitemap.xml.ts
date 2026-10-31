import type { APIRoute } from 'astro';
import { META } from '../lib/data';
import { sitemapXml } from '../lib/seo';

export const GET: APIRoute = ({ site }) =>
  new Response(sitemapXml(site!, META.dataAsOf), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
