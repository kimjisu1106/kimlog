import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, urlId } from '../lib/posts';

// jekyll-feed의 /feed.xml 대체. 최신순, 최근 20건(피드는 경량 유지).
export async function GET(context: APIContext) {
  const posts = (await getPosts()).slice(0, 20);
  return rss({
    title: '김로그의 우당탕탕',
    description: 'KIMLOG―Need, Learn and Build',
    site: context.site ?? 'https://kimlog.pages.dev',
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      description: p.data.description ?? '',
      link: `/${urlId(p)}/`,
    })),
  });
}
