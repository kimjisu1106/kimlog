---
layout: post
title: 코드시트 ChordSheet 4
date: 2026-03-20
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

1. 설정 UI 개편: 줄당 마디·글자 크기를 슬라이더 방식으로 교체
2. 글자 크기 변환 로직 적용, 섹션 바 높이 sp 기반으로 변경
3. ChordPicker UX 개선 (텍스트 중앙 정렬, 외부 탭 시 닫기)

---

## 막힌 부분

1. 마디 내 슬롯이 고정으로 한 마디에 8개로 정해져있어서 모바일 환경에서는 슬롯을 하나만 사용하더라도 나머지 7개 슬롯만큼 공간을 차지하게되어 코드가 ...으로 표기됨. text-size로 조절하는데 한계가 있음
2. 마디를 한번에 여러개 추가할 수는 있는데 여러개를 한번에 삭제할 수 없음
3. 마디 이동이 drag&drop 방식으로 별도의 애니메이션이 없어서 이동이 된건지 만건지 확인이 어려웠고 정확하지 않음.
4. 코드를 입력하고 난 후 전조했을 때 ChordView에서는 전조된 코드가 보이는데 ChordPicker 패널에서는 원키가 표시되어 헷갈림

---

## 다음에 할 일

1. 설정 > 마디 갯수 조절 슬라이더 만들기(1~8. default 4)
2. 마디 선택 > 여러개 한번에 삭제 기능
3. 마디 이동 방식 개선
4. 전조에 대한 부분 개선