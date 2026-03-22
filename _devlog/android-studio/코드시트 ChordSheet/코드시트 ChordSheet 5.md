---
layout: post
title: 코드시트 ChordSheet 5
date: 2026-03-21
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

1. 마디당 슬롯 수 설정 기능 추가 (1~8, default 4)
2. 다중선택 모드 팝업 기능 구현
	1. 길게 누르면 다중선택 모드. 다중선택 모드에서 선택된 마디를 클릭하면 팝업
	2. 팝업 내용: 섹션 변경, 마디 추가/삭제/이동

---

## 막힌 부분

1. 마디 이동이 drag&drop 방식으로 별도의 애니메이션이 없어서 이동이 된건지 만건지 확인이 어려웠고 정확하지 않음.
2. 코드를 입력하고 난 후 전조했을 때 ChordView에서는 전조된 코드가 보이는데 ChordPicker 패널에서는 원키가 표시되어 헷갈림

---

## 다음에 할 일

1. 마디 이동 명확히 하기
2. 전조 시에 ChordPicker에서도 전조된 키가 표시되도록 하기