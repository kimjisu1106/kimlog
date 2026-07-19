---
layout: post
title: 습관만들기 Pawbit 16
date: 2026-07-11
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
description: Claude Design 리디자인을 로직 보존하며 3단계로 적용하고, 실기기로 그림자·도장·표지판을 2차 미세조정한 날.
tags:
  - Dart
  - Flutter
  - Riverpod
---
## 오늘 한 일

- Claude Design UI 리디자인 적용 (3단계)
	- 적용 전 6개 하위 에이전트로 파일별 대조 — "UI만 바뀌고 로직·Provider·DAO 호출은 보존"됐는지 검증 후 적용
	- 1단계: 습관폼·상점·타일·마을·온보딩 등 화면 교체, `tutorial_screen` 제거(온보딩 단일 흐름)
	- 2단계: 홈(케어 게이지·강아지 브레딩)·설정(카드화) 교체 — DEV 패널을 home에서 settings로 이동, 완료 진동 토글 유지
	- 3단계: 회고 뷰 요약 카드 + 연속 달성일 계산(`watchCompletionStreak`)
- 실기기 2차 미세조정
	- 홈: 그림자를 넓은 타원+블러로, 케어 버튼 크게, 상태 문구를 케어별로("배고파요"/"산책 가고 싶어요")
	- 타일: 완료 도장 밝은 배경 대비·1.5배, ⋮ 메뉴 시계와 상단 정렬, + 타일 점선 테두리
	- 회고: 통계(스트릭·조각)는 상단 유지, 강아지 총평 카드만 하단으로 분리
	- 마을: 강아지를 z-order 최상위로, 표지판 높이 버그 수정

---

## 막힌 부분

- 리디자인 교체본이 전날 만든 완료 진동 토글을 누락 — 파일 통째 교체라 일반 diff로는 안 잡혀서, 기능 단위 대조로 발견해 되살려 넣음
	- home·settings는 DEV 패널 이동 구조라 짝으로 적용해야 중복/누락이 안 생김
- 그림자가 점처럼 좁게 나옴 — `RadialGradient`의 radius가 박스 짧은 변 기준이라 132×24 박스에서 24 기준으로 계산돼 가운데만 채워짐 → 넓은 pill + `boxShadow` 블러로 교체
- 표지판이 화면 세로를 꽉 채움 — `Column`이 `mainAxisSize` 미지정(기본 max)이라 `Align`의 느슨한 제약에서 전체 높이로 팽창 → `min`으로 고정

---

## 다음에 할 일

- Asset 교체 — 마을 맵·리뮤·갤러리·숲속 (디자이너 대기, 마을은 표지판 임시)
- DEV 패널 최종 삭제, 앱 아이콘/스토어 에셋, 개인정보처리방침
- 실기기 검증 — 그림자·도장·표지판·회고 배치, 온보딩 단일 흐름
