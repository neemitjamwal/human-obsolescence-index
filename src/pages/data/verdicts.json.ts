import type { APIRoute } from 'astro';
import { verdictFeed } from '../../lib/verdict-feed';

export const GET: APIRoute = () =>
  new Response(JSON.stringify(verdictFeed()), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
