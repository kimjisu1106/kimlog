---
layout: post
title: Unreal Engine 5 Dev Log 5 ― 로그스톤 은행 룩뎁(비 오는 상가 낮→밤)
date: 2025-09-30
categories:
  - devlog
  - ue5
  - summary
project: logstone-bank
project_name: 로그스톤 은행
video_id: 5iGeL8S5PHo
redirect_to:
status: finished
---
## 요약

- UE5 룩데브 실습: 은행 파사드 1면을 낮 → 해질녘(비) → 비 오는 밤으로 전환.
- 자작 에셋 + Fab(Megascans) 재질·데칼, 나이아가라 비, 젖음 머티리얼, 시퀀서/오디오 싱크.
- 1분 내외 영상, MRQ 렌더.

---

## 제작 동기

- 가상공간 공모전 수상작을 보고, 일상적인 거리 씬을 스스로 조립·룩개발해보는 개인 프로젝트로 착수.

## 목표 설정

- 목표: 실제 거리의 소규모 파사드(은행 입구) 한 면을 낮→해질녘→비 오는 밤으로 전환, 재질/조명/비·젖음 표현과 간판 룩 개발.
- 세부:
    - 필요한 에셋 자체 제작
    - Fab/Marketplace에서 머티리얼·데칼 보충 적용
    - 시간·날씨 전환(Sequencer) 구현

---

## 작업 개요

- 기간: 2025.09.20 ~ 2025.09.30 (총 33h)
- 툴체인: AutoCAD(정면 도면) / Blender(에셋 모델링) / UE5(모델링툴·머티리얼·라이팅·Sequencer·Niagara·MRQ) / Vegas Pro(편집) / Logic Pro(오디오)

---

## 주요 작업

### 범위·레퍼런스

- 현장 사진 다수(원/중/근경, 간판·바닥·유리 반사).
- 범위: 건물 1층 은행 출입부 + 보도~차도 경계. 이웃 상가는 구현 안함.

### 설계/모델링

- AutoCAD로 정면 도면 작성(가로/세로/두께/재질 표 정리).
- Blender/UE5 모델링:
    - 문(미닫이), 프레임·손잡이, ATM 박스 5기, 셔터 프레임, 사인밴드와 입체 문자, 슬로프·점자블록·맨홀, 실내 면조명 박스.
- UE5 Modeling Tools:
    - Mesh Boolean(Difference)로 벽 개구부,
    - Auto/Project UV로 UV 재투영.

### 머티리얼/데칼/UV

- Starter+Fab(Megascans) 머티리얼 사용, Material Instance에 Tiling/색보정/Roughness/Wetness 파라미터 노출.
- 실내: 벽, 패턴 타일 바닥(러프니스·틸링 조정).
- 실외: 벽돌, 보도 블록, 젖음 레이어(Roughness↓, Reflection↑).
- 데칼: 자체 제작 안내표지/주소판/스티커, Fab의 물때·누수 자국, 실내 얇은 흙자국.

### 간판 룩

- 사인밴드 Backplate + 입체 문자.
- Emissive 조절로 야간 가독성 확보.

### 라이팅/룩

- Directional Light + Sky 낮 세팅 → Sequencer로 강도/색온도 애니메이션.
- 실내: Rect Light로 ATM 상부 광량(플리커는 위치 조정으로 해결).
- 야간: 간판 Emissive, 실내광 유출, 이동 Rect/Spot Light로 차 헤드라이트 스윕 연출.

### 비/젖음 FX (Niagara)

- 빗줄기 GPU 파티클(속도/중력/바람), 카메라 근거리만 가시.
- 바닥 젖음 파라미터 애니메이션.
- 실내 비 들이치지 않도록 범위 설정.
- 충돌 이벤트로 스플래시 이미터 스폰.

### 애니메이션/시퀀서

- SQ_Main: 카메라 인→아웃, 문 개폐, Day→Rainy Night 전환, 헤드라이트 스윕 타이밍.

### ATM 디스플레이

- 자체 제작 영상 5종을 스크린 머티리얼에 매핑.

### 오디오

- 타이틀 스윕 SFX.
- 낮: 교통+새소리, 실내 진입 시 하이컷/볼륨 조절.
- ATM 기계음 팬/볼륨을 카메라 무빙에 맞춰 설정, 유리문 끼익 SFX.
- 밤: 비+젖은 도로 교통, 차 패스-바이 팬닝.

### 출력

- Movie Render Queue로 MOV 렌더.

---

## 해결한 이슈

- 스케일로 머티리얼 늘어짐 → UV 재투영으로 해결.
- 텍스처 스케일 불일치 → Material Instance Tiling 표준화.
- 밤 벽 젖음 하이라이트 부족 → 헤드라이트 스윕 라이트 추가하여 구현.

---

## 배운 점

- Blender 첫 사용이었지만, CAD→모델링→UE 파이프라인이 손에 익음.
- Niagara + 머티리얼 파라미터로 비/젖음 상태를 단계적으로 연출하는 방법 체득.

---

## 결과

{% include youtube.html id=page.video_id %}

