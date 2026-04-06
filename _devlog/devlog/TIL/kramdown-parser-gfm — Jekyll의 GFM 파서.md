---
layout: post
title: kramdown-parser-gfm — Jekyll의 GFM 파서
date: 2026-04-06
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
Jekyll은 기본적으로 **kramdown**으로 마크다운을 파싱한다.  
그런데 kramdown만으로는 GitHub Flavored Markdown(GFM)의 일부 문법을 처리하지 못한다.

**Markdown**
- 2004년에 John Gruber가 만든 경량 마크업 언어.
- **GFM** → GitHub가 Markdown을 확장한 버전.
- Obsidian에서 사용해 익숙한 것들이 사실 순수 마크다운의 확장버전이었다.

**GFM에만 있는 문법들**

- 체크박스: `- [ ]`, `- [x]`
- 표: `| col | col |` / `|---|---|`
- 코드 펜스: ` ``` `

이 문법들을 Jekyll이 올바르게 렌더링하려면 `kramdown-parser-gfm` gem이 필요하다.
```ruby
# Gemfile
gem "kramdown-parser-gfm"
```
```yaml
# _config.yml
markdown: kramdown
kramdown:
  input: GFM
```

**GitHub Pages vs Netlify 차이**

GitHub Pages는 이 gem을 기본으로 내장하고 있어서 따로 선언하지 않아도 됐다.  
Netlify는 직접 빌드하므로 Gemfile에 명시해줘야 한다.