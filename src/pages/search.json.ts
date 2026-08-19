import type { APIContext } from 'astro';
import { getPosts, postUrl } from '../lib/posts';
import { postDateStr } from '../lib/kst';

// Pagefind fallback 인덱스. url은 Jekyll과 동일 encodeURI 인코딩.
// content는 본문 텍스트(마크다운 마크업 제거 + 공백 정규화) — fallback 부분일치 검색용.
function toText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ') // 코드블록
    .replace(/`[^`]*`/g, ' ') // 인라인 코드
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // 이미지
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 링크 → 텍스트
    .replace(/<[^>]+>/g, ' ') // 인라인 HTML
    .replace(/[#>*_~|]/g, ' ') // 마크다운 기호
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(_context: APIContext) {
  const posts = await getPosts();
  const data = posts.map((p) => ({
    title: p.data.title,
    url: postUrl(p.id),
    date: postDateStr(p.data.date),
    tags: p.data.tags,
    content: toText(p.body ?? ''),
  }));
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
