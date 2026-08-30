---
layout: post
title: 여둘까 Office Layout 9
date: 2026-07-22
permalink: "devlog/apps/여둘까 Office Layout/여둘까 Office Layout 9"
categories:
  - apps
  - log
project: office-layout
project_name: 여둘까 Office Layout
video_id:
app_url: https://office-layout.pages.dev
status: finished
description: 캐드 파일(.dwg)을 올리면 아무 반응 없이 빈 화면이 되던 걸, 무료 뷰어로 PDF 변환 후 올리라는 안내로 바꾼 날.
tags:
  - JavaScript
  - HTML
---
## 오늘 한 일

- 캐드 파일(`.dwg`/`.dxf`)을 고르면 PDF로 바꿔 오라고 안내하고 멈추게 함
	- 이유: 파일 선택창을 "모든 파일"로 바꿔 dwg를 고르면 아무 반응 없이 빈 화면이 됐다. 왜 안 되는지 사용자가 알 방법이 없었다.
	- 안내 문구는 "무료 캐드 뷰어(DWG TrueView, 오토데스크 뷰어 등)로 도면을 연 뒤 PDF로 인쇄·내보내고, 그 PDF를 올려주세요"
	- 도움말 모달 「시작하기」에도 같은 문구를 한 줄 추가
		- 이유: 파일을 올려보고 나서야 알게 되는 것보다, 열기 전에 아는 편이 낫다.

---

## 막힌 부분

- DWG를 직접 여는 길을 먼저 따져봤는데 세 갈래 모두 막혔다
	- 원인: DWG는 공개된 규격이 없는 바이너리 포맷이라, 브라우저에서 쓸 수 있는 파서가 사실상 없다
	- 유일하게 있는 WASM 포팅(LibreDWG)은 GPL-3.0이라 도구 전체가 같은 라이선스에 묶인다
	- 서버 변환은 도면 파일을 외부로 올려야 해서, "모든 처리는 브라우저 안에서"라는 이 도구의 약속과 개인정보처리방침을 동시에 깬다
	- 결론: 지원하지 않고 변환 경로를 안내하는 쪽으로 정리. 왜 안 되는지도 CLAUDE.md에 남겨서 나중에 같은 조사를 반복하지 않게 함
