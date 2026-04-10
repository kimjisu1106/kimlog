---
layout: post
title: 중복된 파일 찾기 Duplicate Finder 8
date: 2026-04-10
categories:
  - devlog
  - apps
project: duplicate-finder
project_name: 중복된 파일 찾기 Duplicate Finder
video_id:
app_url: https://github.com/kimjisu1106/DuplicateFinder/releases
status: finished
---
## 오늘 한 일

- 미리보기 클릭 시 파일 탐색기에서 해당 파일 위치 열기
- 썸네일, 미리보기 불가 영역, 영상/오디오 재생 버튼 모두 클릭 시 파일이 선택된 채로 탐색기 오픈

---

## 막힌 부분

1. 검색된 결과를 보고 파일이 어디에 있는 어떤 것인지 직접 확인하고 싶은데 이미지와 오디오/영상 외의 확장자는 확인이 불가능했다. 그래서 확인이 가능하도록 결과를 클릭하면 해당 위치로 탐색기가 열리게 했고 해당 파일을 선택한 채로 열릴 수 있게 했다.
2. 처음 기능 구현 시 뭘 클릭하든 Document가 떴는데 경로에 공백이 있어 파싱을 실패한 거였다. 경로를 따옴표로 감싸는 것으로 해결했다.

---

## 다음에 할 일

1. 