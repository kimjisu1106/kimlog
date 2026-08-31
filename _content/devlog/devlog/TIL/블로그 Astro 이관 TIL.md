---
layout: post
title: 블로그 Astro 이관 TIL
date: 2026-08-19
permalink: "2eangmfe"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: Jekyll 블로그를 Astro로 옮기며 익힌 것들 — URL을 한 글자도 안 깨뜨리는 법, frontmatter를 있는 그대로 받기, 사이트맵·피드·검색 엔드포인트, 스크립트를 언제 돌릴지, 다크 테마, CSS 우선순위 함정, 그리고 무중단 컷오버.
tags:
  - Astro
  - TypeScript
  - CSS
---
블로그를 Jekyll에서 Astro로 옮겼다. 가장 중요한 제약은 "URL을 하나도 바꾸지 않는다"였다(검색 노출·광고·외부 링크가 걸려 있어서). 그 제약을 지키며 배운 것들을 모았다.

---

## URL을 한 글자도 안 깨뜨리기

### 파일 경로가 곧 URL — slugify를 꺼야 한다

Jekyll은 글의 URL이 파일 경로 그대로였다(공백·한글·괄호·`―`까지). Astro의 Content Collections(마크다운을 데이터처럼 읽는 기능)는 `glob` 로더로 폴더를 읽는데, 기본값이 경로를 slugify(소문자화·공백/한글 제거)해서 URL을 전부 바꿔 버린다. `generateId`를 직접 지정해 경로를 그대로(verbatim) 쓰게 막았다.

```ts
const posts = defineCollection({
  loader: glob({
    base: './_content',
    pattern: ['**/*.md', '!**/draft-*.md'],
    generateId: ({ entry }) => entry.replace(/\.md$/, ''), // 경로 그대로 = URL
  }),
  schema: /* … */,
});
```

- 기본 동작이 데이터를 "정리"해 줄 때, 그 정리가 내가 원하는 것과 반대일 수 있다. 무엇을 손대는지부터 확인한다

### 트레일링 슬래시와 디렉토리 출력

Jekyll permalink는 `/글주소/`(슬래시로 끝, `index.html` 출력)였다. Astro도 같은 모양으로 맞춘다.

```js
export default defineConfig({
  trailingSlash: 'always',
  build: { format: 'directory' }, // 모든 라우트를 <경로>/index.html로
});
```

캐치올 라우트 `[...slug].astro`의 rest 파라미터(`...`)가 슬래시를 경로 구분자로 유지해, `id = "devlog/devlog/TIL/AHU vs OHU"`가 그대로 그 폴더의 `index.html`이 된다.

### sitemap·검색 인덱스는 encodeURI로 인코딩을 맞춘다

Jekyll은 sitemap·검색 JSON의 URL을 `encodeURI` 방식으로 인코딩했다(공백→`%20`, 한글·`―`는 인코딩, 괄호·슬래시는 보존). 같은 함수를 써서 산출물을 바이트 단위로 맞췄다.

```ts
export function postUrl(id: string): string {
  return encodeURI('/' + id + '/'); // encodeURIComponent가 아님 — 슬래시·괄호 보존
}
```

`encodeURIComponent`를 쓰면 슬래시까지 인코딩돼 경로가 깨진다. `encodeURI`는 경로 구분자와 괄호를 남긴다.

### XML에서는 `&`·`'`를 이스케이프

sitemap의 `<loc>`에 encodeURI가 남긴 `&`(예: "ROSÉ & Bruno Mars")가 그대로 들어가면 XML이 깨진다. encodeURI 뒤에 XML 이스케이프를 한 번 더 걸어야 한다.

```ts
function xmlEscape(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
```

- URL 인코딩과 XML 이스케이프는 다른 층위다. 둘 다 필요하고 순서가 있다

---

## frontmatter를 있는 그대로 받기

### 빈 값은 null이라 optional로는 부족하다

500개가 넘는 글의 frontmatter를 스키마로 검증하는데, `app_url:`처럼 값이 빈 필드는 YAML에서 `null`로 파싱된다. Zod의 `.optional()`은 `undefined`만 허용하고 `null`은 거부해서 빌드가 통째로 멈춘다. `.nullish()`로 null도 받고, 스칼라가 올 수 있는 리스트는 배열로 정규화하고, 예상 못 한 키에도 안 깨지게 `.passthrough()`를 뒀다.

```ts
const optStr = () => z.string().nullish().transform((v) => v ?? undefined);
const strArr = () =>
  z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(z.string()));
```

- 실데이터는 스키마 예시처럼 깔끔하지 않다. 빈 값·스칼라·오탈자 키까지 견디게 짠다

### future:false를 KST로 재현 — toISOString 금지

Jekyll은 `future: false` + `timezone: Asia/Seoul`이라 미래 날짜(KST) 글이 그날이 지나야 노출됐다. Astro에서 같은 판정을 하는데, `toISOString()`은 UTC라 KST 자정 근처에서 날짜가 하루 밀린다. 빌드 머신 시간대와 무관하게 KST를 뽑으려면 `Intl`을 쓴다.

