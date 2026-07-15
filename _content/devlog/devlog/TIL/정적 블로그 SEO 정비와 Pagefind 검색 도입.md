---
layout: post
title: 정적 블로그 SEO 정비와 Pagefind 검색 도입
date: 2026-07-08
description: "중복 제목·description·robots.txt·og:image 같은 SEO 기본기부터 Liquid 파일 존재 검사, Pagefind 인덱스 분할 검색, 접근성·운영 팁까지 블로그 개선 라운드에서 배운 것들."
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Jekyll
  - Liquid
  - JavaScript
  - CSS
  - SEO
---
1블로그 개선 라운드에서 나온 것들. 검색엔진이 내 블로그를 어떻게 읽는지(제목·description·robots·og:image), Liquid로 파일 존재를 검사하는 꼼수, 정적 사이트 검색 Pagefind의 원리, 그리고 96개 파일을 한 번에 고치는 스크립트까지.

---

## SEO / 메타

### 같은 제목이 96개면 검색엔진엔 중복 문서다

daily-log 96개가 전부 `title: 오늘 해낸 것`이었다. 검색엔진은 제목을 문서 식별의 핵심 신호로 쓰기 때문에, 같은 제목이 수십 개면 중복 콘텐츠처럼 취급하고 어떤 걸 보여줄지 혼란스러워한다. 검색 결과에서도 사용자가 구분할 수 없다. 제목에 날짜를 붙여 고유하게 만들었다.

```yaml
# ❌ 96개가 전부 같은 제목
title: 오늘 해낸 것

# ✅ 날짜 접미사로 고유하게
title: 오늘 해낸 것 (2026-07-08)
```

---

### 페이지 제목과 목록 표시명 분리 — short_title + default 필터

제목에 날짜를 붙이니 목록에서 문제가 생겼다. 목록은 이미 날짜를 따로 표시하고 있어서 "2026-07-08 ｜ 오늘 해낸 것 (2026-07-08)"처럼 이중이 된다. 표시용 필드를 따로 두고, Liquid의 `default` 필터로 없으면 title에 fallback시켰다. 이러면 short_title이 있는 포스트만 짧게 나오고 나머지는 그대로다.

```yaml
title: 오늘 해낸 것 (2026-07-08)   # 페이지 h1, 브라우저 탭, 검색 결과
short_title: 오늘 해낸 것          # 목록 표시용
```

{% raw %}
```liquid
<a href="{{ post.url | relative_url }}">{{ post.short_title | default: post.title }}</a>
```
{% endraw %}

---

### description 메타태그는 fallback 체인으로 채워진다

jekyll-seo-tag는 `page.description` → 첫 문단(excerpt) → `site.description` 순으로 meta description을 채운다. 문제는 devlog처럼 본문이 `## 오늘 한 일` 헤딩으로 시작하면 자동 추출된 스니펫 품질이 형편없다는 것. 검색 결과와 SNS 공유에 그대로 노출되는 문장이라, 새 포스트엔 1문장 description을 직접 쓰기로 했다.

```yaml
description: "중복 제목·robots.txt·og:image 같은 SEO 기본기 정리."
```

---

### robots.txt로 sitemap 위치 알리기

jekyll-sitemap이 sitemap.xml을 만들어줘도, 검색엔진이 그 존재를 모르면 소용이 줄어든다. robots.txt에 위치를 명시하면 크롤러가 사이트맵을 바로 찾는다. 파일 하나, 세 줄이면 끝.

```
User-agent: *
Allow: /

Sitemap: https://kimlog.pages.dev/sitemap.xml
```

---

### og:image — 링크 공유 카드의 이미지

카톡·디스코드·트위터에 링크를 붙이면 뜨는 미리보기 카드 이미지가 `og:image` 메타태그다. 전 페이지가 프로필 이미지 하나로 고정돼 있었는데, 앱 포스트는 이미 프로젝트 썸네일이 있으니 그걸 쓰도록 분기했다. 같은 글이라도 카드에 앱 스크린샷이 뜨면 클릭할 이유가 하나 더 생긴다.

