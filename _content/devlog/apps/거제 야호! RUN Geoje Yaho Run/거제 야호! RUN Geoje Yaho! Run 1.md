---
layout: post
title: 거제 야호! RUN Geoje Yaho! Run 1
date: 2026-06-03
categories:
  - apps
  - log
project: geoje-yaho-run
project_name: 거제 야호! RUN Geoje Yaho! Run
video_id: DMhtBtwUbIM
app_url: https://geoje-yaho-run.pages.dev/
status: finished
tags:
  - JavaScript
  - HTML
  - CSS
---
## 오늘 한 일

- 기획 및 CLAUDE.md 작성
- 캐릭터 스프라이트 시트 제작
	- Gemini에 통으로 초안 요청한 후 PowerPoint에서 포즈 하나하나 크기, 높이, 위치 맞춘 뒤 다시 한 장의 스프라이트 시트로 제작
	- 턴어라운드 → 달리기 → 점프 → 승리 → 실패
- 게임 BGM 및 SFX 제작
- 게임 총 플레이 타임 및 난이도 조정
- 저장: 최고기록 `localStorage`

---

## 막힌 부분

- AI 스프라이트의 프레임 정렬 문제
	- 문제점: Gemini로 받은 포즈들이 프레임별 크기·센터·발 높이가 제각각이라 게임 코드에서 그대로 쓸 수 없었다.
	- 원인: AI 이미지 생성은 픽셀 단위 정밀도를 보장하지 않아, 보기엔 괜찮아도 스프라이트 시트로 쓰려면 프레임 간 기준점이 일치해야 한다.
	- 해결: PowerPoint에서 동일 크기 슬라이드에 포즈 하나씩 배치·정렬한 뒤 한 장으로 합쳐서 시트 제작. 다만 px 단위 정밀 지정과 세밀한 수정에는 한계가 있었다.

---

## 다음에 할 일

- 배경화면 변경
- 배포
