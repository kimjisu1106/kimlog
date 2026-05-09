---
layout: post
title: 코드시트 ChordSheet 6
date: 2026-03-22
categories:
  - devlog
  - apps
project: chord-sheet
project_name: 코드시트 ChordSheet
video_id:
app_url:
status:
tags:
  - Flutter
---
## 오늘 한 일

1. 기기에 따른 UI 최적화
2. UI/UX 개선하기
	1. 버튼 크기 및 style 변경
	2. Chip 구성 일부 변경(중복된 dim7 삭제, 누락된 9, ♭11, 13, #13 추가) 및 스와이프 기능 추가

---

## 막힌 부분

1. 스와이프 위/아래로 ChordChip 변경을 했는데 제대로 select되지 않음. 가령 11에서 위로 스와이프 하면 # 11이 남아야하는데 11로 남음.

---

## 다음에 할 일

1. UI/UX 개선하기
	1. 스와이프 기능 개선
2. 섹션 색상 Picker 만들기