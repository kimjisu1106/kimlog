---
layout: post
title: Unreal Engine 5 Dev Log 10 ― Number Run 2
date: 2026-02-17
categories:
  - devlog
  - ue5
project: number-run
project_name: Number Run BluePrint
video_id:
redirect_to:
status: public
---
## 오늘의 목표

1. 그동안 만들어둔 만큼 다시 만들기

---
## 오늘 한 일

1. 노트북에서 5.7버전으로 작업해서 기존 사용하던 5.6버전으로 다시 만듦
2. LevelBP 정돈
3. WBP_HUD
	1. 숫자 표시하기: Player가 선택한 숫자, 현재 1등인 숫자
	2. 남은 거리: Player가 선택한 숫자와 결승선 사이의 거리 계산하여 Progress Bar로 표시
4. WBP_Award
	1. 랭크에 따라 시상대에 숫자 세우기(애니메이션)
	2. SelectedNumber가 1~3등에 랭크된 경우 해당 숫자에 강조 애니메이션 놓기

---

## 막힌 부분

1. 랭크 알고리즘을 처음 접해서 이해가 필요했다

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
5. GameSystem
	1. Trigger 지나치고나서 멈추게 변경하기
	2. Trigger Collision 순간의 시간을 Collect 하기
	3. Rank Array item을 구조체로 변경해서 collisiontime넣기
	4. WBP_Result 만들어서 표처럼 순위, 숫자, 몇 초인지 표시하기

---
## Note

1. 랭크 알고리즘
	1. SelectedNumber의 DeltaY보다 값이 큰 항목이 있으면 CountRank(Int)++하는 로직을 구현.
	2.  Index: 각 숫자 번호, Item: CountRank를 갖는 ArrRanks를 생성하는 반복문을 구성. 


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