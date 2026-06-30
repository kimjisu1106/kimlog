---
layout: post
title: 여둘까 Office Layout 6
date: 2026-06-29
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
---
## 오늘 한 일

- 측정 기능
	- 면적 재기 — 다각형 모서리를 차례로 클릭 → 시작점 다시 클릭으로 닫으면 신발끈 공식으로 면적(m²·평) 표시. 그리는 중 꼭짓점 클릭=취소, Esc=측정 취소
		- 이유: 정확한 위치의 면적을 사용자가 직접 잴 수 있게 하고 싶었다
- 편집 기능
	- 도형 리사이즈 — 모서리 드래그로 크기 변경. 단일은 자유, 그룹(다중)은 비율 고정(균등)만
		- 이유: 총무팀에서 "PPT처럼 크기 조절이 가능하냐"는 요청이 있었다
	- 겹침 순서(z-order) — 맨 앞으로 / 앞으로 / 뒤로 / 맨 뒤로
	- 배치된 도형 점선 토글 — 기존엔 프리셋 단계에서만 정했는데, 배치 후에도 속성 패널에서 실선↔점선 전환
- UI
	- 속성 패널 접기 — 캔버스를 넓게 쓰도록 우측 패널 접기/펴기
		- 이유: 화면을 넓게 보면 좋으니까, 필요할 것 같았다
- 배포·공개 준비
	- 카카오 AdFit 광고 좌측 하단 고정(접기 가능) + 개인정보처리방침 페이지
	- OG 이미지·메타 태그 — 링크 공유 썸네일. PIL로 5MB → 84KB 최적화
- 버그픽스
	- 거리·면적 측정 중 도형 위 클릭이 안 먹던 것 — 이벤트 전파 조건 수정
- 이유: 실사용하며 필요한 기능이 계속 나오고, 남들도 쓰게 공개 준비(광고·OG·개인정보)를 함

> 구현 디테일(Transformer scale 베이크, shear, z-order, 신발끈, PIL)은 여둘까 Office Layout TIL 3에 정리.

---

## 다음에 할 일

- 프리셋 key를 이름 무관 고정 ID로 변경 (localStorage 오버라이드 stale 매칭 차단)
