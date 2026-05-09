---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구 5
date: 2025-12-28
categories:
  - devlog
  - ue5
project: gacha-machine
project_name: Gacha Machine
video_id:
app_url:
status:
---
## 오늘 한 일

1. Pull 존
    1. if(InsertedCoin>=3), Pull 활성화
        1. if(player가 OnInsertCoinZone==true && bActivePull==true),Pull Ready HUD 띄우기
        2. if(player가 OnPullZone==true && bActivePull==true), Jump! HUD 띄우기
        3. if(player가 OnPullZone==true && bActivePull==true && Jumping==true), Spacebar 누르라는 HUD 띄워서 Thud 유도하기
    2. Thud
        1. Jump 상태에서 한번 더 Spacebar를 누르면 Thud 하도록 설정하기
        2. ActivePull일 때, Pull존에서 Thud 하면 시네마틱 영상으로 넘어가기
        3. BP_GachaMachine.TryInsertOneCoin()
        4. if CoinCount>0, 0.5초 마다 -1 처리, InsertedCoinCount += 1

---

## 막힌 부분

1. Thud시 흙먼지가 일거나 엉덩방아를 찧는 애니메이션을 적용하고 싶음

---

## 다음에 할 일

1. 가챠 이벤트(시네마틱) 구현


![](/assets/images/for-posts/ue5-20251228_01.webp)
![](/assets/images/for-posts/ue5-20251228_02.webp)
![](/assets/images/for-posts/ue5-20251228_03.webp)