```html
<meta property="og:image" content="https://.../assets/images/simple-metronome.png" />
```

---

### html lang을 en으로 두면 생기는 일

Minima는 `site.lang`이 없으면 `<html lang="en">`으로 내보낸다. 한국어 블로그가 영어 사이트로 선언돼 있던 셈. lang은 검색엔진의 언어 판별, 스크린리더의 발음 엔진 선택, Pagefind 같은 도구의 언어별 인덱싱에 두루 쓰이는 신호라 맞춰주는 게 맞다. `_config.yml`에 한 줄이면 된다.

```yaml
lang: ko
```

---

## Liquid / Jekyll

### Liquid에서 "파일이 존재하나?" 검사 — static_files 필터

Liquid에는 파일 존재를 확인하는 함수가 없다. 대신 Jekyll이 모든 정적 파일 목록을 `site.static_files`로 들고 있어서, 이걸 경로로 필터링하면 존재 검사가 된다. 앞의 og:image 분기(썸네일 있으면 그걸, 없으면 기본 이미지)를 이걸로 구현한다.

{% raw %}
```liquid
{% capture _og_path %}/assets/images/{{ page.project }}.png{% endcapture %}
{% assign _og_file = site.static_files | where: "path", _og_path | first %}
<meta property="og:image" content="{{ _og_file.path | default: '/assets/images/profile.png' | absolute_url }}" />
```
{% endraw %}

파일이 없으면 `where` 결과가 비고 `first`가 nil이 되어 `default` 필터가 fallback을 채운다. 경로 문자열은 `capture` 블록으로 조립했다 — 변수를 끼워 넣은 문자열을 만들 때 쓰는 방법으로, 블록 안에 렌더링된 결과가 통째로 변수에 담긴다.

---

### 검색 인덱스와 태그 인덱스 분리 — 필요한 데이터만 내려주기

홈 워드클라우드가 태그와 날짜만 필요한데, 전체 포스트 본문이 담긴 search.json(636KB)을 통째로 받고 있었다. 같은 Liquid 템플릿 방식으로 태그·날짜만 담은 tags.json을 따로 만드니 20KB — 97% 절감. 빌드 타임에 JSON을 생성하는 페이지는 용도별로 쪼개야 저렴하다.

{% raw %}
```liquid
---
layout: none
---
[{% for post in site.content %}{"date":{{ post.date | date: "%Y-%m-%d" | jsonify }},"tags":{{ post.tags | jsonify }}}{% unless forloop.last %},{% endunless %}{% endfor %}]
```
{% endraw %}

---

### 조건부 include는 설정이 없으면 죽은 코드다

head.html에 GA 스니펫이 있어서 "분석 도구 3중 설치"인 줄 알았는데, 조건을 보니 `site.google_analytics`가 `_config.yml`에 없어서 아예 렌더링되지 않는 코드였다. Liquid 조건부 include는 설정값 존재가 스위치라, 소스에 보인다고 다 살아있는 게 아니다. 죽었는지 확인하려면 빌드 결과(_site)를 봐야 한다.

{% raw %}
```liquid
{%- if jekyll.environment == 'production' and site.google_analytics -%}
  {%- include google-analytics.html -%}   <!-- 설정이 없으면 여기 도달 안 함 -->
{%- endif -%}
```
{% endraw %}

---

## Pagefind

### Pagefind — 인덱스를 조각으로 쪼개는 정적 검색

기존 검색은 전 포스트 본문이 담긴 JSON 하나를 통째로 받아 브라우저에서 필터링했다. 포스트가 늘수록 이 파일이 커지는 구조. Pagefind는 빌드 후 HTML을 읽어 검색 인덱스를 잘게 쪼개진 조각(fragment)으로 생성하고, 검색어를 입력하면 필요한 조각만 다운로드한다. 1만 페이지 사이트도 검색당 수십 KB만 전송된다. 서버 없이 정적 호스팅 그대로 동작한다.

