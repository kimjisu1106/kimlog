---
layout: post
title: 중복된 파일 찾기 Duplicate Finder 5
date: 2026-03-28
categories:
  - devlog
  - apps
project: duplicate-finder
project_name: 중복된 파일 찾기 Duplicate Finder
video_id:
app_url: https://github.com/kimlog0415/DuplicateFinder/releases/download/v1.0.0/DuplicateFinder.exe
status: finished
---
## 오늘 한 일

1. UX 수정
	1. scan_panel.py 위젯 Top 정렬 통일(anchor='n'), 민감도(라벨+슬라이더) 수직 위치 조정`pady`
2. 폴더 내 모든 파일에 대한 MD5 비교 가능한 기능 추가
	1. 회사에 중복된 캐드파일이 많아서 그 때 사용하려고 확장자 상관 없이 MD5 비교하는 기능을 추가했다.
3. 최종 코드 검토
	1. 중복 코드
		1. `result_panel.py` 원본 파일 판별 점수 계산 로직이 중복됨(단일 그룹 / 일괄 처리에서 각각 쓰임) → `score()` 함수를 모듈 레벨 `_score_file(fp)`로 추출해서 양쪽에서 호출하는 방식으로 변경
	2. 성능
		1. `scanner.py` 유사도 비교 시 느려질 수 있음. → 사용자가 중간에 일시정지/또는 취소를 눌렀을 때 일정 간격(500번)으로 일시정지/취소 유무 확인 추가
4. icon 제작
5. 배포(github pulic말고 그냥 `.exe`로 배포)

---

## 막힌 부분

1. UX 수정
	1. 기능 추가에 의해 버튼이 정리된 것 같지 않아보여 배치 수정
	2. main_window 크기가 바뀌면 후원하기 버튼이 사라져서[!] 사라지지 않도록 수정했다.
	3. 민감도 슬라이더의 시각적 수직 위치를 조절할 때 꽤 애먹었다. top을 맞춰달라고 했더니 슬라이더를 낮추는게 아니고 '민감도'라는 글자를 올려버려서 민감도+슬라이더를 다른 위젯과 동일한 높이로 만들어달라하자 다른 위젯을 높여버렸다. 결국은 전부 높인게 괜찮아보여서 scan_panel의 위젯들을 anchor='n'처리했다.

---

## 다음에 할 일

1. 