```ts
export function todayKSTStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()); // 'YYYY-MM-DD'
}
```

`en-CA` 로케일이 `YYYY-MM-DD` 형식을 준다. 이 필터를 `getPosts()` 한 곳에만 둬서, 페이지 생성·목록 쿼리 전부에 일관 적용되게 했다.

---

## 사이트맵·피드·검색 엔드포인트

### sitemap은 직접 만든다 — 파일명이 바뀌면 안 되니까

`@astrojs/sitemap`은 `sitemap-index.xml`을 만드는데, 기존 `robots.txt`와 검색엔진이 이미 `/sitemap.xml`을 참조하고 있어 파일명이 바뀌면 안 됐다. `.ts` 엔드포인트로 `/sitemap.xml`을 직접 찍었다. 피드(`/feed.xml`)는 `@astrojs/rss`로, 검색용 `search.json`·`tags.json`도 `.ts` 엔드포인트로.

```ts
// src/pages/sitemap.xml.ts — 요청이 아니라 빌드 때 파일로 뽑힘
export async function GET() {
  const body = /* <urlset> … </urlset> */;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
```

- 라이브러리가 편하지만 산출물의 파일명·형식이 계약(외부가 참조)일 땐 직접 만드는 게 안전하다

### 검색은 Pagefind + 폴백

빌드 커맨드에 Pagefind(정적 사이트 검색 색인기)를 붙였다. 게시글 레이아웃에 색인 대상을 알려주는 속성을 달아 준다.

```text
npm run build = astro build && pagefind --site dist
```

```html
<article data-pagefind-body>
  <time data-pagefind-meta="date">…</time>
  <div data-pagefind-ignore>…광고·시리즈 카드…</div>
</article>
```

Pagefind 인덱스가 없는 환경을 위해 `search.json`을 부르는 폴백도 남겼다.

---

## 스크립트를 언제 어디서 돌릴까

### 런타임 동적 import는 is:inline으로 감싼다

검색 페이지는 `import('/pagefind/pagefind.js')`처럼 빌드 산출물을 런타임에 불러온다. 그냥 두면 번들러(Vite)가 빌드 때 그 경로를 해석하려다 실패한다. `is:inline`을 붙이면 스크립트를 손대지 않고 그대로 내보내, 브라우저가 런타임에 import한다.

```astro
<script type="module" is:inline>
  const pagefind = await import('/pagefind/pagefind.js');
</script>
```

### 빌드 데이터를 클라이언트로 넘기기 — define:vars

잔디 그래프는 방문자 시계 기준으로 그려야 해서(원본과 동일하게) 클라이언트에서 돈다. 빌드 때 계산한 날짜 배열을 `define:vars`로 스크립트에 주입한다.

```astro
<script define:vars={{ postDates, graphId }}>
  // postDates가 이 스크립트 안에서 실제 값으로 박힘
</script>
```

- "빌드 때 vs 브라우저에서" 어디서 돌릴지가 선택지다. 원본의 동작(방문자 시계 기준)을 지키려 일부러 클라이언트로 뒀다

---

## 정적 자원과 폰트

### 원본 폴더를 그대로 쓰되 빌드 전에 복사

이미지·정적 앱은 예전 위치(`assets/`, `apps/`)에 그대로 두고, 빌드 전에 Astro의 `public/`으로 복사하는 스크립트를 npm 훅으로 걸었다. 작성자(Obsidian) 입장에선 아무것도 안 바뀐다.

```json
{ "scripts": { "prebuild": "node scripts/copy-static.mjs", "predev": "node scripts/copy-static.mjs" } }
```

`prebuild`/`predev`는 각각 `build`/`dev` 앞에 npm이 자동 실행한다. 복사는 `fs.cp`(Node 내장)로.

### 폰트는 외부 CDN 없이 자체 호스팅

영문 Archivo·한글 Noto Sans KR을 `@font-face`로 직접 물렸다(woff2를 `public/assets/fonts/`에서 서빙). 외부 폰트 CDN을 안 쓰는 원칙을 이관 후에도 유지.

---

## 다크 테마

### 라이트 기본 + OS 따라감 + 사용자 토글

색을 전부 CSS 변수(토큰)로 두고, 라이트를 기본에 정의한 뒤 다크만 두 경로로 오버라이드했다 — OS가 다크면 자동(`prefers-color-scheme`), 사용자가 누른 선택은 `data-theme`으로.

```css
:root { --bg:#fbfcfb; /* 라이트 */ }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg:#0d0f13; /* OS 다크, 단 사용자가 라이트 강제면 제외 */ }
}
:root[data-theme="dark"] { --bg:#0d0f13; /* 토글이 항상 이김 */ }
```

`:not([data-theme="light"])` 가드가 있어야 "OS는 다크지만 나는 라이트로 볼래"가 지켜진다.

### 깜빡임(FOUC) 방지

저장된 테마 선택을 `body` 렌더 전에 적용해야 첫 화면이 안 깜빡인다. head에 인라인 스크립트를 둬서 localStorage 값을 먼저 읽어 `data-theme`을 세팅한다.

```html
<script is:inline>
  var t = localStorage.getItem('theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
</script>
```

