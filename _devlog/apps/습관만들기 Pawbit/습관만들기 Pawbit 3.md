---
layout: post
title: 습관만들기 Pawbit 3
date: 2026-05-08
categories:
  - devlog
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
tags:
  - Flutter
  - Dart
---
## 오늘 한 일

- checkin_screen UX 개선
- 아카이브 기능 구현

---

## 막힌 부분

- 

---

## 다음에 할 일

- 습관 item detail 페이지
- monthly: calendar, yearly: 잔디(히트맵) 구현
- DogCareLog DAO + 강아지 상태 계산 로직 (경과일 기반)
- 홈 화면 케어 버튼 동작 연결 (밥/산책/목욕 → PointLedger 차감)
- 퍼즐/숲속 화면 (easy 난이도, 그림 선택 → 조각 채우기)
- 미래 날짜 체크인 허용 문제 고민하기 — 현재 `_isEditable`은 `diff >= 0`(오늘 포함)으로만 체크.