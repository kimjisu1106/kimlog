import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, postDateStr } from './kst';

export type Post = CollectionEntry<'posts'>;

// 모든 목록 쿼리·getStaticPaths의 단일 choke point.
// isPublished 필터가 여기 한 곳에 있어야 future:false(KST)가 페이지·목록 모두에 일관 적용된다.
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts');
  return all
    .filter((p) => isPublished(p.data.date))
    .sort((a, b) => postDateStr(b.data.date).localeCompare(postDateStr(a.data.date)));
}

// props로 넘길 경량 링크(전체 CollectionEntry 직렬화 방지).
export interface SeriesLink {
  id: string;
  title: string;
  short_title?: string;
  project_name?: string;
  date: string;
  current?: boolean;
}

// 같은 project 시리즈 — summary 먼저, 그다음 날짜 오름차순(Jekyll sort:"date"). index는 1-based.
export function seriesFor(post: Post, all: Post[]): { items: SeriesLink[]; index: number; total: number } {
  if (!post.data.project) return { items: [], index: 0, total: 0 };
  const same = all
    .filter((p) => p.data.project === post.data.project)
    .sort((a, b) => postDateStr(a.data.date).localeCompare(postDateStr(b.data.date)));
  const summary = same.filter((p) => p.data.categories.includes('summary'));
  const rest = same.filter((p) => !p.data.categories.includes('summary'));
  const ordered = [...summary, ...rest];
  const items: SeriesLink[] = ordered.map((p) => ({
    id: p.id,
    title: p.data.title,
    short_title: p.data.short_title,
    date: postDateStr(p.data.date),
    current: p.id === post.id,
  }));
  const index = items.findIndex((p) => p.current) + 1;
  return { items, index, total: items.length };
}

// 추천글 — 현재 글의 첫 비-(log/summary/today-i-learn) 카테고리를 공유하는 타 project summary, 최신순 4개.
export function suggestedFor(post: Post, all: Post[]): SeriesLink[] {
  const cat = post.data.categories.find(
    (c) => c !== 'log' && c !== 'summary' && c !== 'today-i-learn',
  );
  if (!cat) return [];
  return all
    .filter(
      (p) =>
        p.data.categories.includes(cat) &&
        p.data.categories.includes('summary') &&
        p.data.project !== post.data.project,
    )
    .sort((a, b) => postDateStr(b.data.date).localeCompare(postDateStr(a.data.date)))
    .slice(0, 4)
    .map((p) => ({
      id: p.id,
      title: p.data.title,
      short_title: p.data.short_title,
      project_name: p.data.project_name,
      date: postDateStr(p.data.date),
    }));
}
