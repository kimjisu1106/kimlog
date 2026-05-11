---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구 3
date: 2025-12-16
categories:
  - devlog
  - ue5
project: gacha-machine
project_name: Gacha Machine
video_id:
app_url:
status:
tags:
  - UE5
  - Blueprints
---
## 오늘 한 일

1. Insert Coin 존
    1. Blender로 Coin Insert 시 불 들어올 버튼 제작. 스피어를 잘라서 만듦. 신기함.

---


## 막힌 부분

1. 캡슐 부분에 플리커 현상 생김  
    - BP_GachaMachine의 조명 부분 Asset이 Level에 동일한 위치에 Spawn 되어있었음. Actor제거해서 해결

---

## 다음에 할 일

1. Insert Coin 존에 player가 도달하면 가챠 기계에 코인 count를 하나씩 빼고 관련 조명이 1개씩 켜지게 들어오게 하기. 3개가 되면 pull zone 활성화.


![](/assets/images/for-posts/ue5-20251216_01.webp)
![](/assets/images/for-posts/ue5-20251216_02.webp)
![](/assets/images/for-posts/ue5-20251216_03.webp)

