---
layout: post
title: 여둘까 Office Layout 5
date: 2026-06-23
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

- 도형·편집 기능 추가
	- 추가된 기능
		- 보조책상 바닥 반원화 — `ry`를 `h/2`(길쭉한 반타원)에서 `w/2`(정확한 반원)로
		- 프리셋 테두리 실선/점선 개별 설정 + 배치 후 속성 패널 색 변경 + 출입문 1/4 원(문 열림 호)
		- 아이템 좌우/상하반전 `flipX`/`flipY`
		- 그룹(다중) 반전 — 선택 전체 중심선 기준 미러
	- 이유: 사용하다보니 필요한 기능이 하나씩 생기는 중

---

## 다음에 할 일

- 프리셋 key를 `name-uuid8` 형식으로 변경 (localStorage 오버라이드 충돌 원천 차단)