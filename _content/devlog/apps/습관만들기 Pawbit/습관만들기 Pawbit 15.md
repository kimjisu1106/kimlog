---
layout: post
title: 습관만들기 Pawbit 15
date: 2026-07-11
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
description: 습관 완료 진동을 설정에서 켜고 끄게 하고, 강아지 알림 말투를 애칭형(구름이가)으로 다듬은 날.
tags:
  - Dart
  - Flutter
  - Riverpod
---
## 오늘 한 일

- 완료 진동 on/off 설정
	- `hapticEnabledProvider`(StateProvider, 기본 on) + `main()`에서 SharedPreferences `haptic_enabled` 값으로 override
	- 설정 「표시」 섹션에 토글 추가 — 끄면 prefs 저장 + provider 즉시 갱신
	- 습관 완료 시 `ref.read(hapticEnabledProvider)`로 게이팅해서 꺼져 있으면 진동 스킵
- 강아지 알림 조사 애칭형 — 받침 이름 뒤 조사를 `'이'` → `'이가'`로 (`구름` → `구름이가`), 더 귀여운 말투

---

## 막힌 부분

- 완료 진동을 어떻게 읽을지 — 설정값을 `watch`로 읽으면 값이 바뀔 때마다 화면이 rebuild되는데, 진동은 "완료를 누른 그 순간" 한 번만 필요하다
	- 지속 반영이 아니라 이벤트성이라 `ref.read`로 그 순간 스냅샷만 읽는 게 맞음 (불필요한 rebuild 없음)

---

## 다음에 할 일

- Asset 교체 — 마을 map, 숲 속, 리뮤
- DEV 패널 최종 삭제, 앱 아이콘/스토어 에셋, 개인정보처리방침
- 실기기 검증 — v7 색 변환, 보호 기간, 광고 3회 캡, 슬롯 게이트, 완료 진동 토글
