// After `vite build`: write dist/en/index.html and dist/fr/index.html, copies of
// the Turkish page with the head (lang, title, description, social tags) in
// their own language. Netlify serves these files before the SPA fallback.
import fs from 'node:fs';
import path from 'node:path';
import { HEAD, SITE } from '../src/i18n/head.js';

const dist = path.resolve('dist');
const src = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const swap = (html, re, value, label) => {
  if (!re.test(html)) throw new Error(`lang-pages: ${label} not found in dist/index.html`);
  return html.replace(re, value);
};

for (const lang of ['en', 'fr']) {
  const h = HEAD[lang];
  let html = src;
  html = swap(html, /<html lang="tr">/, `<html lang="${lang}">`, 'html lang');
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(h.title)}</title>`, 'title');
  html = swap(html, /(<meta name="description" content=")[^"]*(")/, `$1${esc(h.description)}$2`, 'description');
  html = swap(html, /(<meta property="og:title" content=")[^"]*(")/, `$1${esc(h.ogTitle)}$2`, 'og:title');
  html = swap(html, /(<meta property="og:description" content=")[^"]*(")/, `$1${esc(h.ogDescription)}$2`, 'og:description');
  html = swap(html, /(<meta property="og:url" content=")[^"]*(")/, `$1${SITE}${h.path}$2`, 'og:url');
  html = swap(html, /(<meta property="og:locale" content=")[^"]*(")/, `$1${h.ogLocale}$2`, 'og:locale');
  html = swap(html, /(<link rel="canonical" href=")[^"]*(")/, `$1${SITE}${h.path}$2`, 'canonical');
  // A relative build (base './') points one folder up from /en/ and /fr/.
  html = html.replace(/(src|href)="\.\//g, '$1="../');
  fs.mkdirSync(path.join(dist, lang), { recursive: true });
  fs.writeFileSync(path.join(dist, lang, 'index.html'), html);
  console.log(`lang-pages: dist/${lang}/index.html`);
}
