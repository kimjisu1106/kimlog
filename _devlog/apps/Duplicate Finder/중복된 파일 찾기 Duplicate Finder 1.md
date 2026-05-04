---
layout: post
title: 중복된 파일 찾기 Duplicate Finder 1
date: 2026-03-22
categories:
  - devlog
  - apps
project: duplicate-finder
project_name: 중복된 파일 찾기 Duplicate Finder
video_id:
app_url: https://github.com/kimlog0415/DuplicateFinder/releases
status: finished
tags:
  - Python
---
## 오늘 한 일

1. 앱 전체 초기 구현 (스캔 엔진, GUI 기본 구조)
2. 개별 카드 삭제 버튼 추가 → 바로 제거하고 일괄 삭제로 교체
3. 폰트 theme.py 중앙 관리로 리팩토링
4. 대용량 폴더 대응 (일시중지/재개, 50개 카드 상한)
5. 삭제 진행 다이얼로그 추가
6. 영상 파일 지원 추가

---

## 막힌 부분

1. 다중 선택 시 마우스 휠 스크롤이 안됨

---

## 다음에 할 일

1. 오디오 파일 지원
