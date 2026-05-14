---
layout: post
title: 습관만들기 Pawbit 5
date: 2026-05-10
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

### 퍼즐 그림 선택 고도화 + 온보딩 포인트 지급 + DEV 툴 정리 + 뒤로가기 종료 확인

- 완성된 퍼즐 이미지 회색 처리 + 완성일 배지
	- 이미 완성된 것은 다시 선택 못하게 하기 위함
	- 추후 구현될 연도별 결산에 사용하기 위함
- 온보딩 완료 시 initialPoint 지급 로직 연결
	- 처음 한 번만 지급되도록 하기 위함
- DEV 버튼 "케어 -1일" 단일 버튼으로 교체 + 온보딩 초기화 버튼 추가
	- -2일, -5일, -10일 이렇게 날짜가 지정되어있다보니 로직 상 배고픔에 의한 상태변화 말고는 체크할 수 없음 & 레이아웃 경고 발생. 
	- 온보딩 개선된 경우 확인하기 위함
- Android 뒤로가기 → "앱 종료?" 다이얼로그 (`PopScope`)
	- 종료하려던게 아니었는데 종료되버려서 추가함

---

### 튜토리얼 + 강아지 이름 설정 + initialPoints SnackBar

- 튜토리얼 4페이지 (`PageView`)
- 스킵 다이얼로그 → 이름 입력 페이지로 점프
- 강아지 이름 저장 (`SharedPreferences` + `dogNameProvider`)
- 완료 후 SnackBar

---

### 체크인 다중 뷰 (일간/주간/월간/연간) + 요일 일-토 통일

- `TabBar` 4탭으로 분리 (기존 일간 + 주간/월간/연간 신규)
- 주간: 습관×요일 그리드, ⭐ best day / 🏅 best week, marquee 애니메이션
- 월간: 일-토 달력, 날짜 셀에 donut 그래프, 탭 → 일간 이동
- 연간: GitHub 스타일 히트맵 (전체 + 습관별), createdAt 기준 회색/컬러 구분
- 요일 표시 일-토 통일 (`kDayLabels`, `weekdayToColumnIndex`)

---

## 막힌 부분

- 

---

## 다음에 할 일

- 퍼즐 드래그 배치 방식 고민하기
- 퍼즐 그림 선택 화면 고도화
	- 앱 제공 이미지 목록 표시 (현재는 하드코딩)
	- 이미 완성한 그림은 선택 불가
	- 완성 날짜(completedAt) 표시

  