```bash
bundle exec jekyll build && npx pagefind --site _site
# → _site/pagefind/ 에 인덱스 생성
```

---

### 인덱싱 범위는 HTML 속성으로 선언한다 — data-pagefind-*

Pagefind는 설정 파일 대신 HTML 속성으로 스코핑한다. `data-pagefind-body`가 사이트 어딘가에 있으면 그 요소가 있는 페이지만 인덱싱된다 — 포스트 레이아웃에만 붙이니 목록 페이지가 자동 제외됐다. 본문 안의 앱 카드·시리즈 목록처럼 검색 발췌문을 오염시키는 요소는 `data-pagefind-ignore`로 빼고, 날짜 같은 부가 정보는 `data-pagefind-meta`로 뽑는다.

```html
<article data-pagefind-body>
  <time data-pagefind-meta="date">2026-07-08</time>  <!-- result.meta.date 로 나옴 -->
  <a class="app-card" data-pagefind-ignore>...</a>    <!-- 인덱스에서 제외 -->
</article>
```

---

### Pagefind JS API — debouncedSearch와 지연 로딩

UI 컴포넌트를 쓰지 않고 JS API로 기존 검색 UI에 연결했다. `debouncedSearch`는 타이핑 도중 연달아 호출해도 알아서 디바운스하고, 더 최신 입력에 추월당한 검색은 null을 반환하므로 그냥 버리면 된다. 결과 목록은 가벼운 메타만 오고, 실제 제목·발췌문은 `result.data()`를 호출할 때 그 조각만 받아온다(지연 로딩).

```js
const pagefind = await import('/pagefind/pagefind.js');
pagefind.init();

const search = await pagefind.debouncedSearch(q);
if (search === null) return; // 더 최신 입력이 있어 무효화된 검색

const items = await Promise.all(
  search.results.slice(0, 50).map(r => r.data()) // 이때 조각 다운로드
);
// items[0].meta.title, items[0].meta.date, items[0].excerpt (<mark> 하이라이트 포함)
```

---

### 동적 import + try/catch로 기능 감지 fallback

Pagefind 인덱스는 빌드 커맨드가 바뀐 뒤에야 생긴다. 그 전에도, 로컬 jekyll serve에서도 검색이 깨지면 안 된다. 동적 `import()`는 실패하면 예외를 던지므로 try/catch가 그대로 기능 감지가 된다 — 인덱스가 있으면 Pagefind, 없으면 기존 JSON 검색.

```js
let pagefind = null;
let legacyPosts = null;

try {
  pagefind = await import('/pagefind/pagefind.js');
  pagefind.init();
} catch (e) {
  legacyPosts = await fetch('/search.json').then(r => r.json());
}

function runSearch(q) {
  if (pagefind) runPagefind(q);
  else runLegacy(q);
}
```

---

### script type="module"과 top-level await

일반 `<script>` 안에서는 `await`를 함수 밖에서 못 쓴다. `type="module"`을 주면 스크립트 최상위에서 바로 await가 된다(top-level await). 위의 `await import(...)` 초기화 코드를 감싸는 async 함수 없이 평평하게 쓸 수 있었다. 모듈 스크립트는 자동으로 defer되는 것도 덤.

```html
<!-- ❌ 일반 스크립트 — SyntaxError -->
<script>const pf = await import('/pagefind/pagefind.js');</script>

<!-- ✅ 모듈 스크립트 — top-level await 허용 -->
<script type="module">const pf = await import('/pagefind/pagefind.js');</script>
```

---

## JS / CSS / 접근성

### URLSearchParams로 쿼리 파라미터 읽기

`/search/?q=Jekyll`처럼 URL로 검색어를 넘기는 기능. 예전처럼 문자열을 직접 자를 필요 없이 `URLSearchParams`가 파싱·디코딩을 다 해준다. 반대로 링크를 만들 땐 `encodeURIComponent`로 한글·특수문자를 인코딩한다.

```js
// 받는 쪽 (search.html)
const initQ = new URLSearchParams(location.search).get('q');
if (initQ) input.value = initQ;

// 보내는 쪽 (워드클라우드)
location.href = '/search/?q=' + encodeURIComponent(tag);
```

