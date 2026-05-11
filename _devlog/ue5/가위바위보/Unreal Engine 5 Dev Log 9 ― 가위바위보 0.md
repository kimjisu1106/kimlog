---
layout: post
title: Unreal Engine 5 Dev Log 9 ― 가위바위보
date: 2026-01-24
categories:
  - ue5
  - summary
project: rock-paper-scissors
project_name: Rock Paper Scissors
video_id: mGDfCV_GyjQ
app_url:
status: finished
tags:
  - UE5
  - Blueprints
---
## 요약

- Unreal Engine 5의 UMG를 활용해 버튼 입력, 판정 로직, 애니메이션을 포함한 가위바위보 게임 머신 형태의 2D 미니게임을 구현했다.

---
## 제작 동기

- UMG 수업 내용을 단순 실습에서 끝내지 않고, 실제로 완결된 미니게임 형태로 구현해보고 싶었다.
- 버튼 입력 → 판정 → 결과 출력 → 애니메이션까지 UI 중심 게임 흐름을 직접 설계하는 것이 목표였다.

---
## 목표 설정

- 작업 기간: 2026.01.25 ~ 2026.01.30.
- 목표
    - UMG 기반의 단일 화면 미니게임 구현
    - 버튼 입력을 통한 사용자 선택 처리
    - 가위/바위/보 판정 로직 구현
    - 판정 결과에 따른 UI 및 애니메이션 연출

---
## 주요 작업

1. UMG(Unreal Motion Graphics) 구현 ☑️
    1. 버튼 터치 기반 가위/바위/보 선택 UI 구성 ☑️
    2. 랜덤 CPU 선택 및 판정 로직 구현 ☑️
    3. 판정 결과에 따른 이미지 및 애니메이션 연출 ☑️
    4. 점수 시스템 구현 ☑️
2. 관련 오브제 제작 ☑️
3. Audio ☑️

---
## 결과

1. UMG 기반 가위바위보 게임머신을 구현했다.
2. 버튼 클릭, 판정 로직, 점수 계산, 애니메이션 연출이 하나의 게임 루프로 동작한다.

