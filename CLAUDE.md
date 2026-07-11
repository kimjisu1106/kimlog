# KimLog - GitHub Pages Blog

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
11. **CSS Consistency** — 모든 스타일은 `assets/main.scss`에만 작성. 인라인 `<style>` 블록, `style=""` 속성 금지. 색상은 CSS 변수 사용(`--border-color`, `--muted` 등). 다크모드는 `prefers-color-scheme` 오버라이드로.
12. **Auto Commit** — 코드 CRUD(생성·수정·삭제)가 발생하면 작업 완료 후 자동으로 git commit & push. 보안 검사 통과 후 수행.
13. **TIL 작성 전 기술 포인트 확인** — TIL을 작성하기 전에 해당 작업에서 사용된 기술 포인트 목록을 빠짐없이 사용자에게 제시하고, 어떤 항목을 기록할지 직접 선택하게 할 것. "중요한 것만" 추리지 말고 사소한 것도 포함해서 전부 나열한다. Claude Code가 코드를 작성하기 때문에 사용자가 어떤 기술이 쓰였는지 모를 수 있음 — 선택 과정 자체가 학습임.
14. **Description 필수** — 새 포스트(draft 포함)를 작성할 때 frontmatter에 `description`을 1문장으로 반드시 넣을 것. 본문 내용을 요약하며, 검색 결과 스니펫·SNS 공유 카드에 그대로 노출됨. 비우면 첫 문단이 자동 추출되는데 헤딩으로 시작하는 devlog는 스니펫 품질이 나쁨.

## Project Overview

Obsidian으로 마크다운 문서를 작성 → 이 vault 폴더가 git 추적됨 → GitHub Desktop 또는 Claude Code로 commit & push → Cloudflare 배포되는 Jekyll 블로그.

## Stack

- **Jekyll** + **Minima** 테마 (`~> 2.5`)
- **Obsidian** 으로 포스트 작성 (`_content/` 폴더)
- **Cloudflare** 호스팅

## Git / 배포

- Gemfile 필수 — `jekyll`, `minima`, `base64`, `kramdown-parser-gfm`, 플러그인 포함
- Ruby 버전 `3.2.2`로 고정 (`.ruby-version`) — Ruby 3.4는 safe_yaml 호환 문제 있음
- Cloudflare Pages 빌드 커맨드: `bundle exec jekyll build && npx pagefind --site _site` — Pagefind가 빌드 후 `_site/pagefind/` 검색 인덱스를 생성 (미적용 시 검색 페이지는 search.json fallback으로 동작)

## Structure

```
_config.yml          # 사이트 설정 (title, theme, collections, plugins)
_data/
  sections.yml       # ue5 / apps 섹션 정의 (include 카테고리 목록)
_content/            # Jekyll collection (site.content) — 포스트 원본
  devlog/            # 기존 _devlog 포스트
    apps/            # 카테고리: apps (구 tools 포함)
    devlog/          # 카테고리: log (daily-log, TIL 등)
    ue5/             # 카테고리: ue5
  audio/             # 카테고리: audio
    music-cover/     # 커버 연주
    original/        # 자작곡 (예정)
_includes/
  head.html                # Minima head 오버라이드 (favicon, OG, Google Search Console)
  header.html              # Minima header 오버라이드 (nav + 검색 아이콘)
  footer.html              # footer 오버라이드 (contact 정보 + /contact/ 후원 링크)
  youtube.html             # YouTube embed 인클루드
  contribution-graph.html  # GitHub 잔디 그래프 (category 파라미터 또는 전체)
_layouts/
  post.html          # Minima post layout 오버라이드 (app card, video card, related posts)
assets/
  main.scss          # 전체 커스텀 CSS (여기에만 스타일 작성)
  images/            # profile.ico, profile.png (favicon), {project}.png (앱 썸네일)
                     #   kakaopay-qr.png (카카오페이 QR)
    for-posts/       # 포스트 본문 이미지 (외부 CDN 사용 금지, 로컬 저장 필수)
apps/
  pdf-editor/        # PDF Editor 웹앱 정적 파일
devlog.html          # Dev Log 목록 페이지 (모든 devlog 포스트, 날짜순 project 그룹핑)
til.html             # TIL 목록 페이지 (contribution graph + project별 그룹핑)
ue5.html             # UE5 페이지 (contribution graph + Projects/Dev Log)
apps.html            # Apps 페이지 (contribution graph + Projects/Dev Log)
index.html           # 홈 (contribution graph + 태그 워드클라우드 + Daily Logs + Dev Logs + Apps + Videos)
search.html          # 검색 페이지 (Pagefind 우선, 인덱스 없으면 search.json fallback, ?q= 파라미터 지원)
search.json          # 빌드 시 생성되는 검색 인덱스 (제목 + 본문 + tags) — Pagefind fallback용
tags.json            # 빌드 시 생성되는 경량 태그 인덱스 (date + tags만) — 홈 워드클라우드용
robots.txt           # sitemap.xml 위치 안내
contact.html         # Contact 페이지 (이메일, YouTube, PayPal/카카오페이 후원)
privacy-policy.html  # Privacy Policy (범용, 영/한, Google AdSense 조항 포함)
.gitignore           # **/draft-*.md 제외
```

