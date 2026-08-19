import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/posts';
import { postDateStr } from '../lib/kst';

// jekyll-sitemap 대체 — 직접 엔드포인트로 /sitemap.xml 파일명 유지(@astrojs/sitemap은 sitemap-index.xml로 바뀜).
// loc 인코딩은 Jekyll과 동일하게 encodeURI(공백→%20, 한글·em-dash 인코딩, 괄호·슬래시 보존).
const SITE = 'https://kimlog.pages.dev';
const PAGES = [
  '/',
  '/devlog/',
  '/today-i-learn/',
  '/ue5/',
  '/apps/',
  '/audio/',
  '/search/',
  '/contact/',
  '/reviews/',
  '/privacy-policy/',
];
const STATIC_APPS = ['/apps/image-converter/', '/apps/pdf-compressor/', '/apps/pdf-editor/'];

// encodeURI가 남기는 &·' 등은 XML에서 이스케이프해야 유효(raw &는 XML 파싱 깨짐). Jekyll과 동일.
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET(_context: APIContext) {
  const posts = await getPosts();
  const urls: string[] = [];
  for (const u of [...PAGES, ...STATIC_APPS]) {
    urls.push(`<url>\n<loc>${xmlEscape(SITE + encodeURI(u))}</loc>\n</url>`);
  }
  for (const p of posts) {
    const loc = xmlEscape(SITE + postUrl(p.id));
    urls.push(`<url>\n<loc>${loc}</loc>\n<lastmod>${postDateStr(p.data.date)}T00:00:00+09:00</lastmod>\n</url>`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
