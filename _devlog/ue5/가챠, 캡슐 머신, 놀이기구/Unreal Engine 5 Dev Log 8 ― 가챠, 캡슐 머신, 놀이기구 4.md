---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구 4
date: 2025-12-17
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

1. Insert Coin 존
	1. InsertZone에 가까이 다가가면 INSERT COIN HERE 띄우기
		1. BP_GachaMachine에 관련 Component 생성 및 BoxCollision 설정
		2. Begine Collision: WBP_HUD.Show_Prompt(Text)
		3. End Collision: WBP_HUD.Hide_Prompt()
	2. InsertZone에 올라서면 코인 자동 차감
		1. BP_GachaMachine.TryInsertOneCoin()
		2. if CoinCount>0, 0.5초 마다 -1 처리, InsertedCoinCount += 1
	3. InsertedCoinCount마다 GachaMachine 캡슐부분에 불 들어오게 하기(Material Emissive 사용)
	4. if InsertedCoin >= 3, PULL READY 로 Text 변경
	5. Pull 활성화
		1. if InsertedCoin >= 3, PullBtn material base color 변경 (Gray → Green)

---

## 막힌 부분

1. -

---

## 다음에 할 일

1. Pull Btn 위에서 특정 버튼(Spacebar 등)을 누르면 가챠 이벤트(시네마틱) 실행.
