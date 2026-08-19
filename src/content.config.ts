import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 빈 frontmatter 값(예: `app_url:`)은 YAML에서 null로 파싱된다.
// .optional()은 undefined만 허용하고 null은 거부하므로, 선택 문자열은 null→undefined로 흡수한다.
const optStr = () => z.string().nullish().transform((v) => v ?? undefined);
// 리스트 필드는 null(빈 값)·스칼라 문자열도 배열로 정규화(Liquid contains 재현을 위해 항상 배열).
const strArr = () =>
  z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(z.string()));

// 게시글 — Obsidian 볼트의 _content 마크다운을 그대로 읽는다.
// generateId를 반드시 override: 기본 loader는 경로를 slugify(소문자화·공백/한글 제거)해
// URL을 전부 깨뜨린다. verbatim 상대경로(확장자 제거)가 곧 Jekyll permalink :path.
const posts = defineCollection({
  loader: glob({
    base: './_content',
    pattern: ['**/*.md', '!**/draft-*.md'], // Jekyll exclude(**/draft-*.md)와 동일
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  schema: z
    .object({
      layout: z.string().nullish().transform((v) => v ?? 'post'),
      title: z.string(),
      date: z.coerce.date(),
      categories: strArr(),
      project: optStr(),
      project_name: optStr(),
      description: optStr(),
      status: optStr(),
      video_id: optStr(),
      app_url: optStr(),
      short_title: optStr(),
      tags: strArr(),
    })
    .passthrough(), // 스트레이 키에 552개 빌드가 깨지지 않게
});

// 리뷰 — /reviews/ 집계용. 개별 라우트 없음.
const reviews = defineCollection({
  loader: glob({ base: './_reviews', pattern: '**/*.md' }),
  schema: z
    .object({
      date: z.coerce.date().optional(),
    })
    .passthrough(),
});

export const collections = { posts, reviews };