## Page File Convention

- 모든 페이지 파일은 `.html` 확장자 사용
- HTML+Liquid로만 구성 → `.md`로 하면 Markdown 파서가 HTML 구조 훼손할 수 있음

## CSS Rules

- **모든 스타일은 `assets/main.scss`에만 작성** (인라인 `<style>` 블록, `style=""` 속성 금지)
- 단위는 `px` 통일
- 색상은 CSS 변수 사용 (`--border-color`, `--btn-border`, `--muted`, `--devlog-*` 등)
- 다크모드: `@media (prefers-color-scheme: dark)` 로 CSS 변수 오버라이드
- `hr`: `margin-top: 32px; margin-bottom: 32px` 전역 적용
- **전역 heading 크기 고정**: `h1=40px`, `h2=32px`, `h3=24px`
- `.post-content h3`: `font-weight: 600` (크기는 전역 h3에서 상속)
- `.devlog-badge`: `vertical-align: middle; position: relative; top: -3px` (✅ 이모지 수직 정렬)
- 코드블럭 배경색: `#ebebeb` (인라인 백틱 + 코드블럭 공통)

## Link Style Convention

- 모든 페이지의 포스트 링크는 `font-weight: 600` 이상
- Minima의 `.post-link` 클래스는 `display: block` 등 레이아웃 스타일이 붙어 있어 커스텀 레이아웃에서 사용 금지

## Post List Pages (ue5.html, apps.html)

상단에 `{% include contribution-graph.html category="..." %}` 후 `<h2>Projects</h2>` + `<h2>Dev Log</h2>` 섹션 구조:

- Projects 섹션: `categories`에 `summary` 포함된 포스트만 표시, 링크 텍스트는 `project_name | default: title`
- 완료된 프로젝트는 `status: finished` → `<span class="devlog-badge">✅</span>` 표시

```html
<ul class="devlog-list">
  {% for post in posts %}
  <li>
    {{ post.date | date: "%Y-%m-%d" }} ｜
    <a href="{{ post.url | relative_url }}"
      >{{ post.project_name | default: post.title }}</a
    >
    {% if post.status == 'finished' %}<span class="devlog-badge">✅</span>{%
    endif %}
  </li>
  {% endfor %}
</ul>
```

## devlog.html 구조

- 섹션 구분 없이 `categories contains 'log'`인 전체 포스트를 날짜순으로 project 그룹핑
- h3: `{{ cat_label }} | {{ project_title }}` (cat_label은 ue5/apps 카테고리에서 파생)
- 상단에 `{% include contribution-graph.html category="log" %}`

## DevLog / TIL 더보기 구조 (devlog.html, til.html)

- 5개 초과 시 6번째부터 `<li hidden class="devlog-extra-item">` 처리
- 프로젝트 타이틀: `<h3 class="devlog-title">` (h3 태그)
- 버튼: `<button class="devlog-toggle" data-list="list-{gid}">` — 테두리/배경 없는 심플 텍스트
- JS가 `hidden` attribute를 toggle함
- `.devlog-group { margin-bottom: 32px }` (project 그룹 간 간격)
- `.devlog-summary { margin-bottom: 30px }` (summary 아래 간격)

## Contribution Graph (`_includes/contribution-graph.html`)

- `{% include contribution-graph.html category="ue5" %}` 형태로 호출
- `category` 생략 시 전체 포스트 대상
- `where_exp: "p", "p.categories contains _cat"` — 배열에 해당 카테고리가 하나라도 포함되면 매칭
- 52주 × 7일 그리드, 로컬 시간(KST) 기준으로 날짜 계산 (`toISOString()` 미사용)
- 셀 색상: `til-cell--0`(회색) ~ `til-cell--4`(진초록), 다크모드 자동 대응

## Contact 페이지 (`contact.html`)

