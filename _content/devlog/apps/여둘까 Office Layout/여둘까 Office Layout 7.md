---
layout: post
title: 여둘까 Office Layout 7
date: 2026-06-30
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

- 프리셋 key를 이름 무관 고정 8자리 ID로 변경
	- 기존엔 key가 `cat/name`(예: `책상/의자`)이라, 프리셋 모양을 바꾸면 옛 localStorage 오버라이드가 새 기본값을 덮어써 도형이 찌그러지는 사고가 났다(출입문 사각형→1/4원 때 겪음)
	- 각 프리셋에 이름과 무관한 고정 8자리 ID(예: `4d9f6b31`)를 부여 → 이름을 바꿔도 매핑이 유지되고, 모양을 크게 바꿀 땐 이 key만 갈면 옛 오버라이드가 자동으로 무시됨
	- 이름 prefix(`의자-4d9f6b31`)도 고려했지만, rename하면 prefix가 거짓(stale)이 돼 순수 ID로 결정
	- 부작용: 기존에 사용자가 편집해둔 프리셋 값은 1회 기본값으로 복귀(이미 배치된 가구는 그대로). 사용자가 적은 지금 처리해 피해 최소
- 이유: 무엇보다, key가 곧 이름이라 출입문 모양을 바꾸려니 이름을 '출입문'으로 깔끔하게 못 하고 '출입문-호'처럼 억지로 바꿔야 했다. 이름과 key를 떼니 이름은 이름대로 두고 key(ID)만 갈면 됨

---

## 다음에 할 일


