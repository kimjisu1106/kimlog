# KimLog - GitHub Pages Blog

## Project Overview

Obsidian으로 마크다운 문서를 작성 → 이 vault 폴더가 git 추적됨 → GitHub Desktop 또는 Claude Code로 commit & push → Netlify에 배포되는 Jekyll 블로그.

## Stack

- **Jekyll** + **Minima** 테마 (`~> 2.5`)
- **Obsidian** 으로 포스트 작성 (`_devlog/` 폴더)
- **Cloudflare** 호스팅

## Git / 배포

- Gemfile 필수 — `jekyll`, `minima`, `base64`, `kramdown-parser-gfm`, 플러그인 포함
- Ruby 버전 `3.2.2`로 고정 (`.ruby-version`) — Ruby 3.4는 safe_yaml 호환 문제 있음

## Structure

```
_config.yml          # 사이트 설정 (title, theme, collections, plugins)
_data/
  sections.yml       # ue5 / apps 섹션 정의 (include 카테고리 목록)
_devlog/             # 포스트 원본 (Obsidian에서 작성)
  devlog/            # 카테고리: devlog
  apps/              # 카테고리: apps (구 tools 포함)
  ue5/               # 카테고리: ue5
  today-i-learn/     # 카테고리: today-i-learn
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
index.html           # 홈 (contribution graph + Daily Logs + Dev Logs + Apps + Videos)
search.html          # 검색 페이지 (클라이언트 사이드 전문 검색)
search.json          # 빌드 시 생성되는 검색 인덱스 (제목 + 본문)
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

- 섹션 구분 없이 `categories contains 'devlog'`인 전체 포스트를 날짜순으로 project 그룹핑
- h3: `{{ cat_label }} | {{ project_title }}` (cat_label은 ue5/apps 카테고리에서 파생)
- 상단에 `{% include contribution-graph.html category="devlog" %}`

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
  - devlog # devlog 필수
  - ue5 # 섹션 카테고리 (ue5 | apps | today-i-learn)
  - summary # (선택) 해당 페이지 Projects 섹션에 노출
status: finished # (선택) finished 이면 완료 뱃지 표시
project: "프로젝트명" # devlog 그룹핑 기준. related posts 기준
project_name: "표시할 이름" # (선택) project와 다른 표시명
video_id: "YouTube ID" # (선택) summary + video_id 있으면 홈 Videos에 노출
app_url:
  "https://..." # (선택) summary + app_url 있으면 홈 Apps 섹션 노출
  # redirect_to는 jekyll-redirect-from 플러그인과 충돌 → 사용 금지
description: "설명" # (선택) SEO meta description. 없으면 첫 문단 자동 추출 → site.description 순으로 fallback
---
```

> draft 파일은 파일명에 `draft-` 접두사를 붙이면 `.gitignore`에 의해 git 추적 제외됨.

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

### 외부 호출 검토 🌐

- 외부 URL(`href`, `src`, `app_url`)이 의도된 링크인지 확인한다.
- `<script>` 태그로 외부 JS를 로드할 경우 신뢰할 수 있는 출처(CDN 등)인지 확인한다.
- YouTube 썸네일, 후원 버튼 등 외부 리소스 호출은 허용 (의도된 동작).

### 의존성(플러그인) 검증 📦

- Jekyll 플러그인은 공식 gem인지 확인한다.
- `_config.yml`의 플러그인 목록 변경 시 반드시 검토한다.
- 불필요한 플러그인은 추가하지 않는다.

### 파일 I/O 보안 📁

- `_devlog/` 내 draft 파일은 반드시 `draft-` 접두사를 붙여 `.gitignore`로 제외한다.
- 민감한 내용이 담긴 포스트가 실수로 git에 포함되지 않도록 확인한다.

## 이미지 관리

- **포스트 본문 이미지는 `assets/images/for-posts/`에 저장** (Tistory/Kakao CDN 등 외부 CDN 사용 금지 — hotlink 차단으로 표시 안 됨)
- 마크다운 경로는 반드시 절대경로 사용: `![](/assets/images/for-posts/파일명.png)`
  - 상대경로(`assets/...`)는 Obsidian 미리보기에서는 보이지만 웹에서 깨짐
  - 절대경로(`/assets/...`)는 Obsidian 미리보기에서 안 보이지만 웹에서 정상 표시
- GitHub repo 용량 제한: 단일 파일 100MB 이하, 전체 권장 1GB 이하 (스크린샷 위주면 수년간 문제없음)

### 코드 이상 여부 확인 🕵️

- Liquid 템플릿에 난독화된 코드나 의미 불명의 문자열이 없는지 확인한다.
- 인라인 `<style>`, `style=""` 속성이 추가되지 않았는지 확인한다 (모든 스타일은 `assets/main.scss`에만 작성).
- `<script>` 내 `eval()` 또는 동적 코드 실행이 없는지 확인한다.

## 개발 백로그

### 낮음 (Liquid/CSS 수정)

- [x] **Series Posts 강화**: Related Posts → Series 목록으로 개편 완료
  - 날짜 오름차순 + 번호 + 현재 포스트 "읽는 중" 뱃지 + 상단 요약 박스
- [ ] **Suggested Posts**: 같은 category + 다른 project의 summary 포스트 최하단 노출
- [x] **Meta Description**: `jekyll-seo-tag`가 자동 처리 (page.description → page.excerpt → site.description). frontmatter 명세에 `description` 필드 추가 완료
- [x] **RSS 아이콘**: footer 또는 `<head>`에 `/feed.xml` 링크 추가 (`jekyll-feed` 이미 설치됨)

### 중간 (HTML/CSS/JS 작업)

- [ ] **태그 기능**: frontmatter `tags` 추가 + 클라이언트 JS 태그 필터 (태그 페이지 자동생성은 `jekyll-archives` 플러그인 필요)
- [x] **Apps 카드 그리드**: `index.html` Apps 섹션 → 리퀴드 글래스 flip 슬라이더로 전환
  - 앞면: 이미지 + 앱 이름 / 뒷면: 설명 + 바로가기 버튼 (hover/click 플립)
  - 무한 루프 CSS 슬라이더, hover 시 `animation-play-state: paused`
  - 모바일: 애니메이션 없이 wrap 그리드, aria-hidden 복사본 숨김
- [ ] **Lazy Loading**: 포스트 본문 이미지에 `loading="lazy"` 전역 적용

### 공수 미정

- [ ] **라이브 데모 위젯**: 앱별 핵심 알고리즘 웹 위젯화 (앱마다 개별 작업)
