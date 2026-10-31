import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://humanobsolescenceindex.com',
  output: 'static',
  trailingSlash: 'ignore',
  vite: { plugins: [tailwindcss()] },
});
