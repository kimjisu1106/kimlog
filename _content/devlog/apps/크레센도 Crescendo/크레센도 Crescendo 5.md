---
layout: post
title: 크레센도 Crescendo 5
date: 2026-06-10
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

- 예준 구현 — 기본=물보호막 푸른 돔+힐, 스킬=하늘 전기 빔(적 3명 다중 타겟+랜덤 낙뢰). 스프라이트(idle 145→73 절반/attack/skill/death) 연동
- 노아·밤비·은호 동작 애니 연동 (attack/skill)
- 컴패니언 좌우 추종 부드럽게 (x/y lerp 분리)
- 보스 5단계 난이도 점증 + 누적 패턴 — 장판→가시→순간이동→빔→S5 칼리고 공중전(구슬)
- 잡몹 스테이지 스케일링 (체력·데미지 배율)
- 하민 스턴 액션(hamin_react)

---

## 막힌 부분

- 게임 스테이지별 밸런스 조절이 필요하다.
	- 이유: 스테이지가 진행될수록 컴패니언이 생겨 공격력은 강해지지만 방어, 회복이 부족함.
	- 방법: 보스 패턴 다양화, 몹 체력, 데미지 배율 조절

---

## 다음에 할 일

- 밸런스 개선. 예준 등장 전 체력을 회복할 수 있는 방법 만들기
- UHD 글씨 선명도 개선