# KimLog - GitHub Pages Blog

## Project Overview

Obsidian으로 마크다운 문서를 작성 → 이 vault 폴더가 git 추적됨 → GitHub Desktop으로 commit → GitHub Pages에 배포되는 Jekyll 블로그.

## Stack

- **Jekyll** + **Minima** 테마 (GitHub Pages 기본 지원, `~> 2.5`)
- **Obsidian** 으로 포스트 작성 (`_devlog/` 폴더)
- **GitHub Desktop** 으로 배포

## Structure

```
_config.yml          # 사이트 설정 (title, theme, collections, plugins)
_devlog/             # 포스트 원본 (Obsidian에서 작성)
  devlog/            # 카테고리: devlog
  apps/              # 카테고리: apps
  ue5/               # 카테고리: ue5
  today-i-learn/     # 카테고리: today-i-learn
_includes/
  head.html          # Minima head 오버라이드 (favicon, OG, Google Search Console)
  footer.html        # footer 오버라이드 (contact 정보 + /contact/ 후원 링크)
  youtube.html       # YouTube embed 인클루드
_layouts/
  post.html          # Minima post layout 오버라이드 (app card, video card, related posts)
assets/
  main.scss          # 전체 커스텀 CSS (여기에만 스타일 작성)
  images/            # profile.ico, profile.png (favicon), {project}.png (앱 썸네일)
apps/
  pdf-editor/        # PDF Editor 웹앱 정적 파일
devlog.html          # Dev Log 목록 페이지 (project별 그룹핑)
til.html             # TIL 목록 페이지 (project별 그룹핑)
ue5.html             # UE5 페이지
apps.html            # Apps 페이지
index.html           # 홈 (Dev Logs + Apps + Videos)
.gitignore           # **/draft-*.md 제외
contact.html         # Contact 페이지 (이메일, YouTube, PayPal/카카오페이 후원)
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
- `.post-content h3`: `font-size: 1.5em; font-weight: 600` (h2와 동일하게)
- `.devlog-badge`: `vertical-align: middle; position: relative; top: -3px` (✅ 이모지 수직 정렬)

## Link Style Convention

- 모든 페이지의 포스트 링크는 `font-weight: 600` 이상
- Minima의 `.post-link` 클래스는 `display: block` 등 레이아웃 스타일이 붙어 있어 커스텀 레이아웃에서 사용 금지


`<h2>Projects</h2>` + `<h2>Dev Log</h2>` 섹션 구조, 리스트는 HTML 사용:

- Projects 섹션: `categories`에 `summary` 포함된 포스트만 표시, 링크 텍스트는 `project_name | default: title`
- 완료된 프로젝트는 `status: finished` → `<span class="devlog-badge">✅</span>` 표시

```html
<ul class="devlog-list">
  {% for post in posts %}
  <li>
    {{ post.date | date: "%Y-%m-%d" }} ｜
    <a href="{{ post.url | relative_url }}">{{ post.project_name | default: post.title }}</a>
    {% if post.status == 'finished' %}<span class="devlog-badge">✅</span>{% endif %}
  </li>
  {% endfor %}
</ul>
```

## DevLog / TIL 더보기 구조 (devlog.html, til.html)

- 5개 초과 시 6번째부터 `<li hidden class="devlog-extra-item">` 처리
- 프로젝트 타이틀: `<h3 class="devlog-title">` (h3 태그, margin/font-size 리셋)
- 버튼: `<button class="devlog-toggle" data-list="list-{gid}">` — 테두리/배경 없는 심플 텍스트
- JS가 `hidden` attribute를 toggle함 (갭 없이 동일 `<ul>` 안에서 처리)
- `.devlog-group { margin-bottom: 32px }` (project 그룹 간 간격)
- `.devlog-summary { margin-bottom: 30px }` (summary 아래 간격)

## Post Frontmatter

```yaml
---
title: "포스트 제목"
date: 2025-01-01
                           # summary 추가 시 해당 페이지 Projects 섹션에 노출
status: finished # (선택) finished 이면 project 그룹에 완료 뱃지 표시. 미설정시 정상 노출
project: "프로젝트명" # devlog 그룹핑 기준. index.html Apps 썸네일은 /assets/images/{project}.png 자동 참조
project_name: "표시할 이름" # (선택) project와 다른 표시명
video_id: "YouTube ID" # (선택) summary + video_id 있으면 홈 Videos에 노출, 포스트 상단에 YouTube 카드 표시
app_url: "https://..." # (선택) summary + app_url 있으면 홈 Apps 섹션 노출, 포스트 상단에 앱 카드 표시
                        # redirect_to는 jekyll-redirect-from 플러그인과 충돌하여 사용 금지
---
```

> draft 파일은 파일명에 `draft-` 접두사를 붙이면 `.gitignore`에 의해 git 추적 제외됨.

## Post Layout (`_layouts/post.html`)

Minima 기본 post layout을 오버라이드. 세 가지 기능이 자동으로 삽입됨:

**1. App Card (상단)**
- `app_url`이 있는 포스트에만 표시
- `/assets/images/{project}.png` 썸네일 자동 참조
- 클릭 시 `app_url`로 새 탭 이동

**2. Video Card (상단)**
- `video_id`가 있는 포스트에만 표시
- YouTube 썸네일 자동 참조
- 클릭 시 YouTube로 새 탭 이동

**3. Related Posts (하단)**
- 같은 `project`를 가진 다른 포스트 자동 목록
- 현재 포스트 제외, date 내림차순 정렬
- 1개 이상일 때만 표시, 5개 초과 시 더보기 toggle

> Obsidian 템플릿에서 Related Post Liquid 코드 불필요 — layout에서 자동 처리

## Key Constraints

- GitHub Pages는 허용된 플러그인만 사용 가능 (`jekyll-feed`, `jekyll-redirect-from`)
- Minima skin 기능 없음 → 다크모드는 CSS 변수 + `prefers-color-scheme`으로 직접 처리
- Favicon: `_includes/head.html` 직접 오버라이드 방식 사용 (`custom-head.html` include 방식은 Minima 버전에 따라 불안정)
- `app_url`로 내부 경로(`/apps/pdf-editor/index.html`) 사용 가능

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
- YouTube 썸네일, Buy Me a Coffee 버튼 등 외부 리소스 호출은 허용 (의도된 동작).

### 의존성(플러그인) 검증 📦

- Jekyll 플러그인은 [GitHub Pages 허용 목록](https://pages.github.com/versions/) 내에서만 추가한다.
- `_config.yml`의 플러그인은 공식 gem인지 확인한다.
- 불필요한 플러그인은 추가하지 않는다.

### 파일 I/O 보안 📁

- `_devlog/` 내 draft 파일은 반드시 `draft-` 접두사를 붙여 `.gitignore`로 제외한다.
- 민감한 내용이 담긴 포스트가 실수로 git에 포함되지 않도록 확인한다.

### 코드 이상 여부 확인 🕵️

- Liquid 템플릿에 난독화된 코드나 의미 불명의 문자열이 없는지 확인한다.
- 인라인 `<style>`, `style=""` 속성이 추가되지 않았는지 확인한다 (모든 스타일은 `assets/main.scss`에만 작성).
- `<script>` 내 `eval()` 또는 동적 코드 실행이 없는지 확인한다.
