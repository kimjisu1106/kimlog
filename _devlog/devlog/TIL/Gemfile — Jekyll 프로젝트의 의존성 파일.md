---
layout: post
title: Gemfile — Jekyll 프로젝트의 의존성 파일
date: 2026-04-06
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
---
Jekyll은 Ruby로 만들어진 정적 사이트 생성기다.  
Ruby 프로젝트는 어떤 라이브러리(gem)를 어떤 버전으로 쓸지 **Gemfile**에 명시한다.
```ruby
source "https://rubygems.org"

gem "jekyll", "~> 4.3"
gem "kramdown-parser-gfm"
```

**GitHub Pages vs Netlify 차이**

| | GitHub Pages | Netlify |
|---|---|---|
| Jekyll 빌드 | 자체적으로 처리 | 직접 빌드 |
| Gemfile 필요 여부 | 없어도 됨 | **필수** |

GitHub Pages는 Jekyll을 내부적으로 알아서 처리해줬기 때문에 Gemfile 없이도 사이트가 빌드됐다.
Netlify는 빌드 환경을 직접 구성하므로, 어떤 gem을 쓸지 명시해줘야 한다.