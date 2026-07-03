---
layout: post
title: 여둘까 Office Layout 8
date: 2026-07-03
categories:
  - apps
  - log
project: office-layout
project_name: 여둘까 Office Layout
video_id:
app_url: https://office-layout.pages.dev
status: finished
tags:
  - JavaScript
  - HTML
  - WebAPI
---
## 오늘 한 일

- 거리·면적 재는 중에도 도면을 옮길 수 있게 팬(화면 이동) 추가
	- 문제: 측정·보정·그리기 모드에선 `stage.draggable(false)`라 팬이 꺼져 있었다. 좌클릭이 전부 "측정점 찍기"에 점유돼, 확대해서 긴 벽을 재다가 두 번째 점이 화면 밖으로 나가면 갈 방법이 없었다.
	- 해결: 좌클릭은 측정점에 이미 점유됐으니, 팬을 다른 입력에 얹었다
		- 휠클릭(가운데 버튼)·우클릭 드래그 — 데스크탑 마우스 (CAD 관례)
		- Space 누른 채 좌드래그 — 노트북 트랙패드 (Figma·포토샵 관례)
	- 핵심은 팬 중엔 `stage.position`만 바꾸는 것 — 가구·측정점은 world 좌표(이미지 픽셀)로 들고 있어서, 화면을 아무리 옮겨도 `clickPts`/`areaPts`가 안 변한다. 그래서 재던 측정이 안 깨지고 이어서 두 번째 점을 찍을 수 있다.
	- 우클릭 팬을 위해 캔버스 `contextmenu`(우클릭 메뉴)는 막고, Space 팬을 위해 스페이스 기본 동작(페이지 스크롤)도 막았다.
	- 도움말 모달·단축키 안내에 팬 조작 추가