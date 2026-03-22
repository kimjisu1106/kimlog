---
layout: post
title: 코드시트 ChordSheet 6
date: 2026-03-22
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

1. 편집 패널 전조 표시 개선: 현재 키 기준으로 표시·편집, 저장 시 역전조 처리
2. ChordPicker 내 마디 이동 방식 변경: 버튼 제거 → 좌우 스와이프로 전환 (애니메이션 포함)
3. 다중선택 UX 정리: 길게 누르기 → 다중선택 진입, drag&drop → 마디 이동 다이얼로그로 교체
4. 섹션 색상 영구 저장 및 사용자 색상 선택 기능 추가(8개 색상)

---

## 막힌 부분

1. 폰과 태블릿으로 볼 때 버튼 크기가 달라서 불편함
2. 섹션 색상이 현재는 8가지 색상을 제공하는데 사용자가 직접 고를 수 있도록 변경하기
3. 앱이 전체적으로 못생김

---

## 다음에 할 일

1. 기기에 따른 UI 최적화
2. 섹션 색상 Picker 만들기
3. UI/UX 개선하기