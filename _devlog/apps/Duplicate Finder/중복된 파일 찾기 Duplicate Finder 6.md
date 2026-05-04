---
layout: post
title: 중복된 파일 찾기 Duplicate Finder 6
date: 2026-03-29
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

1. 처리 중/삭제 중 모달 아이콘 적용 (`gui/result_panel.py`)
	- "삭제 중..." / "처리 중..." 두 `Toplevel` 다이얼로그에 앱 아이콘 적용
	- `sys._MEIPASS` 패턴으로 PyInstaller 환경과 개발 환경 모두 대응
	- `import sys` 추가
 2. 스캔 중 설정 위젯 비활성화 (`gui/scan_panel.py`)
	- 스캔 시작 시 아래 위젯 전체 비활성화:
	    - 폴더 선택 버튼
	    - 하위 폴더 포함 체크박스
	    - 파일 종류 체크박스 (이미지 / 영상 / 오디오 / 전체 파일)
	    - 유사 이미지 검색 체크박스 + 민감도 슬라이더
	    - 언어 전환 버튼
	- 스캔 종료 시 모든 위젯 복원 (`_on_all_files_toggle()` 호출로 전체 파일 모드 상태에 따라 올바르게 복원)
	- 폴더 선택 버튼(`_folder_btn`), 하위 폴더 체크박스(`_recursive_cb`)를 인스턴스 변수로 저장

---

## 막힌 부분

1. 

---

## 다음에 할 일

1. 