- 이메일, YouTube 링크
- PayPal 버튼: 직접 링크
- 카카오페이 버튼: 모바일 → 딥링크(`qr.kakaopay.com`), 데스크탑 → QR 모달 팝업 (JS `navigator.userAgent` 판별)
- QR 이미지: `assets/images/kakaopay-qr.png`
- footer의 후원하기 버튼 → `/contact/` 로 이동

## Post Frontmatter

```yaml
---
title: "포스트 제목"
date: 2025-01-01
categories:
  - log # log 필수 (URL은 /devlog/... 유지, category 이름만 log)
  - ue5 # 섹션 카테고리 (ue5 | apps | today-i-learn)
  - summary # (선택) 해당 페이지 Projects 섹션에 노출
status: finished # (선택) finished 이면 완료 뱃지 표시
project: "프로젝트명" # devlog 그룹핑 기준. related posts 기준
project_name: "표시할 이름" # (선택) project와 다른 표시명
video_id: "YouTube ID" # (선택) summary + video_id 있으면 홈 Videos에 노출
app_url:
  "https://..." # (선택) summary + app_url 있으면 홈 Apps 섹션 노출
  # redirect_to는 jekyll-redirect-from 플러그인과 충돌 → 사용 금지
short_title: "짧은 제목" # (선택) 목록에서 title 대신 표시. daily-log처럼 title에 날짜가 붙는 경우 사용
description: "설명" # SEO meta description. 새 포스트는 1문장으로 반드시 작성 (검색 결과 스니펫·SNS 공유에 쓰임). 없으면 첫 문단 자동 추출 → site.description 순으로 fallback
---
```

> draft 파일은 파일명에 `draft-` 접두사를 붙이면 `.gitignore`에 의해 git 추적 제외됨.

## Post Writing Rules

### 공통 (모든 포스트)

- Bold(`**`) 사용 금지 — 강조가 필요하면 헤딩·리스트 구조로 대체
- 과장된 클리셰 표현 금지 — "지옥이다", "지옥같다" 같은 표현 쓰지 말 것. 문제 상황은 사실 그대로 서술 (예: "관리가 지옥이다" → "각각 트윈하면 관리가 번거롭다")
- `description` frontmatter를 1문장으로 작성 (SEO 스니펫용, 본문 내용 요약)
- 제목은 사이트 전체에서 고유하게 — daily-log는 `title: 오늘 해낸 것 (YYYY-MM-DD)` + `short_title: 오늘 해낸 것`
- 문장 끝 콜론(`:`) 금지 — "수정했습니다:" → "수정했습니다."
- 섹션 간 구분은 `---` 사용
- 코드블록에 언어 명시 필수 (` ```dart`, ` ```js` 등)
- Liquid 특수문자(`{{ }}`, `{% %}`)가 코드블록 안에 있어도 포함 시 `{% raw %}` / `{% endraw %}` 사용 — `{%- -%}` whitespace modifier 형태 금지

### devlog (apps / ue5)

- categories: `[log, apps]` 또는 `[log, ue5]`
- 섹션 3개 고정, 순서·이름 변경 금지: `## 오늘 한 일` → `## 막힌 부분` → `## 다음에 할 일`
- 내용 없는 섹션은 섹션째 삭제
- 막힌 부분은 코드블록 유무로 형식을 가른다.
  - 기본형(코드 없음): li 형태 — `- 문제 서술` → 하위 들여쓰기 `- 해결: …`(필요시 `- 원인:`·`- 남은 한계:` 등 추가). log는 코드를 TIL로 빼므로 대개 이 형식.
  - 상세형(코드 필요): `### 한 문장 제목` → 문제점/원인/해결 서술 → 코드블록 → (선택) `>` 보충. 코드블록을 li 안에 넣으면 렌더링이 깨지므로 코드가 들어갈 때만 헤딩을 쓴다.

### summary 포스트 (프로젝트 소개 0번 또는 완결 포스트)

- categories에 `summary` 추가. apps 0번은 `log` 없음 (`[apps, summary]`)
- 섹션 순서: `## 요약` / `## 제작 동기` / `## 목표 설정` / `## 주요 작업` / `## 결과`
- 진행 중 항목에 ⏳ 이모지 사용 가능

### TIL

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

## Post Layout (`_layouts/post.html`)

Minima 기본 post layout을 오버라이드. 세 가지 기능이 자동으로 삽입됨:

**1. App Card (상단)**

- `app_url`이 있는 포스트에만 표시
- `/assets/images/{project}.png` 썸네일 자동 참조

**2. Video Card (상단)**

- `video_id`가 있는 포스트에만 표시
- YouTube 썸네일 자동 참조

**3. Related Posts (하단)**

