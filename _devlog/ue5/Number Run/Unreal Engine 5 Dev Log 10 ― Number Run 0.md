---
layout: post
title: Unreal Engine 5 Dev Log 10 ― Number Run
date: 2026-02-06
categories:
  - ue5
  - summary
project: number-run
project_name: Number Run BluePrint
video_id: a-SI0Rz9B8w
app_url:
status: finished
---
## 요약

- 숫자 선택 기반 미니 레이스 게임(Number Run) 제작
- Player 선택값을 기준으로 Actor와 Camera를 동기화하는 구조 구현
- Blueprint + UMG + Sequence를 함께 사용하는 흐름 연습
- 카메라 추적 및 HUD 구성

---

## 제작 동기

- Blueprint와 UMG, Camera 제어를 함께 사용하는 간단한 미니게임 구조를 연습하기 위해 제작
- Player 선택 → 게임 로직 → 결과 출력까지의 전체 흐름을 한 번에 다뤄보기 위한 과제

---

## 목표 설정

- 작업 기간: 2026.02.06. ~ 2026.02.22.
- 목표
    - Player가 숫자를 선택하면 해당 번호의 Actor가 랜덤 속도로 레이스 진행
    - 선택된 Actor를 추적하는 Follow Camera 구현
    - 레이스 종료 후 결과 UI 출력

---

## 주요 작업

1. Object로 사용할 이미지 생성 및 필요한 파트 추출하여 Texture 확보 ☑️
2. BP_Number 구현 ☑️
3. UMG 구성
    1. WBP_Title ☑️
    2. WBP_SelectNumber ☑️
    3. WBP_HUD ☑️
    4. WBP_Award ☑️
    5. WBP_Result ☑️
4. Sequence 구성 ☑️
5. SFX / BGM ☑️
