---
layout: post
title: Unreal Engine 5 Dev Log 10 ― Number Run 1
date: 2026-02-06
categories:
  - devlog
  - ue5
project: number-run
project_name: Number Run BluePrint
video_id:
redirect_to:
status: finished
---
## 오늘의 목표

1. 숫자 Actor 및 기본 UI 화면 구성
2. 게임 시작 시 Sequence → Run 흐름 테스트

---
## 오늘 한 일

1. Object 생성
	- AI 이미지 생성 후 필요한 파트만 추출하여 사용
	- WBP 배경, 숫자 이미지, 버튼 리소스까지 한 번에 제작
	- 문제점: 추출 이미지 사용으로 인해 해상도 품질 저하 발생
	  → 이후 리소스 교체 또는 벡터 기반 UI 고려 필요
2. BP_Number 구현
	- StaticMeshComponent(SM_Number) 추가
	- 기본 Material 생성
	    - TextureParameter2D를 BaseColor에 적용
	- Material Instance 활용
	    - 숫자 1~4를 하나의 Material 구조로 관리
	    - 각 Instance에서 TextureParameter만 교체하여 구분
	- 정리
		- 숫자별 Actor를 따로 만들지 않고 Material Instance로 시각적 분기 처리하는 구조가 효율적
3. WBP_Title 생성
	- 게임 시작 화면 UI 구성
	- Start 버튼에 Hover / Click 시각적 Interaction 추가
4. WBP_SelectNumber 생성
	- 숫자 선택 화면 구성
	- 각 숫자 버튼에 Hover / Click Interaction 적용
5. Sequence 설정
	- 게임 시작 시 재생될 카메라 무빙 테스트
	- 단순 연출용 시퀀스 구성
6. LevelBP
	- Level 시작 시 Sequence 재생
	- Sequence 종료 후 Run 로직 실행되도록 연결

---

## 막힌 부분

1. 

---

## 다음에 할 일

1. 사운드 추가
	- WBP_Title
	    - BGM
	    - 버튼 Click / Hover SFX
	- WBP_SelectNumber
	    - Click 시 효과음
	    - Hover 시 숫자별 개성 있는 사운드 적용  
	        (캐릭터 선택 UI 연출 참고)
2. HUD 구성
	- WBP_HUD
		- 레이스 시작 전 3초 Countdown 구현
3. Sequence 확장
	- 숫자 선택 이후
	- 3초 카운트 동안 재생될 카메라 무빙 Sequence 구성
	    - 일반 레이싱 게임 연출 참고
4. Camera
	- Player가 선택한 Number Actor 추적
	- 중계 카메라 느낌의 Follow Camera 구현

---