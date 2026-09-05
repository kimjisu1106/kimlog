# KimLog - Astro Blog

## 작업 원칙 (Working Principles)

1. **Think Before Coding** — 코드 작성 전에 요청을 완전히 이해할 것. 모호하면 먼저 질문.
2. **Simplicity First** — 필요한 것만 구현. 추측성 기능 추가 금지. 더 나은 방향이 있으면 제안은 할 수 있음. 단, 그럴경우 사용자 comfirm 필요.
3. **Surgical Changes** — 요청된 부분만 수정. 무관한 리팩토링·포맷팅 금지.
4. **Verify Before Declare Done** — "완료"라고 말하기 전에 변경사항이 실제로 작동하는지 확인. 서버를 실행해야 알 수 있는 문제는 "서버 실행 후 확인 필요"라고 명시.
5. **No Closing Colons** — 응답 마지막에 콜론(`:`)으로 끝나는 문장 금지. "파일을 수정했습니다:" 같은 표현 → "파일을 수정했습니다."
6. **No Speculative Features** — 요청하지 않은 validation, fallback, error handling 추가 금지. 내부 코드와 프레임워크 보장은 신뢰할 것.
7. **Existing Docs Are Enough** — 이 프로젝트는 CLAUDE.md(아키텍처/URL/모델 문서)와 `memory/`(맥락 메모리)가 있음. 별도 context-notes.md나 작업별 계획 파일 생성 금지. 큰 작업에서 TodoWrite로 진행 상황 추적하는 것은 허용.
8. **Check Errors Carefully** — 에러 메시지를 끝까지 읽을 것. 빠른 추측 수정 금지 — 원인을 파악한 뒤 고칠 것. 테스트가 없으므로 서버 실행 시 오류가 없는지 수동으로 확인.
9. **Comments: Why Only** — 코드 주석은 WHY(숨겨진 제약, 미묘한 불변식, 버그 우회)만. WHAT 설명 금지. 잘 이름 붙인 식별자가 이미 설명함.
10. **End-of-Turn Summary** — 응답 끝에 무엇을 했는지 간결하게 요약할 것(학습 목적). 변경 파일·핵심 변경 내용·확인 필요 사항 순으로.
11. **CSS Consistency** — 모든 스타일은 `src/styles/global.css`에만 작성. 인라인 `<style>` 블록, `style=""` 속성 금지. 색상은 CSS 변수(토큰) 사용(`--border-color`, `--muted` 등). 다크모드는 `prefers-color-scheme` + `:root[data-theme]` 오버라이드로.
12. **Auto Commit** — 코드 CRUD(생성·수정·삭제)가 발생하면 작업 완료 후 자동으로 git commit & push. 보안 검사 통과 후 수행.
13. **TIL 작성 전 기술 포인트 확인** — TIL을 작성하기 전에 해당 작업에서 나온 포인트 목록을 빠짐없이 사용자에게 제시하고, 어떤 항목을 기록할지 직접 선택하게 할 것. "중요한 것만" 추리지 말고 사소한 것도 포함해서 전부 나열한다. Claude Code가 코드를 작성하기 때문에 사용자가 어떤 기술이 쓰였는지 모를 수 있음 — 선택 과정 자체가 학습임. **단, 골라진 항목을 TIL로 쓸 때는 구현 메커니즘이 아니라 디렉터의 takeaway(원리·트레이드오프·판단)로 풀어 쓴다** (TIL 핵심 원칙 참고).
14. **Description 필수** — 새 포스트(draft 포함)를 작성할 때 frontmatter에 `description`을 1문장으로 반드시 넣을 것. 본문 내용을 요약하며, 검색 결과 스니펫·SNS 공유 카드에 그대로 노출됨. 비우면 사이트 기본 설명(`KIMLOG―Need, Learn and Build`)으로 대체된다 — Astro는 Jekyll과 달리 첫 문단 자동 추출을 하지 않으므로 반드시 직접 작성.
15. **INBOX 확인** — 세션 시작 시 `LogStoneShop/INBOX.md`에서 블로그(kimlog) 관련 open 항목·공지를 확인한다. LogStoneShop과의 정책·URL 조율이 여기서 오간다. 그 파일만 수정하고(코드·조항 직접 수정 금지 — 요청으로 적기), pull 직후 편집·즉시 push로 충돌을 피한다. open 항목은 낸 세션이 자기 소유 질문이면 자기가 close(project→shop 요청은 shop이 close).
16. **다음에 할 일 알림장** — devlog를 게시할 때, 각 프로젝트 로그의 `다음에 할 일`을 정리해 `LogStoneShop/INBOX.md`에 알림장으로 공지한다. 각 프로젝트 세션이 "아직 안 한 항목은 자기 백로그·다음에 할 일에 기재, 이미 한 항목은 이행 여부 회신"하도록 프로젝트별로 묶어 적는다. INBOX 규칙(그 파일만 수정·pull 직후 편집·즉시 push)을 따른다.

## Project Overview

Obsidian으로 마크다운 문서를 작성 → 이 vault 폴더가 git 추적됨 → GitHub Desktop 또는 Claude Code로 commit & push → Cloudflare Pages가 빌드·배포하는 Astro 블로그. 라이브 주소는 `kimlog.pages.dev`.

> 2026-08(19~22) Jekyll(Minima)에서 Astro로 이관·컷오버 완료. URL은 1:1 보존(`_content` 파일 경로 = URL). 발행 플로우와 이미지 방식은 예전과 동일하다. Jekyll 잔재는 2026-08-22 Phase 8에서 전부 제거됨.

