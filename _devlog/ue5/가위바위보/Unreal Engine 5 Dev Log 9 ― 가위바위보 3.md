---
layout: post
title: Unreal Engine 5 Dev Log 9 ― 가위바위보 3
date: 2026-01-27
categories:
  - devlog
  - ue5
project: rock-paper-scissors
project_name: Rock Paper Scissors
video_id: mGDfCV_GyjQ
app_url:
status: finished
---
## 오늘 한 일

1. 최종 GetPoint 부분 오류 수정. 게임 시작 시 Set SelectedPoint를 미리 해두기

---

## 막힌 부분

1. 졌을 때 -5보다 더 많이 빠짐. Print 해보니 턴이 진행된 숫자 만큼 중복해서 -5점이 되고 있음  
    > OnClickedButton에 대한 BindAnimationFinished이 매 턴 중복으로 Bind되고 있어서 EventConstruct로 옮겨두었다.

---

## Note

1. Bind는 중복 호출될 수 있다.

---

## 다음에 할 일

1. WBP 애니메이션 및 시각적인 부분 개선하기
    1. 커서를 버튼에 대면 버튼 커지기
    2. PCResult에 Scale Anim 넣기
    3. 점수 룰렛에서 얻은 부분 강조하기
2. SFX, BGM 넣기

![](/assets/images/for-posts/ue5-20260127_01.webp)