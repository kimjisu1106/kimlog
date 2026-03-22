---
layout: post
title: Unreal Engine 5 Dev Log 7 ― 리듬게임, 불꽃놀이 그리고 야경
date: 2025-11-30
categories:
  - devlog
  - ue5
  - summary
project: rhythm-game-firework
project_name: 리듬게임, 불꽃놀이 그리고 야경
video_id: rDfp-p8g3R0
app_url:
status: finished
---
## 요약

- UE5로 리듬게임 + 불꽃놀이 + 야경 씬을 통합한 개인 프로젝트.
- 105시간 동안 BP, UI, DataTable, Niagara, Sequencer 등 UE 기능 대부분을 실전 사용.
- 리듬 판정 → 불꽃 패턴 → 야경 연출까지 하나의 시스템으로 연결.

---
## 제작 동기

- 10월에 추석 연휴가 길어서 UE5가 게임 엔진이니까 진짜로 게임을 만들어볼까 하는 생각이 들었음.
- 어떤걸 할까 고민하다가 리듬게임과 불꽃놀이를 섞어볼까 생각함.

---
## 목표 설정

- 작업기간: 2025.10.04.~2025.11.12.(105h)
- 하고자 한 것:
	- 리듬 판정(Perfect / Great / Good / Miss) 구현
	- 판정 → 불꽃 생성
	- 야경 / 차량 / 조명 등 환경 연출

---
## 주요 작업

- 시스템 구성
	- 게임 시스템
		- BluePrint
			- BP_MusicManager
			- BP_FireworkManager
			- BP_MarblePoolComponent
			- BP_PipeViewRoot
		- BluePrintFunctionLibrary
			- BFL_RhythmUtils
		-  Enum
			- ENUM_Grade
			- ENUM_NoteType
			- ENUM_PlayList
			- ENUM_Result
		- RenderTarget
			- RP_Pipes
		- Blueprint Structure
			- ST_Cam
			- ST_FireworkStyle
			- ST_FireworkTask
			- ST_HintTask
			- ST_JudgeStyle
			- ST_PlayList
			- ST_Reply
			- ST_ActiveCues
			- ST_Note
		- DataTable
			- AudioChart(Lane(Int), TimeMs(Int))
			  : DAW로 각 음악의 Tempo 확인 후 원하는 노트 배열하여 MIDI 추출 → CSV 변환(https://midi-to-csv.vercel.app/)
				- Chart-Golden
				- Chart-Island
				- Chart-TryEverything
			- ReplayDataTable(Reply(String))
			  : Combo count및 Judge에 따른 댓글 구현
				- DT_Combo25
				- DT_Combo50
				- DT_Combo75
				- DT_Combo100
				- DT_ReplyCommon
				- DT_ReplyGood
				- DT_ReplyGreat
				- DT_ReplyMiss
				- DT_ReplyPerfect
		- SoundCuncurrency
			- SC_KeyShot: 불꽃 SFX 동시 재생되도록
		-  SoundAttenuation
			- Attn_Fireworks: 불꽃 거리감
		- Image
			- ButtonImage
		- NiagaraSystem
			- NS_Firework
			- NS_MakeMarble
			- NS_ShotFirework
	- 환경 구성
		- BluePrint
			- BP_CarLight
			- BP_CarPath
			- BP_TrafficManager
		- Fab
			- 야경 건물
			- 다리
- UI
	- WidgetBluePrint
		- WBP_HUD
		- WBP_JudgePop
		- WBP_HintRing
		- WBP_Replay
		- WBP_Result
- Sequencer

---
## 이번 프로젝트에서 처음 해본 것

- Blueprint Function Library  
- Render Target  
- Blueprint Structure  
- DataTable  
- SoundConcurrency / Attenuation  
- Widget Blueprint Animation

---
## 배운점
- WBP의 Animation 기능
- BP에서 Sequencer 연결하는 방법
- Cam의 Location, Rotation을 가져오는 방법
- Judge에 따라서 NS Option을 변경하여 적용하는 방법
- DataTable + Struct 기반 구성
- UI 애니메이션의 효과
- BP 간 통신 구조 설계
- NiagaraSystem의 파라미터 설계
