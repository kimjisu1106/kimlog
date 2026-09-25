---
layout: post
title: 여둘까 Office Layout 22
date: 2026-09-24
permalink: "tmq22t8q"
categories:
  - apps
  - log
project: office-layout
project_name: 여둘까 Office Layout
video_id:
app_url: https://office-layout.pages.dev
status: finished
description: 같은 원인으로 터졌던 세 경로 중 마지막 하나를 회귀 검사에 넣고, 그 검사가 정말 잡는지 일부러 깨뜨려 확인한 날.
tags:
  - JavaScript
---
## 오늘 한 일

- 방 면적 라벨 호버를 회귀 검사에 추가
	- 09-07에 import가 새어 나갔던 세 경로(측정선 호버·방 면적 라벨 호버·이름표 더블클릭) 중 검사가 없던 마지막 하나였다
	- 오류가 안 나는지만 보지 않고, 라벨에 마우스를 올리면 커서가 옮기기 모양으로 바뀌고 빠질 때 모드 커서로 돌아오는 것까지 본다
	- 전체 45건 통과

---

## 막힌 부분

### 검사가 통과했다고 그 검사가 잡는다는 뜻은 아니다

검사를 넣고 돌리니 바로 통과했다. 그런데 통과는 "지금 코드가 멀쩡하다"는 뜻이지 "고장 나면 이 검사가 잡는다"는 뜻이 아니다. 조건을 잘못 써서 항상 통과하는 검사였어도 화면에 보이는 결과는 똑같다.

그래서 일부러 깨뜨려 봤다. 09-07에 빠져 있던 그 import를 다시 빼고 돌리니 검사가 실패했다.

```text
FAIL · 점검이 중간에 끊김 — 평가 실패: ReferenceError: modeCursor is not defined
```

되돌린 뒤 다시 통과하는 것까지 확인했다.

- 해결: 새로 넣은 검사는 한 번은 일부러 실패시켜 본다. 실패를 못 봤으면 그 검사는 아직 아무것도 보증하지 않는다
- 남은 규칙: 검사 항목이 늘어날수록 "무엇을 밟았나"보다 "무엇을 잡나"를 확인하는 편이 값이 크다