---

### 캔버스 워드클라우드에서 클릭된 단어 받기 — wordcloud2 click 콜백

캔버스는 그려진 그림일 뿐이라 단어별 클릭 이벤트가 없다. wordcloud2.js는 자기가 각 단어를 어디에 그렸는지 알고 있어서, `click` 옵션에 콜백을 주면 클릭 좌표에 있는 단어를 `item`으로 넘겨준다. `item[0]`이 단어, `item[1]`이 빈도.

```js
WordCloud(canvas, {
  list: list,
  click: function (item) {
    location.href = '/search/?q=' + encodeURIComponent(item[0]);
  },
});
```

---

### canvas는 스크린리더에 안 보인다 — role="img" + aria-label

캔버스 내용은 픽셀이라 스크린리더가 읽을 수 없다. 그냥 두면 "그래픽"이라고만 낭독된다. `role="img"`로 이미지임을 선언하고 `aria-label`로 대체 텍스트를 주면 그 문장을 대신 읽는다. 화면에는 아무 변화가 없는 접근성 전용 속성.

```html
<canvas id="tag-cloud" role="img" aria-label="최근 1년간 자주 쓴 태그 워드클라우드"></canvas>
```

---

### mark 태그의 기본 형광펜과 다크모드

Pagefind 발췌문은 검색어를 `<mark>`로 감싸서 준다. mark의 브라우저 기본 스타일은 노란 형광펜 배경인데, 다크모드에선 눈이 아프다. 배경을 지우고 굵기로 강조하면 라이트/다크 어디서든 무난하다.

```css
.search-snippet mark {
  background: transparent;
  color: inherit;
  font-weight: 700;
}
```

---

### 아이콘 몇 개에 Font Awesome 전체는 과하다 — 인라인 SVG + currentColor

footer 아이콘 3개(메일·유튜브·RSS) 때문에 Font Awesome 전체 CSS(100KB+)를 CDN에서 받고 있었다. 인라인 SVG로 바꾸면 외부 요청이 통째로 사라진다. `stroke="currentColor"`를 주면 SVG가 부모의 글자색을 따라가서 다크모드 대응도 공짜다.

```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
</svg>
```

---

### GTM, GA4, Cloudflare Insights는 역할이 다르다

- GTM(Google Tag Manager) — 분석 도구가 아니라 스크립트 관리함. 이 안에 GA4 태그를 설정해야 데이터가 쌓인다. tagmanager.google.com
- GA4(Google Analytics) — 상세 분석. 유입 검색어, 페이지별 조회수, 방문자 행동, AdSense 연동. analytics.google.com
- Cloudflare Insights — 쿠키 없는 경량 통계. 페이지뷰·방문자·Core Web Vitals. 설정 제로. Cloudflare 대시보드

GA를 GTM 안에서 관리하는 게 정석이고, head에 GA를 따로 심으면 이중 집계 위험이 있다. 도구가 여럿이면 방문자 수가 서로 다르게 나오는 게 정상이다(측정 방식이 달라서).

---

## 요약

- 검색엔진 신호(제목 고유성, description, robots.txt, og:image, lang)는 전부 "내 사이트를 어떻게 읽어달라"는 선언이다. 자동 추출에 맡기지 말고 직접 채우는 게 낫다.
- Liquid에는 파일 존재 검사가 없지만 `static_files | where` 필터링으로 우회할 수 있고, 조건부 include는 설정값이 없으면 조용히 죽은 코드가 된다.
- Pagefind는 인덱스를 조각으로 쪼개 필요한 만큼만 내려받는 정적 검색 — 범위는 `data-pagefind-*` 속성으로 선언하고, 동적 import + try/catch로 fallback을 만들면 도입 전환이 무중단이 된다.
- 일괄 수정 스크립트는 멱등하게(이미 처리된 파일은 skip), 실패를 감지할 수 있게(치환 횟수 검증) 짠다.
