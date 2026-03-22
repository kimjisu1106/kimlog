---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구 2
date: 2025-12-15
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

1. 블렌더로 만든 가챠 머신 및 관련 object 불러와서 맵에 설치함.
2. 코인 10개 랜덤 스폰
    1. BP_CoinSpawner
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
3. 코인 회전
    1. BP_Coin.Component: RotatingMovement: Z=-45
4. 코인 줍기
    1. BP_Coin.Component:
        1. StaticMeshComponent(Coin)
        2. SphereCollision(CoinCollision)
            1. On Component Begin Overlap
            2. Branch !=bCollected
            3. SetbCollected=True
            4. CastToBP_ThirdPersonCharacter(OtherActor)
            5. BP_ThirdPersonCharacter.AddCoin(): Amount=1
            6. DestoryActor

---

## 막힌 부분

1. 도달할 수 없는 위치에 생성되는 Coin 해결하기

---

## 다음에 할 일

1. Insert Coin 존에 player가 도달하면 가챠 기계에 코인 count를 하나씩 빼고 관련 조명이 1개씩 켜지게 들어오게 하기. 3개가 되면 pull zone 활성화.

  

![](https://blog.kakaocdn.net/dna/cRMUVL/dJMcadHBa2L/AAAAAAAAAAAAAAAAAAAAAMRVUFlgvltspWEmgtLVxK9nNG-7zJt-59ECWyvvoxK2/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=9piLWbjAYJzSIaHFYC1AEwwx2qQ%3D)![](https://blog.kakaocdn.net/dna/bAXq4D/dJMb99SLVQ3/AAAAAAAAAAAAAAAAAAAAAI1cDvKyJG0t6fhbtoAq9G7htB9PUzKofCSzkLYaDVno/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=iSOzJCjoGDJ5pIGubJviHyJTWIs%3D)![](https://blog.kakaocdn.net/dna/cGVJDt/dJMcadHBa22/AAAAAAAAAAAAAAAAAAAAAFzX4ORoI6IzTdRbpLC6muix6hG9eUPXGOXzjOcrTBtv/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=9kODfgfxHoUWVpvXjZCuvR0rz7w%3D)
