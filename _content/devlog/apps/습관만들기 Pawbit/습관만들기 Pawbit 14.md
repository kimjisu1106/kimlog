---
layout: post
title: 습관만들기 Pawbit 14
date: 2026-07-10
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
description: 무료 9칸을 다 채웠을 때만 슬롯 광고 버튼이 열리게 하고, 비활성 사유를 '슬롯 여유'와 '내일 다시'로 구분한 날.
tags:
  - Dart
  - Flutter
  - Riverpod
---
## 오늘 한 일

- 슬롯 구매 게이트 — 빈 슬롯이 없을 때만(모든 칸을 다 채웠을 때만) 슬롯 광고 버튼 활성화
	- `freeHabitSlots = 9`라, 활성 습관 9개를 다 채워 10번째가 필요할 때 열림
	- `slotInfoProvider`의 `used >= total`로 판정 — 무료 9칸이든 구매로 늘린 총량이든 한 조건으로 커버
	- 비활성 사유 구분 — 빈 슬롯 남음 → `슬롯 여유`, 광고 한도 소진 → `내일 다시` (`_adCard`에 `disabledLabel` 추가)

---

## 막힌 부분

- 비활성 사유 우선순위 — `used < total`(빈 슬롯 남음)과 광고 소진 두 조건이 겹칠 때 어느 라벨을 보여줄지 정해야 했음
	- 빈 슬롯이 남은 게 더 근본 사유라 `!slotFull`을 우선해 `슬롯 여유`를 먼저 노출
	- `disabledLabel` 기본값을 `내일 다시`로 둬서 기존 카드(보너스 포인트·수정권)는 그대로 두고 슬롯 카드만 덮어씀

---

## 다음에 할 일

- Asset 교체 — 마을 map, 숲 속, 리뮤
- DEV 패널 최종 삭제, 앱 아이콘/스토어 에셋, 개인정보처리방침
- 실기기 검증 — v7 색 변환, 신규 보호 기간, 광고 3회 캡, 슬롯 게이트
