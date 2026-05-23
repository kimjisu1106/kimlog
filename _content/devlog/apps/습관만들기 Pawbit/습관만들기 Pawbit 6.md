---
layout: post
title: 습관만들기 Pawbit 6
date: 2026-05-20
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
tags:
  - Dart
  - Flutter
  - Drift
---
## 오늘 한 일

- 케어 버튼 이모지 → PNG 아이콘 교체
	- 밥/산책/목욕 버튼의 이모지를 디자인 에셋으로 교체.
	- `assets/icons/` 디렉토리 추가 및 `pubspec.yaml` 등록
	- `_CareButton` 위젯 `emoji: String` → `iconAsset: String`으로 교체
	- 비활성 상태에서 `BlendMode.srcIn`으로 회색 틴트 처리
- 강아지 이름 변경 기능 추가
- 요일 설정을 일-토, 월-일 중 고를 수 있도록 수정
	- `DateTime weekStart` 대신 `int offset` 저장. 설정 변경 시 자동 재계산.

---

## 막힌 부분

1. `TextEditingController` — BottomSheet에 외부에서 넘기고 `await` 후 `dispose`하면 assertion 터짐. 내부 `StatefulWidget`에서 생성·소멸해야 안전.
2. 이름 변경 시 키보드 때문에 화면 침범. BottomSheet + 키보드 — `isScrollControlled: true` + `MediaQuery.viewInsetsOf(ctx).bottom` 패딩 설정.
3. `ProviderScope` override — `main()`에서 SharedPreferences 읽어 Provider 초기값 주입.
4. Flutter 에셋 캐시 — 이미지 파일 교체 시 hot restart 부족, `flutter clean` 필요.

---

## 다음에 할 일

- 퍼즐 드래그 배치 방식 고민하기
- 퍼즐 그림 선택 화면 고도화
  - 앱 제공 이미지 목록 표시 (현재는 하드코딩)
  - 이미 완성한 그림은 선택 불가
  - 완성 날짜(completedAt) 표시
