---
layout: post
title: 코드시트 ChordSheet 4
date: 2026-03-20
categories:
  - android-studio
  - devlog
project: chord-sheet
project_name: 코드시트 ChordSheet
video_id:
app_url:
status:
---
## 오늘 한 일

1. 설정 UI 개편: 줄당 마디·글자 크기를 슬라이더 방식으로 교체
2. 글자 크기 변환 로직 적용, 섹션 바 높이 sp 기반으로 변경
3. ChordPicker UX 개선 (텍스트 중앙 정렬, 외부 탭 시 닫기)

---

## 막힌 부분

1. 마디 내 슬롯이 고정으로 한 마디에 8개로 정해져있어서 모바일 환경에서는 슬롯을 하나만 사용하더라도 나머지 7개 슬롯만큼 공간을 차지하게되어 코드가 ...으로 표기됨. text-size로 조절하는데 한계가 있음
2. 마디를 한번에 여러개 추가할 수는 있는데 여러개를 한번에 삭제할 수 없음

---

## 다음에 할 일

1. 설정 > 마디 갯수 조절 슬라이더 만들기(1~8. default 4)