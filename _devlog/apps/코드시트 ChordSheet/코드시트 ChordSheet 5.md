---
layout: post
title: 코드시트 ChordSheet 5
date: 2026-03-21
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

1. 마디당 슬롯 수 설정 기능 추가 (1~8, default 4)
2. 다중선택 모드 팝업 기능 구현
	1. 길게 누르면 다중선택 모드. 다중선택 모드에서 선택된 마디를 클릭하면 팝업
	2. 팝업 내용: 섹션 변경, 마디 추가/삭제/이동
3. 편집 패널 전조 표시 개선: 현재 키 기준으로 표시·편집, 저장 시 역전조 처리
4. ChordPicker 내 마디 이동 방식 변경: 버튼 제거 → 좌우 스와이프로 전환 (애니메이션 포함)
5. 다중선택 UX 정리: 길게 누르기 → 다중선택 진입, drag&drop → 마디 이동 다이얼로그로 교체
6. 섹션 색상 영구 저장 및 사용자 색상 선택 기능 추가(8개 색상)

---

## 막힌 부분

1. 폰과 태블릿으로 볼 때 ChordPicker and BaseOverlay의 버튼 크기가 달라서 불편함
2. 섹션 색상이 현재는 8가지 색상을 제공하는데 사용자가 직접 고를 수 있도록 변경하기
3. 앱이 전체적으로 못생김

---

## 다음에 할 일

1. 기기에 따른 UI 최적화
2. 섹션 색상 Picker 만들기
3. UI/UX 개선하기