## Stack

- **Astro 5** — Content Collections `glob()` 로더로 `_content` 마크다운을 그대로 읽음
- **Obsidian** 으로 포스트 작성 (`_content/` 폴더)
- **Cloudflare Pages** 호스팅
- **Node** — `.nvmrc` = 20

## Git / 배포

- 의존성은 `package.json` (astro, `@astrojs/rss`, wordcloud; dev: pagefind, `@types/wordcloud`). Ruby/Gemfile 없음.
- npm 스크립트: `npm run dev`(로컬 http://localhost:4321) · `npm run build`(= `astro build && pagefind --site dist`) · `npm run preview`(빌드 결과 미리보기).
- `predev`/`prebuild`가 `scripts/copy-static.mjs`를 먼저 돌려 루트 `assets/{images,fonts}`와 정적앱 3종을 `public/`으로 복사한다(`public/assets`·`public/apps`는 gitignore — 원본은 루트).
- Cloudflare Pages 빌드 커맨드: `npm run build`, 출력 디렉토리 `dist`. Pagefind가 빌드 후 `dist/pagefind/` 검색 인덱스를 생성(미적용 시 검색 페이지는 `/search.json` fallback으로 동작).

### 인코딩 — 한글 깨짐 방지 (Windows)

이 환경은 Windows PowerShell 5.1이라 기본 인코딩이 CP949다. PowerShell로 한글이 든 인자를 native 명령에 넘기거나(`git commit -m "한글메시지"`) `Out-File`/`Set-Content`로 한글 파일을 쓰면 깨진다. 그래서 아래를 따른다.

- 한글이 든 커밋 메시지는 PowerShell `-m` 금지. Bash 도구 + here-document로 `git commit -F -` 하거나, 메시지를 UTF-8 파일로 쓴 뒤 `git commit -F <파일>`.
- 파일 생성·수정은 Write/Edit 도구 사용(UTF-8 보장). PowerShell `Out-File`/`Set-Content`로 한글 파일 쓰지 말 것.
- 한글 파일명·로그 출력이 깨져 보여도 파일이 실제로 깨진 것으로 오판하지 말 것 — 대개 표시 단계의 인코딩 문제다. 실제 파일은 Read 도구로 확인.

## Structure

```
astro.config.mjs     # site + trailingSlash:'always' + build.format:'directory' (URL 1:1 보존 핵심)
package.json         # npm 스크립트·의존성
.nvmrc               # node 20
src/
  content.config.ts  # glob 로더(verbatim generateId, draft 제외) + Zod 스키마; posts·reviews 컬렉션
  pages/
    index.astro          # 홈 (잔디 + 태그 워드클라우드 + Daily + Dev Logs + Apps + Videos)
    devlog.astro         # Dev Log 목록 (categories에 'log', 날짜순 project 그룹핑 + 더보기)
    today-i-learn.astro  # TIL 목록 (잔디 + 태그칩 필터 + project 그룹 + 더보기)
    ue5.astro apps.astro # 잔디 + Projects[summary] + Dev Log (apps는 flip 카드·finished 우선)
    audio.astro          # 오디오 (path=audio, summary works project 그룹)
    contact.astro        # Contact (이메일·YouTube·PayPal/카카오페이 후원)
    reviews.astro        # 리뷰 (reviews 컬렉션, 이름 마스킹)
    search.astro         # 검색 (Pagefind 우선, 없으면 /search.json fallback, ?q= 지원)
    privacy-policy.astro # logstone.net/kimlog/privacy/ 로 리다이렉트하는 스텁(옛 URL 유지)
    [...slug].astro      # 게시글 캐치올 라우트 (post.id = 파일경로 → URL)
    feed.xml.ts          # RSS (@astrojs/rss)
    sitemap.xml.ts       # 사이트맵 (직접 엔드포인트 — 파일명 /sitemap.xml 고정)
    search.json.ts       # 검색 인덱스(제목+본문+tags) — Pagefind fallback용
    tags.json.ts         # 경량 태그 인덱스(date+tags) — 홈 워드클라우드용
  layouts/
    Base.astro           # <html> 셸 — head(GTM·GSC·AdSense·CF beacon·favicon·OG·테마초기화) + global.css import
    Page.astro           # 목록 페이지 셸 (Header + .page-content > .wrapper + Footer)
    Post.astro           # 게시글 레이아웃 (app/video 카드, AdFit, Series, Suggested)
  components/
    Header.astro         # nav + 검색 아이콘
    Footer.astro         # contact 정보 + /contact/ 후원 링크
    ContributionGraph.astro  # GitHub 잔디 그래프 (category 파라미터 또는 전체)
  lib/
    posts.ts             # getPosts()(단일 choke point) + URL·그룹·시리즈·추천 헬퍼
    kst.ts               # KST 날짜 유틸 + future:false(isPublished)
    og.ts                # og:image 선택 ({project}.png 있으면 그거, 없으면 profile.png)
  styles/
    global.css           # 전체 커스텀 CSS (여기에만 스타일 작성) — Base.astro에서 import
scripts/
  copy-static.mjs        # 루트 assets/apps → public/ 복사 (predev/prebuild 자동)
public/
  robots.txt             # sitemap.xml 위치 안내
  assets/ apps/          # copy-static.mjs가 생성(gitignore) — 원본은 루트 assets/·apps/
_content/                # 포스트 원본 (Obsidian 볼트)
  devlog/
    apps/                # 카테고리: apps (구 tools 포함)
    devlog/              # 카테고리: log (daily-log, TIL 등)
    ue5/                 # 카테고리: ue5
  audio/
    music-cover/         # 커버 연주
    original/            # 자작곡 (예정)
_reviews/                # 리뷰 컬렉션 (개별 라우트 없음)
assets/
  images/                # profile.png (favicon·OG), {project}.png (앱 썸네일), kakaopay-qr.png
    for-posts/           # 포스트 본문 이미지 (외부 CDN 금지, 로컬 저장 필수)
  fonts/                 # 자체 호스팅 웹폰트 woff2 (Archivo 영문 + Noto Sans KR 한글)
apps/
  image-converter/ pdf-compressor/ pdf-editor/  # 정적 웹앱 (내부 app_url 대상)
.gitignore               # **/draft-*.md · node_modules · dist · .astro · public/assets · public/apps 제외
```

## Page File Convention

- 페이지·레이아웃·컴포넌트는 `.astro`, 데이터 엔드포인트는 `.ts`(`feed.xml.ts` 등)
- 게시글은 개별 파일이 아니라 `[...slug].astro` 캐치올 라우트가 `_content` 파일마다 생성 — 새 포스트는 `.astro`를 만들지 않고 `_content`에 마크다운만 추가하면 됨

## URL 1:1 보존 메커니즘 (건드리면 SEO·AdSense 깨짐)

- URL = `_content` 기준 상대경로(확장자 뺀 것) **그대로**. 폴더 구조가 URL이고 category는 URL과 무관. 공백·한글·괄호·em-dash(`―` U+2015)·이중 `devlog/devlog`·트레일링 슬래시 전부 보존해야 함.
- `astro.config.mjs`: `trailingSlash:'always'` + `build.format:'directory'`가 Jekyll `permalink: /:path/`를 재현.
- `src/content.config.ts`: `generateId: ({entry}) => entry.replace(/\.md$/,'')` — **override 필수.** 기본 loader는 경로를 slugify(소문자화·공백/한글 제거)해 URL을 다 깨뜨린다.
- 모든 내부 링크는 `postHref(post)`(`lib/posts.ts`)로 생성 — 내부적으로 `postUrl(urlId(post))` = `encodeURI('/' + (permalink ?? id) + '/')`. category·project 기반 URL 조립 금지.
- **permalink 오버라이드 (2026-08-30)**: frontmatter `permalink`이 있으면 URL을 그 값으로 고정한다(파일경로·제목과 분리). 없으면 파일경로 폴백이라 기존 글 URL은 그대로 보존된다. `urlId(post)=permalink ?? id`가 단일 기준이고 라우트 `params.slug`·`postHref`·feed·sitemap·search가 전부 이걸 쓴다. **새 글에만 붙이면 되고 기존 글엔 소급 불필요.** 목적: 파일명·번호·제목을 바꿔도 URL이 안 흔들리게(향후 CMS 대비). permalink 값은 도메인·앞뒤 슬래시·`.md` 없는 경로 문자열이며 고유해야 하고 한 번 정하면 안 바꾼다.

## Frontmatter 스키마 (`src/content.config.ts`, Zod)

Obsidian frontmatter를 있는 그대로 관용한다. `title`/`date`만 필수. 빈 값(`app_url:`)은 YAML에서 `null`이 되므로 `optStr()`(`nullish→undefined`)·`strArr()`(null·스칼라→배열)로 흡수하고, `.passthrough()`로 스트레이 키에 빌드가 안 깨지게 한다. `categories`·`tags`는 항상 배열로 정규화(`.includes()`로 쿼리 — Jekyll `contains` 재현). `reviews`는 별도 컬렉션(`_reviews`, 라우트 없음).

## CSS Rules

- **모든 스타일은 `src/styles/global.css`에만 작성** (인라인 `<style>` 블록, `style=""` 속성 금지)
- 단위는 `px` 통일
- 색상은 CSS 변수(토큰) 사용 (`--border-color`, `--btn-border`, `--muted`, `--devlog-*`, `--section-gap` 등)
- 다크모드: `@media (prefers-color-scheme: dark)` + `:root[data-theme="dark"]` 로 토큰 오버라이드. 라이트 기본, `[data-theme]` 토글이 OS 설정을 이김. FOUC 방지 초기화 스크립트는 `Base.astro` head에 있음(`localStorage.theme`)
- 잔디 밑 간격 등 섹션 여백은 `--section-gap`(44px, `hr` 여백과 통일) 하나로
- **전역 heading 크기 고정**: `h1=40px`, `h2=32px`, `h3=24px`
- `.post-content h3`: `font-weight: 600` (크기는 전역 h3에서 상속)
- `.devlog-badge`: `vertical-align: middle; position: relative; top: -3px` (✅ 이모지 수직 정렬)
- 본문 폰트: 영문 `Archivo`, 한글 `Noto Sans KR` — `public/assets/fonts/` 자체 호스팅 woff2 + `@font-face`(global.css). 외부 폰트 CDN 금지. 코드블록은 monospace

## Link Style Convention

- 모든 페이지의 포스트 링크는 `font-weight: 600` 이상

## Post List Pages (ue5.astro, apps.astro)

상단에 `<ContributionGraph category="..." />` 후 `<h2>Projects</h2>` + `<h2>Dev Log</h2>` 섹션 구조:

- Projects 섹션: `categories`에 `summary` 포함된 포스트만 표시, 링크 텍스트는 `project_name || title`
- 완료된 프로젝트는 `status: finished` → `<span class="devlog-badge">✅</span>` 표시
- 데이터는 `getPosts()` → `hasCatsCI(post, 'log', 'ue5')`(Dev Log)·`categories.includes('summary')`(Projects)로 필터

```astro
<ul class="devlog-list">
  {devlogPosts.map((post) => (
    <li>
      {postDateStr(post.data.date)} ｜ <a href={href(post.id)}>{post.data.title}</a>
      {post.data.status === 'finished' && <span class="devlog-badge">✅</span>}
    </li>
  ))}
</ul>
```

## devlog.astro 구조

- 섹션 구분 없이 `categories.includes('log')`인 전체 포스트를 `groupByProject`로 날짜순 project 그룹핑
- h3: `{cat_label} | {project_title}` (cat_label은 ue5→`Unreal Engine`, apps→`Apps`)
- 상단에 `<ContributionGraph category="log" />`

## DevLog / TIL 더보기 구조 (devlog.astro, today-i-learn.astro)

- 5개 초과 시 6번째부터 `<li hidden class="devlog-extra-item">` 처리
- 프로젝트 타이틀: `<h3 class="devlog-title">`
- 버튼: `<button class="devlog-toggle" data-list="list-{gid}">` — 테두리/배경 없는 심플 텍스트
- 바닐라 JS(`.astro`의 `<script>`)가 `hidden` attribute를 toggle함
- `.devlog-group { margin-bottom: 32px }` · `.devlog-summary { margin-bottom: 30px }`

## Contribution Graph (`src/components/ContributionGraph.astro`)

- `<ContributionGraph category="ue5" />` 형태로 호출, `category` 생략 시 전체 포스트 대상
- 52주 × 7일 그리드, 로컬 시간(KST) 기준으로 날짜 계산 (`toISOString()` 미사용)
- "오늘"은 빌드 시각 KST 기준(`todayKSTStr`) — 빌드마다 갱신
- 셀 색상: `til-cell--0`(회색) ~ `til-cell--4`(진초록), 다크모드 자동 대응

## Contact 페이지 (`contact.astro`)

- 이메일, YouTube 링크
- PayPal 버튼: 직접 링크
- 카카오페이 버튼: 모바일 → 딥링크(`qr.kakaopay.com`), 데스크탑 → QR 모달 팝업 (JS `navigator.userAgent` 판별)
- QR 이미지: `/assets/images/kakaopay-qr.png`
- footer의 후원하기 버튼 → `/contact/` 로 이동

## Post Frontmatter

```yaml
---
title: "포스트 제목"
date: 2025-01-01
categories:
  - log # log = Dev Log 목록 노출 기준 (URL은 폴더 경로가 결정, category와 무관)
  - ue5 # 섹션 카테고리 (ue5 | apps | today-i-learn)
  - summary # (선택) 해당 페이지 Projects 섹션에 노출
status: finished # (선택) finished 이면 완료 뱃지 표시
project: "프로젝트명" # 시리즈·추천글 그룹핑 기준
project_name: "표시할 이름" # (선택) project와 다른 표시명
video_id: "YouTube ID" # (선택) summary + video_id 있으면 홈 Videos에 노출
app_url: "https://..." # (선택) summary + app_url 있으면 홈 Apps 섹션 노출. 내부 경로(/apps/pdf-editor/index.html)도 가능
short_title: "짧은 제목" # (선택) 목록에서 title 대신 표시. daily-log처럼 title에 날짜가 붙는 경우 사용
permalink: "slug" # (선택) 있으면 URL을 이 값으로 고정(파일경로와 분리). 기존 글은 비워 두면 경로 폴백으로 URL 보존
description: "설명" # SEO meta description. 새 포스트는 1문장 필수 (비우면 사이트 기본 설명으로 대체 — 첫 문단 자동추출 없음)
---
```

> `layout: post` frontmatter는 이제 선택. Astro는 `[...slug].astro`가 모든 게시글에 Post 레이아웃을 적용하고 이 필드를 읽지 않는다(있어도 무해).
> draft 파일은 파일명에 `draft-` 접두사를 붙이면 `.gitignore` + 로더 pattern(`!**/draft-*.md`)에 의해 이중으로 제외됨.
> **이미 게시된 글을 수정·재작성할 때는 파일에 `draft-`를 다시 붙여 draft로 되돌린 뒤 검수·재게시한다** (라이브 게시본을 직접 고쳐 두지 말 것 — 각 세션이 자기 게시본을 고쳐도 이 흐름을 탄다). `permalink`는 그대로 둬야 URL이 보존된다.

## Post Writing Rules

### 공통 (모든 포스트)

- Bold(`**`) 사용 금지 — 강조가 필요하면 헤딩·리스트 구조로 대체
- 과장된 클리셰 표현 금지 — "지옥이다", "지옥같다" 같은 표현 쓰지 말 것. 문제 상황은 사실 그대로 서술 (예: "관리가 지옥이다" → "각각 트윈하면 관리가 번거롭다")
- 로그스톤 샵을 가리킬 때 "회사 사이트" 같은 모호한 표현 대신 "로그스톤 샵"(필요하면 logstone.net)이라고 쓴다 — 회사·조직을 뭉뚱그리지 말고 제품명을 명시
- 가족·타인의 구체적 상황은 일반화한다 — "동생이 회의실 관리자로 일한다", "가족이 수주자로 들어간다" 같은 개인 신상·직업·관계·사업 이해관계는 로그에 쓰지 않는다. 프로젝트 맥락이 필요하면 "실무자·현장·어떤 건물"처럼 일반화하고, 이해충돌·수주·가족 관계 서술은 뺀다(공개 시 당사자가 곤란해질 수 있음).
- `description` frontmatter를 1문장으로 작성 (SEO 스니펫용, 본문 내용 요약)
- 제목은 사이트 전체에서 고유하게 — daily-log는 `title: 오늘 해낸 것 (YYYY-MM-DD)` + `short_title: 오늘 해낸 것`
- 문장 끝 콜론(`:`) 금지 — "수정했습니다:" → "수정했습니다."
- 섹션 간 구분은 `---` 사용
- 코드블록에 언어 명시 필수 (` ```dart`, ` ```js` 등)

### devlog (apps / ue5)

- categories: `[log, apps]` 또는 `[log, ue5]`
- 섹션 3개 고정, 순서·이름 변경 금지: `## 오늘 한 일` → `## 막힌 부분` → `## 다음에 할 일`
- 본문 맨 위에 별도 요약/도입 문장을 두지 않는다 — 요약은 frontmatter `description`이 담당. `## 오늘 한 일` 위(frontmatter와 첫 헤딩 사이)에 요약 문장이 오면 `## 오늘 한 일` 바로 아래로 넣는다.
- 내용 없는 섹션은 섹션째 삭제
- 순수 조율 핑은 로그에 넣지 않는다 — "로그스톤 샵 회신 확인", "조항 확인 요청" 같은 상태체크·핑은 독자에게 남는 게 없다. 실제 의존성·결정·교훈이 붙은 조율만 남긴다(예: "심사가 문서를 대조하니 방침이 기능보다 먼저 올라가야 해서 요청").
- 막힌 부분은 항목의 상세도로 형식을 가른다.
  - 단순형: li 형태 — `- 문제 서술` → 하위 들여쓰기 `- 해결: …`(필요시 `- 원인:`·`- 남은 한계:` 등 추가). 한두 줄로 끝나는 항목에.
  - 상세형: `### 한 문장 제목` → 문제점/원인/해결 서술 → (코드 있으면) 코드블록 → (선택) `>` 보충 → 하위 `- 해결:` 불릿. 여러 문단으로 풀거나 코드가 필요한 항목에.
  - 코드블록은 li 안에 넣으면 렌더링이 깨지므로 코드가 있으면 반드시 ###. 코드가 없어도 서술이 길면 ### 허용한다.
- `다음에 할 일`은 직전 log에서 이어받아 누적한다. 새 log를 쓸 때 이전 log의 `다음에 할 일` 항목 중 이번에 해결되지 않은 것은 이번 log의 `다음에 할 일`에도 다시 적는다 (해결된 것만 뺀다). 그래야 미룬 일이 로그를 넘길 때마다 사라지지 않고 남는다.

### summary 포스트 (프로젝트 소개 0번 또는 완결 포스트)

- categories에 `summary` 추가. apps 0번은 `log` 없음 (`[apps, summary]`)
- 섹션 순서: `## 요약` / `## 제작 동기` / `## 목표 설정` / `## 주요 작업` / `## 결과`
- 진행 중 항목에 ⏳ 이모지 사용 가능

### TIL

- **핵심 원칙 — TIL은 "디렉터가 배운 것"이다 (2026-09-05).** 디렉터는 코딩을 안 하므로, TIL에 담는 건 구현 메커니즘(그 API·코드 패턴·"이렇게 짰다")이 아니라 **디렉터가 실제로 이해했고 다음 판단에 써먹을 원리·트레이드오프·판단**이다. 판별 기준: "이걸 다음 프로젝트에서 디렉터로서 결정할 때 쓸 수 있나?" → 그렇다면 TIL, "정확한 API·문법"이면 devlog `막힌 부분`으로 내린다. 코드블록은 원리를 예시할 때만 곁들이고, 주인공은 통찰이다.
  - ❌ "`urlId = permalink ?? id`를 단일 choke point로 라우팅·feed·sitemap을 통일" (구현 메커니즘 — Claude가 아는 것)
  - ✅ "URL을 파일명에 묶으면 정리할 때마다 SEO가 발목 잡는다. 안 바뀌는 id로 떼두면 자유롭다 — 대신 옛 URL 리다이렉트를 꼭 챙겨야 404가 안 난다" (디렉터가 가져갈 판단)
- categories: `[today-i-learn]` 고정. project/project_name: `today-i-learn` / `Today I Learn` 고정 (앱 프로젝트 슬러그 쓰지 않음)
- 번호 없는 제목, 자연스러운 한 문장
- 각 섹션은 `---`로 구분
- ❌/✅ 주석으로 잘못된/올바른 코드 쌍 표현 가능
- 구조는 깊이에 따라 선택:
  - 얕은 포인트 여러 개 → 파일 하나에 묶기: `## 기술 분류` → `### 학습 항목` → 설명 → 코드블록
  - 깊은 포인트 하나 → 파일 하나: `## 큰 주제 (파일 제목과 동일)` → `## 소주제들` → `## 요약` 마무리

### daily-log

- categories: `[today-i-learn]`, project: `daily-log`, project_name: `Daily Log`
- 섹션 순서: `## 오늘 한 일` / `## 어려웠던 점` / `## 배운 점` / `## 해야 할 일`
- 내용 없는 섹션은 섹션째 삭제
- 네 섹션 모두 "프로젝트 헤딩 + 하위 불릿" 중첩 형식으로 통일 — 최상위는 `- 프로젝트명`(오늘 한 일과 같은 표기), 그 아래 탭 들여쓰기로 항목을 `- …`로 하나씩. 한 줄에 `/`·`,`로 이어 쓰지 말고 항목마다 불릿을 나눈다.
  - 어려웠던 점: `- 프로젝트명` → `- 어려웠던 서술`. `(프로젝트)` 인라인 접두 쓰지 않음.
  - 배운 점: `- 프로젝트명 TIL N으로 정리` → `- 배운 항목` 하나씩.
  - 해야 할 일: `- 프로젝트명` → `- 할 일` 하나씩.

#### 데일리 로그 초안 — 세션 간 조각 파일 (2026-08-22 확정)

여러 프로젝트 세션이 같은 `오늘 해낸 것(날짜)` 초안 하나를 공유하다 서로 파일 전체를 새로 써서 앞 세션 블록이 통째로 사라지는 문제가 반복됐다(초안은 gitignore라 덮이면 복구 불가). 그래서 **조각 파일**로 나눈다.

- **각 세션은 자기 프로젝트 조각만 쓴다**: `draft-오늘 해낸 것(YYYY-MM-DD) - {프로젝트}.md`. 파일명이 세션마다 달라 충돌이 원천 불가능. **공유 파일·게시본을 통째로 새로 쓰지 않는다.**
- **조각 내용**: frontmatter 없이 그 프로젝트 블록만. 각 섹션(`## 오늘 한 일`/`## 어려웠던 점`/`## 배운 점`/`## 해야 할 일`) 아래 `- 프로젝트명` + 하위 불릿. 내용 없는 섹션은 뺀다.
- **게시(블로그 세션)**: 그날의 모든 `draft-오늘 해낸 것(날짜) - *.md`를 섹션별로 합쳐 `오늘 해낸 것(날짜).md`(frontmatter 포함)로 게시하고, 조각들을 삭제한다.
- **이미 게시된 날짜에 추가할 때**: 조각을 만들지 말고 게시본을 **읽고 자기 블록만 덧붙인다**(전체 새로쓰기 금지).

## Post Layout (`src/layouts/Post.astro`)

`[...slug].astro` 라우트가 모든 게시글에 자동 적용. 삽입 순서:

1. **App Card** — `app_url` 있는 포스트에만. `/assets/images/{project}.png` 썸네일 자동 참조(`onerror`로 숨김)
2. **Video Card** — `video_id` 있는 포스트에만. YouTube 썸네일 자동 참조
3. **본문**(`<Content />`) → `video_id` 있으면 하단 YouTube embed
4. **Kakao AdFit** — web `DAN-eseeNyWWDBquTVAI`(728×90) / mobile `DAN-i7W2YzEhUz3zlsI3`(320×50)
5. **Series** — 같은 `project` 시리즈(summary 먼저·번호·현재 강조·>10 스크롤). `seriesFor`
6. **Suggested** — 첫 비-(log/summary/til) 카테고리를 공유하는 타 project summary 최신 4개. `suggestedFor`

Pagefind 속성: `data-pagefind-body`(article)·`data-pagefind-meta="date"`(time)·`data-pagefind-ignore`(카드·시리즈·추천). Obsidian 마크다운엔 이 레이아웃 코드 불필요 — 자동 처리.

## Key Constraints

- **호스팅: Cloudflare Pages**, GitHub Pages 아님
- 다크모드는 CSS 토큰 + `prefers-color-scheme` + `:root[data-theme]` 토글로 직접 처리(`global.css`)
- Favicon: `Base.astro` head의 `<link rel="icon" href="/assets/images/profile.png">`
- og:image: `lib/og.ts` — `assets/images/{project}.png`(소스 존재 검사) 있으면 그걸, 없으면 `profile.png` (site 절대경로)
- 아이콘은 인라인 SVG 사용 (외부 CSS/CDN 의존 금지)
- `app_url`로 내부 경로(`/apps/pdf-editor/index.html`) 사용 가능 — 정적앱은 copy-static이 `public/apps/`로 복사
- **future:false(예약 발행)**: `lib/kst.ts`의 `isPublished`(빌드 시각 KST ≥ 글 날짜)를 `getPosts()`가 단일 choke point로 적용. 정적 사이트라 "시계가 지나면 자동"이 아니라 "지난 뒤 다음 빌드(=다음 push) 때" 뜬다. KST 기준이라 오전 포스트 누락 없음
- JS/TS에서 날짜 계산 시 `toISOString()` 대신 로컬(UTC 컴포넌트) 날짜 함수 사용 (KST 오프셋 문제)
- head 트래킹/검증: GTM `GTM-TNJZ56S6`, GSC `R-IPOkDo6…`, AdSense `ca-pub-2560235080070689`, Cloudflare Insights beacon — 모두 `Base.astro` head. 변경 시 주의

## Draft 검수 체크리스트

"~ draft 검수" 요청 시 아래를 순서대로 확인한다. 기계 규칙 위반은 바로 고치고, 판단이 필요한 것(이월 범위 등)은 사용자에게 확인한다. 검수는 draft 파일만 대상이며 커밋하지 않는다(게시는 별도 요청).

**검수는 스캔(grep)만으로 끝내지 않는다 — 본문을 처음부터 끝까지 정독하고 아래를 전부 적용한다.** 스캔은 보조 도구일 뿐이고, 패턴이 새면(예: `-ㅂ니다`를 놓친 적 있음) 위반이 통째로 남는다. 사용자가 짚기 전에 잡는 게 검수다 ([[strict-draft-review]]).

### 1. 대상·충돌

- 해당 프로젝트의 draft를 전부 찾는다 (`find _content -iname "draft-*<프로젝트>*"`). draft는 gitignore라 Grep 도구가 건너뛰므로 `find`/bash로 찾을 것.
- 게시본 최고 번호와 비교해 번호 충돌이 없는지 확인 ([[draft-publish-number-collision]]).

### 2. frontmatter

- `description` 1문장 있음 (규칙 14). 비면 사이트 기본 설명으로 대체되니 필수.
- `categories` 맞음 — log는 `[log, apps]`/`[log, ue5]`, summary는 `[apps, summary]`, TIL·daily는 `[today-i-learn]`.
- (`layout: post`는 이제 선택 — 없어도 Post 레이아웃 적용됨)

### 3. 기계 규칙 (바로 고침)

- Bold(`**`) 0개 (코드블록 밖). 코드블록 안에 `**` 없으면 `sed 's/\*\*//g'`로 일괄 제거.
- "지옥" 등 과장 클리셰 없음 ([[no-hell-cliche-in-posts]]).
- 문장 끝 콜론(`:`) 없음 (본문. frontmatter YAML 빈 필드는 오탐이니 제외).
- 코드블록 언어 표기 — 언어 없는 fence는 텍스트 출력이면 ` ```text `로.
- 빈 섹션·빈 불릿(`- `) 없음 — 내용 없는 섹션은 섹션째 삭제.
- 문체 = 평서체(반말, `-다`/`-ㄴ다`) 통일. 존댓말(`-습니다`·`-ㅂ니다`·`-요`·`-세요`) 금지 — 인용부호 안 실제 UI 문구·대사만 예외. 스캔은 `-습니다`만 보지 말고 `-ㅂ니다` 전부(겁니다·킵니다·집니다 등)와 `-요` 계열까지 훑는다(`아니다`처럼 평서체가 `니다`로 끝나는 건 오탐). 한 파일 안에서 오늘 한 일 불릿은 평서체인데 서술 문단(막힌 부분 ###)만 존댓말로 남는 혼용이 잦으니 문단마다 확인.

### 4. 구조·내용

- 막힌 부분 형식 — 단순 항목은 li(`- 문제` → `- 해결:`), 상세 서술이나 코드 있는 항목은 `### 제목` 서술형(상세 서술은 코드 없어도 ### 허용).
- 섹션 구조·순서 맞음 (log·summary·daily·TIL 각 규칙).
- 본문 맨 위 요약 — devlog가 `## 오늘 한 일` 위(frontmatter와 첫 헤딩 사이)의 요약/도입 문장으로 시작하면 `## 오늘 한 일` 바로 아래로 옮긴다. 요약은 `description`이 담당하므로 본문 맨 위에 별도 요약을 두지 않는다(세션들이 자꾸 붙임).
- `다음에 할 일` 누적 이월 — 직전 log의 미해결 항목을 다시 적었는지. 빠졌으면 이월(오래 누적돼 판단이 필요하면 사용자에게 확인).
- 시점·인칭 ([[log-what-why-til-how]]) — 코드는 Claude가 짜므로 아래를 지킨다.
  - 코더 1인칭 금지: "내가 짰다/만들었다/짐작했다/넣은 수정" 같은 코딩 주체 1인칭 서술 금지(디렉터는 코딩 안 함). 비인칭("~하게 짜여 있었다")이나 프로젝트 "우리"로.
  - "사용자"로 디렉터 지칭 금지 — "사용자"는 앱 최종 사용자에게만 쓴다. 디렉터가 짚어 준 건 "다시 대조하다 잡았다"처럼 주체를 지운다.
  - 허용 1인칭: 플레이어·사용자로서의 나("내 폰에서 내가 다 깨니까"), 디렉터에게 판단을 넘기는 "내가 정할 문제가 아니다".
  - 코더-수령자 시점("요청이 들어왔다/요청받았다") 금지 — 자기가 원한 걸 주문받은 듯 쓰지 않는다.
  - 코더의 삽질·소요 시간·실수를 앞세우지 않는다 — "한참 헤맸다/제일 오래 막혔다/두 번 헛돌았다/실수를 처음에 했다/여기서 한 번 걸렸다" 같은 서술은 만든 사람(Claude)의 경험이라 디렉터 로그에 이질적이다. 삽질 프레이밍을 빼고 함정·교훈 자체를 쓴다(예: "식을 의심하느라 두 번 헛돌았다" → "결과가 틀리면 식보다 기준점을 먼저 본다"; "여기서 제일 오래 막혔다. 칸이 둘인데…" → "칸이 둘이라 헷갈리기 쉽다. 받는 게 다른데…"). 단, 결정 서술("정했다/받아들였다/택했다")은 디렉터가 정하는 것이라 허용.
- TIL 가독성 — 전문어·API 첫 등장에 한 줄 풀이, 소제목은 동작 중심 우리말.
- 민감정보 — 회사 내부정보·타인 개인정보·실제 URL·키 없음.

### 5. 게시 (별도 요청 시)

- `mv -n`으로 `draft-` 제거 (no-clobber, 덮어쓰기 방지).
- `git add` → Bash 히어독으로 커밋(UTF-8) → push.

## 보안 검사 (코드 작성 시 필수 확인)

코드를 작성하거나 수정할 때마다 아래 항목을 반드시 검토한다.
그 후 CLAUDE.md를 업데이트하고 git commit & push 한다.

**검토 완료 후 응답 끝에 아래 형식으로 보안 검사 결과를 항상 출력한다:**

```
🔐 보안 검사 결과
🔑 민감 정보: ✅ 없음 / ❌ 발견됨 → [내용]
🌐 외부 호출: ✅ 없음 / ❌ 발견됨 → [내용]
📦 의존성:   ✅ 공식   / ⚠️ 확인 필요 → [내용]
📁 파일 I/O: ✅ 안전   / ⚠️ 확인 필요 → [내용]
🕵️ 코드 이상: ✅ 없음 / ❌ 발견됨 → [내용]
📝 CLAUDE.md Updated ✅
🔄️ Git Commit & Push ✅
```

문제가 발견된 항목은 ❌ 또는 ⚠️로 표시하고 내용을 명시한다. 모두 이상 없으면 각 항목 ✅로 표시한다.

### 민감 정보 노출 금지 🔑

- API 키, 토큰 등 민감 정보를 소스(`astro.config.mjs`, `src/`, 컴포넌트)에 하드코딩하지 않는다.
- 외부 서비스 연동 시 환경 변수 또는 GitHub Secrets를 사용한다.

### 포스트 내용 공개 범위 검토 📝

포스트를 새로 작성하거나 daily-log를 커밋할 때 아래를 확인한다.

- **회사 내부 정보**: 조직 운영 방식, 내부 시스템 구조, 팀원 개인 정보가 포함되어 있지 않은지 확인한다. "Django에서 이렇게 구현했다" 수준은 괜찮지만 "우리 회사는 이런 방식으로 운영된다" 수준은 주의한다.
- **개인 정보**: 전화번호, 주소, 타인의 이름, 가족·지인의 직업·소속·관계, 이해충돌(가족 수주 등)이 포함되지 않도록 한다. 동생·가족을 가리키는 서술은 "실무자·현장"처럼 일반화한다.
- **작성 원칙**: 회사 업무 관련 기록은 기술적으로 배운 것 위주로 남기고, 구체적인 비즈니스 로직이나 조직 정보는 생략하거나 일반화한다.

### 외부 호출 검토 🌐

- 외부 URL(`href`, `src`, `app_url`)이 의도된 링크인지 확인한다.
- `<script>` 태그로 외부 JS를 로드할 경우 신뢰할 수 있는 출처(GTM·AdFit·Cloudflare 등 기존 것)인지 확인한다.
- YouTube 썸네일·embed, 후원 버튼 등 외부 리소스 호출은 허용 (의도된 동작).

### 의존성 검증 📦

- npm 패키지는 공식·신뢰 가능한 것인지 확인한다.
- `package.json` 의존성 변경 시 반드시 검토한다.
- 불필요한 의존성은 추가하지 않는다.

### 파일 I/O 보안 📁

- `_content/` 내 draft 파일은 반드시 `draft-` 접두사를 붙여 `.gitignore`로 제외한다.
- 민감한 내용이 담긴 포스트가 실수로 git에 포함되지 않도록 확인한다.

### 코드 이상 여부 확인 🕵️

- `.astro`·컴포넌트·엔드포인트에 난독화된 코드나 의미 불명의 문자열이 없는지 확인한다.
- 인라인 `<style>`, `style=""` 속성이 추가되지 않았는지 확인한다 (모든 스타일은 `src/styles/global.css`에만 작성).
- `<script>` 내 `eval()` 또는 동적 코드 실행이 없는지 확인한다.

## 이미지 관리

- **포스트 본문 이미지는 `assets/images/for-posts/`에 저장** (Tistory/Kakao CDN 등 외부 CDN 사용 금지 — hotlink 차단으로 표시 안 됨)
- 이미지 포맷은 WebP로 변환해서 저장 (용량 절감)
- 마크다운 경로는 반드시 절대경로 사용: `![](/assets/images/for-posts/파일명.webp)`
  - 상대경로(`assets/...`)는 Obsidian 미리보기에서는 보이지만 웹에서 깨짐
  - 절대경로(`/assets/...`)는 Obsidian 미리보기에서 안 보이지만 웹에서 정상 표시
- 이미지는 루트 `assets/images/`가 원본이고, `copy-static.mjs`가 빌드 전 `public/assets/images/`로 복사해 `/assets/...`로 서빙됨
- GitHub repo 용량 제한: 단일 파일 100MB 이하, 전체 권장 1GB 이하 (스크린샷 위주면 수년간 문제없음)

## 해야 할 일

- [x] **전체 URL을 랜덤 8자리 permalink로 이관** — 완료(2026-08-31, `ebddf4f`). 616편 permalink를 랜덤 8자(`a-z0-9`)로 바꿔 전 URL을 `/xxxxxxxx/`로 균일화. `public/_redirects`에 옛 URL→새 URL 301 **616줄**(한글·공백·em-dash·괄호는 `encodeURI`로 percent-encode — Cloudflare 라이브에서 301 검증 완료). 내부 링크는 permalink 기반이라 자동 전환. **새 글도 랜덤 8자 permalink를 붙이고 `public/_redirects`는 건드리지 않는다**(새 글은 옛 URL이 없으니 리다이렉트 불필요). 옛 서술형 URL의 SEO 이점은 포기(디렉터 수용).
- [ ] **라이브 데모 위젯**: 앱별 핵심 알고리즘 웹 위젯화 (앱마다 개별 작업)
- [ ] **세션 조율 워크플로우 TIL**: 여러 프로젝트 세션을 `LogStoneShop/INBOX.md`로 조율하는 방식을 독립 TIL/회고로 소개 (개인 워크플로우라 공개 안전 — 각 devlog에 조각으로 새는 대신 한 편으로)
