# KimLog - GitHub Pages Blog

## Project Overview
Obsidian으로 마크다운 문서를 작성 → 이 vault 폴더가 git 추적됨 → GitHub Desktop으로 commit → GitHub Pages에 배포되는 Jekyll 블로그.

## Stack
- **Jekyll** + **Minima** 테마 (GitHub Pages 기본 지원)
- **Obsidian** 으로 포스트 작성 (`_devlog/` 폴더)
- **GitHub Desktop** 으로 배포

## Structure
```
_config.yml          # 사이트 설정 (title, theme, collections, plugins)
_devlog/             # 포스트 원본 (Obsidian에서 작성)
  devlog/            # 카테고리: devlog
  tools/             # 카테고리: tools
  ue5/               # 카테고리: ue5
_includes/
  custom-head.html   # favicon 등 <head> 추가 요소
  youtube.html       # YouTube embed 인클루드
_data/
  sections.yml       # devlog.html 섹션 정의
assets/
  main.scss          # 전체 커스텀 CSS (여기에만 스타일 작성)
  images/            # profile.ico, profile.png 등
devlog.html          # Dev Log 목록 페이지
index.md             # 홈 (Latest DevLog + Latest Videos)
ue5.md               # UE5 페이지
tools.md             # Tools 페이지
about.md             # About 페이지
```

## CSS Rules
- **모든 스타일은 `assets/main.scss`에만 작성** (인라인 `<style>` 블록, `style=""` 속성 금지)
- 단위는 `px` 통일
- 색상은 CSS 변수 사용 (`--border-color`, `--btn-border`, `--muted` 등)
- 다크모드: `@media (prefers-color-scheme: dark)` 로 CSS 변수 오버라이드

## Post Frontmatter
```yaml
---
title: "포스트 제목"
date: 2025-01-01
categories: [devlog, ue5]   # devlog 필수, 카테고리 추가
status: public               # public 이어야 노출됨
project: "프로젝트명"         # devlog 그룹핑 기준
project_name: "표시할 이름"  # (선택) project와 다른 표시명
video_id: "YouTube ID"       # (선택) 있으면 홈 Latest Videos에 노출
---
```

## Key Constraints
- GitHub Pages는 허용된 플러그인만 사용 가능 (`jekyll-feed` 등)
- Minima 버전: `~> 2.5` (GitHub Pages 기본) — skin 기능 없음, 다크모드는 CSS 변수로 직접 처리
- `custom-head.html`은 Minima 2.5가 자동으로 include 함
