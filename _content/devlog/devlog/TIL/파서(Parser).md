---
layout: post
title: 파서(Parser)
date: 2026-04-06
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
**파서(Parser)** 는 텍스트를 읽고 의미 있는 구조로 변환하는 프로그램.

Jekyll 기준으로 보면:

- **kramdown** → 기본 파서, 순수 Markdown을 HTML로 변환
- **kramdown-parser-gfm** → kramdown에 GFM 문법도 이해할 수 있게 추가해주는 확장

마크다운 파일은 결국 그냥 텍스트인데 그걸 보고 HTML로 바꿔주는게 파서의 역할.

```
- [ ] 할 일   →   파서   →   <input type="checkbox"> 할 일
**굵게**      →   파서   →   <strong>굵게</strong>
```

GFM 문법(`- [ ]`, 표 등)은 kramdown이 모르는 문법이라, kramdown-parser-gfm이라는 gem을 추가해줘야 "아 이게 체크박스구나" 하고 변환(파싱)할 수 있다.