- 같은 `project`를 가진 다른 포스트 자동 목록 (category 무관)
- 현재 포스트 제외, date 내림차순 정렬
- 1개 이상일 때만 표시, 5개 초과 시 더보기 toggle

> Obsidian 템플릿에서 Related Post Liquid 코드 불필요 — layout에서 자동 처리

## Key Constraints

- **호스팅: Cloudflare**, GitHub Pages 아님
- Minima skin 기능 없음 → 다크모드는 CSS 변수 + `prefers-color-scheme`으로 직접 처리
- Favicon: `_includes/head.html` 직접 오버라이드 방식 사용 (`custom-head.html` include 방식은 Minima 버전에 따라 불안정)
- og:image: `page.project` 썸네일(`/assets/images/{project}.png`)이 존재하면 그걸, 없으면 profile.png fallback (head.html에서 `site.static_files`로 존재 검사)
- 아이콘은 인라인 SVG 사용 (Font Awesome CDN 제거됨 — 외부 CSS 의존 금지)
- `app_url`로 내부 경로(`/apps/pdf-editor/index.html`) 사용 가능
- `future: true` — 한국 시간(KST) 기준 당일 포스트가 UTC 기준 미래로 인식되어 누락되는 문제 방지
- JS에서 날짜 계산 시 `toISOString()` 대신 로컬 날짜 포맷 함수 사용 (KST 오프셋 문제)

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

- API 키, 토큰 등 민감 정보를 `_config.yml`, HTML, Liquid 템플릿에 하드코딩하지 않는다.
- 외부 서비스 연동 시 환경 변수 또는 GitHub Secrets를 사용한다.

### 포스트 내용 공개 범위 검토 📝

포스트를 새로 작성하거나 daily-log를 커밋할 때 아래를 확인한다.

- **회사 내부 정보**: 조직 운영 방식, 내부 시스템 구조, 팀원 개인 정보가 포함되어 있지 않은지 확인한다. "Django에서 이렇게 구현했다" 수준은 괜찮지만 "우리 회사는 이런 방식으로 운영된다" 수준은 주의한다.
- **개인 정보**: 전화번호, 주소, 타인의 이름 등이 포함되지 않도록 한다.
- **작성 원칙**: 회사 업무 관련 기록은 **기술적으로 배운 것** 위주로 남기고, 구체적인 비즈니스 로직이나 조직 정보는 생략하거나 일반화한다.

### 외부 호출 검토 🌐

- 외부 URL(`href`, `src`, `app_url`)이 의도된 링크인지 확인한다.
- `<script>` 태그로 외부 JS를 로드할 경우 신뢰할 수 있는 출처(CDN 등)인지 확인한다.
- YouTube 썸네일, 후원 버튼 등 외부 리소스 호출은 허용 (의도된 동작).

### 의존성(플러그인) 검증 📦

- Jekyll 플러그인은 공식 gem인지 확인한다.
- `_config.yml`의 플러그인 목록 변경 시 반드시 검토한다.
- 불필요한 플러그인은 추가하지 않는다.

### 파일 I/O 보안 📁

- `_content/` 내 draft 파일은 반드시 `draft-` 접두사를 붙여 `.gitignore`로 제외한다.
- 민감한 내용이 담긴 포스트가 실수로 git에 포함되지 않도록 확인한다.

## 이미지 관리

- **포스트 본문 이미지는 `assets/images/for-posts/`에 저장** (Tistory/Kakao CDN 등 외부 CDN 사용 금지 — hotlink 차단으로 표시 안 됨)
- 이미지 포맷은 WebP로 변환해서 저장 (용량 절감)
- 마크다운 경로는 반드시 절대경로 사용: `![](/assets/images/for-posts/파일명.webp)`
  - 상대경로(`assets/...`)는 Obsidian 미리보기에서는 보이지만 웹에서 깨짐
  - 절대경로(`/assets/...`)는 Obsidian 미리보기에서 안 보이지만 웹에서 정상 표시
- GitHub repo 용량 제한: 단일 파일 100MB 이하, 전체 권장 1GB 이하 (스크린샷 위주면 수년간 문제없음)

### 코드 이상 여부 확인 🕵️

- Liquid 템플릿에 난독화된 코드나 의미 불명의 문자열이 없는지 확인한다.
- 인라인 `<style>`, `style=""` 속성이 추가되지 않았는지 확인한다 (모든 스타일은 `assets/main.scss`에만 작성).
- `<script>` 내 `eval()` 또는 동적 코드 실행이 없는지 확인한다.

## 해야 할 일

- [ ] **라이브 데모 위젯**: 앱별 핵심 알고리즘 웹 위젯화 (앱마다 개별 작업)
