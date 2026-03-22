---
layout: post
title: Unreal Engine 5 Dev Log 9 ― 가위바위보 4
date: 2026-01-29
categories:
  - devlog
  - ue5
project: rock-paper-scissors
project_name: Rock Paper Scissors
video_id:
redirect_to:
status: finished
---
## 오늘 한 일

1. WBP 애니메이션 및 시각적인 부분 개선하기
    1. 커서를 버튼에 대면 버튼 커지기
    2. PCResult에 Scale Anim 넣기
    3. 점수 룰렛에서 얻은 부분 강조하기
2. SFX, BGM 넣기
    1. SFX는 Sound2D를 활용했다.
        1. 1회성 음원: Play Sound2D
        2. Stop 제어가 필요한 음원: Spawn Sound2D > 인스턴스화 > Stop

---

## 막힌 부분

1. 룰렛 돌아갈 때 선택되면 노래가 끝나야하는데 음원 파일 다 재생됨  
    > Spawn Sound2D > 인스턴스 화 > Stop

---

## Note

1. Sound2D를 Stop 하기 위해서는 인스턴스화 해야한다.

---

## 다음에 할 일

1. 영상 업로드

![](https://blog.kakaocdn.net/dna/c81Yip/dJMcabQBCjH/AAAAAAAAAAAAAAAAAAAAAPQjLFM00LrJ3snTZdNyyfiO08z3lutS-qy0urPwZo7x/img.webp?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=IUs8rdu31W1s8WwqTPmskmDJJm8%3D)
