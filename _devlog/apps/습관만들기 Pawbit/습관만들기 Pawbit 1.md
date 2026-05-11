---
layout: post
title: 습관만들기 Pawbit 1
date: 2026-05-05
categories:
  - devlog
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:

  - Flutter
  - Dart
  - Drift
tags:
  - Flutter
  - Dart
---
## 오늘 한 일

- Flutter 프로젝트 초기 셋업 + GitHub private repo 연결
- Drift DB 스키마 6개 테이블 확정 + build_runner 코드 생성
- HabitDao 구현 (체크인 upsert, 꿈 조각 잔고 스트림, 퍼즐 조각 배치 등)
- 온보딩 화면 3장 (SharedPreferences `is_onboarded` 플래그)
- 메인 스캐폴드 — 하단 탭 3개 (습관/홈/마을), IndexedStack
- 오늘의 체크인 화면 — 목록 표시, 체크 토글, 꿈 조각 잔고 검증 (0 미만 해제 차단)
- 습관 CRUD — 추가/수정/아카이브, 색깔·요일 선택
- 홈/마을 화면 뼈대
- 체크 토글 즉시 반영 버그 수정 (StreamProvider 분리 패턴으로 해결)
- 실제 기기 실행 확인

---

## 막힌 부분

- 아직 익숙하지 않은 용어들이 있어서 공부 중

---

## 다음에 할 일

- 습관 item detail 페이지 + 잔디(히트맵) 구현
- HomeScreen — 포인트/꿈 조각 실시간 반영 (현재 0 하드코딩)
- DogCareLog DAO + 강아지 상태 계산 로직 (경과일 기반)
- 홈 화면 케어 버튼 동작 연결 (밥/산책/목욕 → PointLedger 차감)
- 퍼즐/숲속 화면 (easy 난이도, 그림 선택 → 조각 채우기)