---
layout: post
title: 크레센도 Crescendo 11
date: 2026-07-07
categories:
  - apps
  - log
project: crescendo
project_name: 크레센도 Crescendo
video_id:
app_url:
status:
tags:
  - JavaScript
  - TypeScript
  - Phaser
---
## 오늘 한 일

- 엔딩 클리프행어 시네마틱 구현 (칼리고 처치 후)
	- 5인 승리 포즈 → 레터박스 + 하늘이 어두워짐 → **비행선(캐리어) 함대가 화면 밖 우측에서 몰려와 상단에 산개** → `TO BE CONTINUED`
	- MV의 "칼리고 쓰러뜨리자마자 함대가 몰려옴 = 다음 전투 예고" 결을 반영. 완결이 아니라 클리프행어
	- 함대는 도형 조합 placeholder 실루엣 — 전용 스프라이트는 추후(교체 지점만 함수 하나로 격리)
- 잡몹 가시성 개선
	- 어두운 배경에 검은 실루엣이라 잘 안 보여서 **보라 외곽 글로우** 추가 (Phaser 4 Glow 필터)
	- 세기·색(더 어두운 보라)·퍼짐 폭을 플레이하며 튜닝
- 상단 진행도 바의 100% 지점을 보스 위치가 아니라 **보스 아레나 진입선** 기준으로 변경 (진입하는 순간 딱 100%)

---

## 막힌 부분

- 

---

## 다음에 할 일

- 오디오 제작
- 엔딩 함대 전용 스프라이트 (placeholder → 실물 교체)
- 밸런스 조절
