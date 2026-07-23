---
layout: post
title: 습관만들기 Pawbit 17
date: 2026-07-12
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
description: 디자이너 마을 맵 대기 중 배경을 점선 트랙 지도로 임시 재구성하고, 표지판·강아지·트랙 좌표계를 하나로 통일한 날.
tags:
  - Dart
  - Flutter
---
## 오늘 한 일

- 마을 화면 트랙 재구성 (배경 임시 숨김)
	- 디자이너 `village_map.png` 대기 → 배경을 단색으로 비우고 집→표지판 점선 트랙 3개로 지도 대체
	- 표지판(숲속·상점·갤러리) 탭 → `_goTo(target, dest)`: 강아지가 트랙 따라 800ms 걷기 → 화면 push → 복귀 시 집으로 다시 걸어옴
	- 좌표 통일 — 표지판·집·강아지·트랙이 전부 `toPx((x+1)/2·size)` 하나를 공유, 표지판/집은 `at()` 헬퍼(`Positioned` + `FractionalTranslation`)로 중심 앵커

---

## 막힌 부분

- 트랙과 표지판이 어긋남(특히 오른쪽 상점) — 표지판은 `Align`이라 `(x+1)/2·(W−cardW)`에 놓이는데 트랙은 `toPx`로 `(x+1)/2·W`를 써서 x가 클수록 벌어짐
	- 표지판·집도 `toPx` + `FractionalTranslation`으로 놓아 같은 좌표계로 통일
- 화면이 텅 빔 — 표지판/집을 `Align`→`Positioned`로 바꾸니 Stack에 크기를 주던 비배치 자식이 사라져 상단 칩 높이로 collapse, 나머지가 clip
	- `SizedBox.expand`로 Stack을 감싸 화면 전체를 차지하게 함

---

## 다음에 할 일

- 디자이너 마을 맵 들어오면 배경 복원 (트랙은 유지 검토)
- DEV 패널 최종 삭제, 앱 아이콘/스토어 에셋, 실기기 검증
