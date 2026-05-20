---
layout: post
title: 아코디언(Accordiaon) UI를 펼친상태로 만들기
date: 2026-05-07
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - HTML
  - CSS
---
### 아코디언/토글

- HTML에는 `details`와 `summary`라는 아코디언(토글) 기능을 하는 기본 태그가 있고 여기에는 `open`이라는 기본 HTML 속성이 있다.
- 그러나 이 프로젝트에는 `button`과 `div`를 조합해 아코이 custom되어있고 class로 open, close를 제어한다(closed: `collapsed`, opened: `show`). 열고싶으면 `collapsed`를 제거하고 `show`를 붙인다. 닫고싶으면 반대로 `collapsed`를 붙이고 `show`를 제거
	- `collapsed`: `button`에 붙여서 아코디언이 닫혀 있다는 상태를 시각적으로 나타냄
	- `show`: `div`같은내용에 붙여서 `display:block` 처리
