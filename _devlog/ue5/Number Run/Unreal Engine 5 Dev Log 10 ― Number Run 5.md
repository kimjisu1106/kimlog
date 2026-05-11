---
layout: post
title: Unreal Engine 5 Dev Log 10 ― Number Run 5
date: 2026-02-21
categories:
  - devlog
  - ue5
project: number-run
project_name: Number Run BluePrint
video_id: a-SI0Rz9B8w
app_url:
status: finished
tags:
  - UE5
  - Blueprints
---
## 오늘 한 일

1. Finish 될 때 연출
    1. Set Global Time Dilation을 이용한 Slow motion 연출
    2. SFX_Photo
2. 게임 시작 직전에는 Select Num == 1st Index로 설정하여 현재 1등에 유저가 선택한 번호가 기본으로 뜨도록 설정
3. BFL(Blueprint Function Library)
    1. 매번 ArrRanks를 가져다가 Find해서 ST_Numbers의 Index를 얻어내는 방식이 번거로워서 공통으로 사용 가능한 함수 생성. Rank 또는 Item을 넣으면 필요한 Index를 Return  
        
        ![](/assets/images/for-posts/ue5-20260221_01.webp)
1. 영상 업로드

---

## 막힌 부분

1.   

---

## 다음에 할 일

1.