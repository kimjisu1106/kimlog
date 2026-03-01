---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구
date: 2025-12-14
categories:
  - summary
  - ue5
project: gacha-machine
project_name: Gacha Machine
video_id:
redirect_to:
status: public
---
## 요약

---

## 제작 동기

---

## 목표 설정

- 작업 기간: 2025.12.14.~
- 하고자 한 것


---

## 주요 작업

1. 코인시스템
	1. 코인 10개 랜덤 스폰
		1.  BP_CoinSpawner
			1. Component
				1. BoxCollision(SpawnArea)
			2. EventBeginPlay
				1. ForLoop(0, SpawnCount-1)
				2. SpawnActor(BP_Coin, SpawnTransform)
					1. SpawnTransform
						1. SpawnArea.GetWorldLocation, SpawnArea.GetScaledBoxExtent
						2. RandomFloatInRange(X)=-BoxExtentX~BoxExtentX
						   RandomFloatInRange(Y)=-BoxExtentX~BoxExtentY
						3. MakeVector(RandomX, RandomY, 0)
						4. SpawnArea.GetWorldLocation+MakeVectorReturn
	2. 코인 회전
		1. BP_Coin.Component: RotatingMovement: Z=-45
	3. 코인 줍기
		1. BP_Coin.Component: 
			1. StaticMeshComponent(Coin)
			2. SphereCollision(CoinCollision)
				1. On Component Begin Overlap
				2. Branch !=bCollected
				3. SetbCollected=True
				4. CastToBP_ThirdPersonCharacter(OtherActor)
				5. BP_ThirdPersonCharacter.AddCoin(): Amount=1
				6. DestoryActor
	4. Insert Coin 존
		1. Blender Coin Insert 시 불 들어올 버튼 제작
		2. InsertZone에 가까이 다가가면 INSERT COIN HERE 띄우기
			1. BP_GachaMachine에 관련 Component 생성 및 BoxCollision 설정
			2. Begine Collision: WBP_HUD.Show_Prompt(Text)
			3. End Collision: WBP_HUD.Hide_Prompt()
		3. InsertZone에 올라서면 코인 자동 차감
			1. BP_GachaMachine.TryInsertOneCoin()
			2. if CoinCount>0, 0.5초 마다 -1 처리, InsertedCoinCount += 1
		4. InsertedCoinCount마다 GachaMachine 캡슐부분에 불 들어오게 하기(Material Emissive 사용)
		5. if InsertedCoin >= 3, PULL READY 로 Text 변경
	5. Pull 활성화
		1. if InsertedCoin >= 3, PullBtn material base color 변경 (Gray → Green)
2. 가챠 이벤트(시네마틱)
	1. Pull 실행
	2. 내부 기계 연출
	3. 캡슐 굴러 나옴
3. 캡슐 오픈 & 결과 표시
	1. 캡슐 열기
	2. 결과 표시
4. 관련 오브제 제작

---

## 결과

---

{% assign current_project = page.project | default: post.project %}  
  
{% assign related = site.devlog  
| where_exp: "p", "p.categories contains 'ue5'"  
| where_exp: "p", "p.project == current_project"  
| sort: "date"  
%}  
  
{% if related.size > 1 %}  
## Related Post
  
{% for item in related %}  
{% unless item.url == page.url %}  
- {{ item.date | date: "%Y-%m-%d" }} · [{{ item.title }}]({{ item.url | relative_url }})  
{% endunless %}  
{% endfor %}  
{% endif %}