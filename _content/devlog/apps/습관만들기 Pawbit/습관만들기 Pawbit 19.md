---
layout: post
title: 습관만들기 Pawbit 19
date: 2026-07-25
permalink: "6j8dseej"
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
description: 습관 타일의 배경·테두리 역할을 뒤집어 흰색까지 수용하고, 꿈 조각이 부족할 때 광고로 무료 치료하는 구제 경로를 붙인 날.
tags:
  - Dart
  - Flutter
---
## 오늘 한 일

- 습관 타일 배경·테두리 역할 뒤집기
	- 배경을 습관 색으로 칠하던 걸 배경 항상 흰색 + 지정 색 2.5px 테두리로 (`paw_tile`)
	- 배경이 고정 흰색이라, 완료 도장의 밝기 분기(`onLightTile` luminance 체크)를 제거하고 고정 진갈색으로 단순화
- 조각 부족 시 광고 치료 (구제용)
	- 아픈데 꿈 조각 < `vetCostPieces`(5)면 숲속 치료 버튼이 "광고 보고 치료"로 → rewarded 광고 1회 → `fairyHeal(pieceCost: 0)`로 무료 완치
	- 상점 `RewardedAd` 패턴 재사용. 막힘 해소 목적이라 일일 광고 캡(`adDailyLimit`) 미적용
- 주간 완료 발바닥 대비 개선
	- 처음엔 외곽선(뒤에 큰 검정 발바닥) → 투박해서 폐기
	- 선택 색보다 진한 원 + 그 위 선택 색 발바닥으로 (흰색 습관도 명도 차로 보임)

---

## 막힌 부분

- 광고를 조기 종료(리워드 미획득)하면 `onUserEarnedReward`가 안 불려 치료 오버레이가 걸릴 수 있음
	- `onAdDismissedFullScreenContent`에서 상태(`_isTreating`)를 복구해 오버레이가 안 남게 처리
- `flutter install`이 빌드 없이 release APK를 찾다 실패하며 기존 앱을 먼저 삭제해 테스트 데이터가 날아감
	- 이후 `flutter build apk --debug` → `adb install -r`로 설치했는데 코드 변경이 반영 안 됨(debug APK는 `flutter run` 연결 전제) → 단독 설치는 `--profile`/`--release`가 맞음

---

## 다음에 할 일

- 광고 보고 치료 UI 다듬기 (기능은 동작, 버튼·안내가 투박함)
- 강아지 아픔 일러스트(`state_Sick.png`), 디자이너 마을 맵·리뮤 아트 대기
- DEV 패널 최종 삭제, 앱 아이콘/스토어 에셋
