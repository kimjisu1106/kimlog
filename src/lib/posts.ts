import { getCollection, type CollectionEntry } from 'astro:content';
import { isPublished, postDateStr } from './kst';

export type Post = CollectionEntry<'posts'>;

// 게시글 URL — Jekyll과 동일 encodeURI 인코딩(공백·한글·괄호·em-dash 보존).
export function postUrl(id: string): string {
  return encodeURI('/' + id + '/');
}

// URL 식별자 — permalink가 있으면 그걸로 URL을 고정(파일경로·제목과 분리), 없으면 파일경로 폴백.
// 기존 글은 permalink가 없어 id 그대로라 URL이 바이트 단위로 보존된다.
export function urlId(post: Post): string {
  return post.data.permalink ?? post.id;
}

// 링크 생성 단일 진입점 — 목록·레이아웃은 post 객체를 넘겨 이걸 쓴다.
export function postHref(post: Post): string {
  return postUrl(urlId(post));
}

// categories에 지정 값들을 모두 포함(대소문자 무시). apps/ue5 페이지의 Dev Log 필터용.
export function hasCatsCI(post: Post, ...cats: string[]): boolean {
  const lower = post.data.categories.map((c) => c.toLowerCase());
  return cats.every((c) => lower.includes(c.toLowerCase()));
}

// 모든 목록 쿼리·getStaticPaths의 단일 choke point.
// isPublished 필터가 여기 한 곳에 있어야 future:false(KST)가 페이지·목록 모두에 일관 적용된다.
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('posts');
  return all
    .filter((p) => isPublished(p.data.date))
    .sort((a, b) => postDateStr(b.data.date).localeCompare(postDateStr(a.data.date)));
}

// 목록 페이지용 필터/그룹 헬퍼 — 입력 list는 이미 getPosts()로 날짜 내림차순 정렬된 것.
export function byCategory(all: Post[], cat: string): Post[] {
  return all.filter((p) => p.data.categories.includes(cat));
}

export function byPathPrefix(all: Post[], prefix: string): Post[] {
  return all.filter((p) => p.id === prefix || p.id.startsWith(prefix + '/'));
}

// Jekyll group.name replace " ","-" downcase — devlog-list id / toggle data-list 키.
export function gid(project: string): string {
  return project.replace(/ /g, '-').toLowerCase();
}

export interface Group {
  name: string;
  project_name?: string;
  items: Post[];
}

// Jekyll group_by:"project" 재현 — 첫 등장 순서 유지(입력이 날짜 desc면 최근 프로젝트가 위).
export function groupByProject(list: Post[]): Group[] {
  const order: string[] = [];
  const map = new Map<string, Post[]>();
  for (const p of list) {
    const key = p.data.project ?? '';
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(p);
  }
  return order.map((name) => ({
    name,
    project_name: map.get(name)![0]?.data.project_name,
    items: map.get(name)!,
  }));
}

// props로 넘길 경량 링크(전체 CollectionEntry 직렬화 방지).
export interface SeriesLink {
  id: string;
  url: string;
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
    url: urlId(p),
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
      url: urlId(p),
      title: p.data.title,
      short_title: p.data.short_title,
      project_name: p.data.project_name,
      date: postDateStr(p.data.date),
    }));
}
