---
layout: post
title: 습관만들기 Pawbit 18
date: 2026-07-21
permalink: "9kzybkyk"
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
description: 아플 때 정상 그림이 나오던 버그를 상황에 맞는 폴백 그림으로 메우고, 디자이너 아트를 기다리는 마을·상점을 마커를 남긴 임시 카드 목록으로 돌린 날.
tags:
  - Dart
  - Flutter
---
## 오늘 한 일

- 아플 때 정상 그림 나오던 버그 수정
	- 코드는 `assets/dog/state_Sick.png`를 참조하는데 그 파일이 처음부터 없었음 → `errorBuilder`가 `state_Normal`(건강한 그림)로 폴백해서 "아파요"인데 멀쩡해 보임
	- `_BreathingDog`에 `fallbackPath`를 받아, 아플 땐 원인 케어(food/walk/bath 3단계)의 `Heavily*` 그림으로 폴백. `state_Sick.png` 경로 참조는 유지해 에셋만 넣으면 즉시 적용
- 마을을 임시 카드 목록으로
	- 디자이너 맵 대기 → 지도 대신 목적지 카드 3개(숲속·상점·갤러리) `ListView`
	- 지도 좌표계 + 점선 트랙 + 강아지 산책 구현은 `village_map_screen.dart`의 `VillageMapScreen`으로 보관(라우팅만 제거, 컴파일은 유지)
- 숲속(리뮤 상점)도 카드 목록으로
	- 리뮤 배경(`remu_store.png`)·캐릭터(`remu.png`)·요정 멘트 전부 숨김, `AppBar` + 액션 카드 3개만
	- 숨긴 지점마다 `[리뮤 숨김]` 마커 주석 → 검색 한 번으로 복원
- 온보딩 정리 — `_RemuHero`가 `remu.png`를 그대로 띄우고 있어 세계수 아이콘으로 대체, "레무" 표기 4곳을 "리뮤"로 통일

---

## 막힌 부분

- 멘트를 빼자 `_message`·`_messages`·`_SpeechBubble`·`dart:math`가 줄줄이 미사용이 되어 `unused_element`/`unused_field`/`unused_import` 경고 발생
	- 딸린 선언까지 같이 주석 처리해야 analyze가 깨끗해짐. 각 지점에 마커를 달아 복원 비용을 낮춤
	- `_onRename`의 멘트 갱신 `setState`는 제거해도 무해 — 이름은 `dogNameProvider`가 갱신
- "아픈 그림이 원래 있었던 것 같다" → 저장소 전체·모든 git 히스토리를 뒤졌지만 `state_Sick.png`은 존재한 적 없음. 기능 도입 커밋이 6종만 추가하고 Sick은 빠뜨린 것

---

## 다음에 할 일

- 강아지 아픔 일러스트 제작 (`state_Sick.png` — 넣기만 하면 적용)
- 디자이너 마을 맵 / 리뮤 아트 대기 → 나오면 보관본·마커로 복원
- DEV 패널 최종 삭제, 앱 아이콘/스토어 에셋, 실기기 검증
