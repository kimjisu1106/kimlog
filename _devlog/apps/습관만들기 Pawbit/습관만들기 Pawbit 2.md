---
layout: post
title: 습관만들기 Pawbit 2
date: 2026-05-06
categories:
  - devlog
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
tags:
---
## 오늘 한 일

- 홈 화면 & 잔고 표시 개선
	- HomeScreen 사용자의 포인트/조각(piece) 잔고가 변할 때마다 화면에 바로 반영되도록 고침
	- `StatelessWidget` → `ConsumerWidget` 전환해서 데이터 변화 시 즉시 반영
	- `pieceBalanceProvider`, `pointBalanceProvider`를 `game_providers.dart`로 분리해 홈/체크인 화면이 같은 프로바이더를 공유해 데이터 변화 시 즉시 반영
- `habit_dao` 보강
	- `PointLedger`를 `@DriftAccessor`에 추가, build_runner 재실행
	- `upsertCheckIn` 버그 수정: `insertOnConflictUpdate` → `DoUpdate(target: [habitId, date])` — PK가 아닌 custom unique key로 conflict 감지
	- `watchPointBalance`, `getPointBalance` 추가해서 포인트 잔고를 실시간으로 지켜보고 가져옴
	- `watchCheckInsForDateRange` 추가 (주간 헤더용 한 방 쿼리)
- 체크인 주간 캘린더 헤더
	- `ConsumerStatefulWidget`으로 전환, `_selectedDate` 로컬 상태
	- `_weekCheckInsProvider`: 오늘 ±3일 범위를 스트림 1개로 구독 (7번 쿼리 안 하고)
	- `habitsForDateProvider.family`: 날짜 파라미터로 그 날의 HabitWithStatus 목록 반환
	- `_WeekHeader` + `_DonutDay` + `_DonutPainter` (CustomPainter): 도넛 링 작성
	- 오늘/어제만 편집 가능, 이전 날짜는 타일 opacity 60% + onTap null

---

## 막힌 부분

- complete된 것을 다시 눌렀을 때 꿈 조각이 있음에도 complete 해제가 안됨(complete 해제할 경우 얻은 꿈조각 1개 반환하게 해둠. 따라서 0 이하면 반환이 안되는게 맞고 그 경우 알람 뜨게 함). custom unique key를 사용하는데 `insertOnConflicUpdate` 방식이 적용되어 생긴 문제. `Doupdate`로 해결.
	- custom unique key를 사용하는 이유: 같은 습관이 같은 날 복수로 생성되는 것을 막기 위함.

---

## 다음에 할 일

- 습관 item detail 페이지
- monthly: calendar, yearly: 잔디(히트맵) 구현
- DogCareLog DAO + 강아지 상태 계산 로직 (경과일 기반)
- 홈 화면 케어 버튼 동작 연결 (밥/산책/목욕 → PointLedger 차감)
- 퍼즐/숲속 화면 (easy 난이도, 그림 선택 → 조각 채우기)
- 미래 날짜 체크인 허용 문제 고민하기 — 현재 `_isEditable`은 `diff >= 0`(오늘 포함)으로만 체크.