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
  tools/             # 카테고리: tools
  ue5/               # 카테고리: ue5
  android-studio/    # 카테고리: android-studio
  today-i-learn/     # 카테고리: today-i-learn
_includes/
  head.html          # Minima head 오버라이드 (favicon 포함)
  youtube.html       # YouTube embed 인클루드
_data/
  sections.yml       # devlog.html 섹션 정의
assets/
  main.scss          # 전체 커스텀 CSS (여기에만 스타일 작성)
  images/            # profile.ico, profile.png (favicon으로 사용)
devlog.html          # Dev Log 목록 페이지 (project별 그룹핑)
til.html             # TIL 목록 페이지 (project별 그룹핑)
android-studio.html  # Android Studio 페이지
ue5.html             # UE5 페이지
tools.html           # Tools 페이지
index.html           # 홈 (Latest DevLog + Latest Videos)
about.html           # About 페이지
.gitignore           # **/draft-*.md 제외
```

## Page File Convention

- 모든 페이지 파일은 `.html` 확장자 사용
- HTML+Liquid로만 구성 → `.md`로 하면 Markdown 파서가 HTML 구조 훼손할 수 있음
- `index.html`, `about.html` 포함 전체 통일

## CSS Rules

- **모든 스타일은 `assets/main.scss`에만 작성** (인라인 `<style>` 블록, `style=""` 속성 금지)
- 단위는 `px` 통일
- 색상은 CSS 변수 사용 (`--border-color`, `--btn-border`, `--muted`, `--devlog-*` 등)
- 다크모드: `@media (prefers-color-scheme: dark)` 로 CSS 변수 오버라이드
- `hr`: `margin-top: 32px; margin-bottom: 32px` 전역 적용
- `.post-content h3`: `font-size: 1.5em; font-weight: 600` (h2와 동일하게)

## Link Style Convention

- 모든 페이지의 포스트 링크는 `font-weight: 600` 이상
- `devlog.html`, `til.html`, `android-studio.html`, `ue5.html`, `tools.html`의 리스트 링크는 `<ul class="devlog-list">` + `<a>` 태그 사용 → `.devlog-list a { font-weight: 600 }` 적용
- `about.html` 링크는 `.contact-row a { font-weight: 700 }` 적용
- Minima의 `.post-link` 클래스는 `display: block` 등 레이아웃 스타일이 붙어 있어 커스텀 레이아웃에서 사용 금지

## Post List Pages (android-studio.html, ue5.html, tools.html)

`<h2>Projects</h2>` + `<h2>Dev Log</h2>` 섹션 구조, 리스트는 HTML 사용:

```html
<ul class="devlog-list">
  {% for post in posts %}
  <li>
    {{ post.date | date: "%Y-%m-%d" }} ｜
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
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
categories: [devlog, ue5] # devlog 필수, 카테고리 추가 (ue5 | android-studio | tools | today-i-learn)
status: public # public 이어야 노출됨
project: "프로젝트명" # devlog 그룹핑 기준
project_name: "표시할 이름" # (선택) project와 다른 표시명
video_id: "YouTube ID" # (선택) 있으면 홈 Latest Videos에 노출
---
```

## Key Constraints

- GitHub Pages는 허용된 플러그인만 사용 가능 (`jekyll-feed` 등)
- Minima skin 기능 없음 → 다크모드는 CSS 변수 + `prefers-color-scheme`으로 직접 처리
- Favicon: `_includes/head.html` 직접 오버라이드 방식 사용 (`custom-head.html` include 방식은 Minima 버전에 따라 불안정)
