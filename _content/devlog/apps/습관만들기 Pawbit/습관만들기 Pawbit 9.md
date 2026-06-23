---
layout: post
title: 습관만들기 Pawbit 9
date: 2026-06-23
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

- 아이콘
	- 강아지 돌보는 아이콘 크기 조절 및 센터 정렬
	- 코인 아이콘, 꿈조각 아이콘 변경
- 갤러리
	- 액자레일 형태로 변경. 관객 애니메이션 제거
		- 이유: 유저 체류시간 대비 구현도 복잡하고 관객 에셋 추가 제작 필요
- 퍼즐 조각 배치 애니메이션 개선
	- 이유: 퍼즐 배치 버튼 누르면 애니메이션 끝날 때까지 비활성화되어 UX 답답함
	- 방안: 연타로 눌러도 적용되도록 개선

---

## 막힌 부분

- 퍼즐 배치 버튼 누르면 애니메이션 끝날 때까지 비활성화되어 UX 답답함
	- 중간: fire-and-forget으로 fly 취소하고 새 fly 시작 → 취소된 조각이 사라져버림
	- 이후: 큐 방식 도입 (fly→burst→reveal 순서 보장) → 소모는 되는데 한 개씩만 돌아감
	- 최종: 각 조각이 자체 controller를 가져 완전히 독립 실행
- 전체적으로 진행 속도가 느려진 것 같아서 프로젝트 진행을 빠뜨리지 않고 잘 챙겨야 할 것 같다

---

## 다음에 할 일

- Asset 교체
	- 숲속: 요정, 요정 상점 bg(16:9)
	- 마을: 마을 bg 16:9
	- 상점: 상인, 상점 bg(16:9), 슬롯 item, 수정권 item
	- 갤러리: 액자 frame