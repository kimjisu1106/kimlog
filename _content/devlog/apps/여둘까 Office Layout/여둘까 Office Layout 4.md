---
layout: post
title: 여둘까 Office Layout 4
date: 2026-06-21
categories:
  - apps
  - log
project: office-layout
project_name: 여둘까 Office Layout
video_id:
app_url: https://office-layout.pages.dev
status: finished
tags:
  - JavaScript
  - HTML
---
## 오늘 한 일

- 내보내기 아이콘을 ⏏️ 이모지로 변경
	- 이유: 기존 아이콘이 png로 내보내기용 아이콘이라 변경함
- 단일 `index.html` → `index.html` + `style.css` + `app.js` 분리
	- 이유: 로컬 더블클릭 사용자가 없고 기능이 늘어남에 따라 유지보수를 위해 분리. `app.js`는 `type="module"`이라 http(s)에서만 동작