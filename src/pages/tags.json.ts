import type { APIContext } from 'astro';
import { getPosts } from '../lib/posts';
import { postDateStr } from '../lib/kst';

// 홈 태그 워드클라우드용 경량 인덱스 — date + tags만.
export async function GET(_context: APIContext) {
  const posts = await getPosts();
  const data = posts.map((p) => ({
    date: postDateStr(p.data.date),
    tags: p.data.tags,
  }));
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