---

## CSS 우선순위에 물린 이야기

### 규칙이 안 먹으면 우선순위부터 센다

잔디 그래프 바로 밑 여백을 손보려고 `.til-graph + h2 { margin-top: … }`를 넣었는데 안 먹었다. 원인은 우선순위 — `.page-content > .wrapper > h2`(클래스 2 + 요소 1)가 `.til-graph + h2`(클래스 1 + 요소 1)를 이기고 있었다. 셀렉터를 더 구체적으로 올려 해결했다.

```css
/* 안 먹던 것: .til-graph + h2 { … } */
.page-content > .wrapper > .til-graph + h2 { margin-top: 0; } /* 우선순위를 올림 */
```

- 스타일이 안 먹으면 오타보다 우선순위를 먼저 의심한다. 클래스 개수를 세면 답이 나온다

### 인접 형제(+)는 진짜 옆에 있어야 한다

`.til-graph + h2`가 애초에 매칭되려면 h2가 그래프 div의 바로 다음 형제여야 하는데, 사이에 `<script>`가 끼어 있었다. 스크립트를 그래프 div 안으로 옮겨 h2를 인접 형제로 만들었다(스크립트는 `display:none`이라 레이아웃에 영향 없음).

---

## 이관 전략과 무중단 컷오버

### 새 저장소가 아니라 기존 위에 얹기(in-place)

새 repo로 옮기는 대신, 기존 저장소에 Astro를 Jekyll과 나란히 뒀다. 이유는 롤백·URL 보존 — 콘텐츠(작성 흐름)가 그대로고, 컷오버가 "빌드 방법만 바꾸기"라 도메인·주소가 안 변한다.

### 컷오버 = 빌드 커맨드 교체, 도메인은 그대로

호스팅(Cloudflare Pages)에서 빌드 커맨드와 출력 폴더 두 값만 바꾸면 같은 주소로 Astro가 뜬다. 문제 시 두 값을 원복하면 즉시 원래대로 — Jekyll 파일을 당분간 남겨 두는 게 안전망이다.

```bash
# 전: bundle exec jekyll build && npx pagefind --site _site  (출력 _site)
# 후: npm run build                                          (출력 dist)
```

### 빌드 환경은 로컬과 다르다 — Node 고정 + 스테이징

빌드 도구(Astro)가 요구하는 Node 버전을 `.nvmrc`로 고정했다(CI 기본이 낮으면 빌드 실패). 그리고 바로 라이브를 바꾸지 않고, 같은 저장소로 별도 스테이징을 배포해 실제 CI 빌드·URL·검색·이미지를 먼저 검증했다.

### 옮긴 게 같은지는 URL 집합을 비교한다

이관이 잘 됐는지는 "새 산출물의 URL 집합 = 옛 산출물의 URL 집합"으로 확인했다. 양쪽을 빌드해 `index.html` 경로 목록을 뽑아 대칭차가 0인지 봤다.

```bash
find dist -name index.html | sed 's|/index.html$||' | sort > new
find _site -name index.html | sed 's|/index.html$||' | sort > old
comm -3 old new   # 아무것도 안 나오면 완전일치
```

- "됐겠지"가 아니라 기계로 대조한다. URL 하나가 어긋나도 눈으로는 놓친다

---

## 중복을 덜어내기

같은 URL 인코딩 한 줄이 아홉 군데 복붙돼 있었고, 카테고리를 소문자로 맞춰 비교하는 코드가 두 페이지에 겹쳐 있었다. 각각 헬퍼 하나로 모았다(`postUrl`, `hasCatsCI`).

- 같은 로직이 세 곳을 넘으면 함수로 뺀다. 나중에 인코딩 규칙 하나만 바꿔도 전부 따라온다

---

## 요약

- URL 보존이 최우선이면 "기본 동작이 경로를 바꾸는지"부터 확인한다 — Content Collections는 경로를 slugify하므로 `generateId`로 막고, `trailingSlash/directory`로 permalink 모양을 맞춘다
- URL 인코딩은 `encodeURI`(슬래시·괄호 보존), XML엔 이스케이프를 한 겹 더. 둘은 다른 층위다
- 실데이터 frontmatter는 빈 값(null)·스칼라·잉여 키까지 견디게. KST 판정은 `toISOString` 대신 `Intl`
- 산출물 파일명이 외부 계약이면(`/sitemap.xml`) 라이브러리 대신 직접 엔드포인트로 찍는다
- 런타임 동적 import는 `is:inline`, 빌드 데이터 주입은 `define:vars`. "빌드 때냐 브라우저냐"가 선택지다
- 다크는 토큰 + `prefers-color-scheme` + `data-theme` 가드 + FOUC 방지 인라인 스크립트
- 스타일이 안 먹으면 우선순위(클래스 개수)를 센다. 인접 형제(+)는 사이에 다른 요소가 없어야 한다
- 큰 이관은 in-place로 나란히 두고, 스테이징에서 실제 CI 빌드를 검증한 뒤, 빌드 커맨드만 바꿔 무중단 컷오버 — 옮긴 게 같은지는 URL 집합을 기계로 대조한다
