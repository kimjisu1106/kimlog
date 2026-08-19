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
