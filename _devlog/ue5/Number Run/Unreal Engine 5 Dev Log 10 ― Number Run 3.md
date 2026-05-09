---
layout: post
title: Unreal Engine 5 Dev Log 10 ― Number Run 3
date: 2026-02-17
categories:
  - devlog
  - ue5
project: number-run
project_name: Number Run BluePrint
video_id: a-SI0Rz9B8w
app_url:
status: finished
---
## 오늘 한 일

1. LevelBP
    1. CE_SetDistance 오류 개선
        1. Run이 끝나면 set Distance==0으로 설정되어있어 해당 내용 수정함
2. WBP_HUD
    1. 레이스 시작 전 3초 Countdown 구현
    2. Countdown가 앵커를 센터로 제대로 설정해도 아래로 치우쳐져서 안맞았는데 알고보니 콘텐츠크기에 맞춤을 체크하지 않았었음.
3. 사운드 추가
    - WBP_Title, WBP_SelectNumber
        - BGM
        - SFX: Hover, 눌림
    - 게임 시작해서 달릴 때는 별도의 BGM 재생되도록 설정(Spawn Sound 2D 이용)
4. Sequence 확장
    1. 숫자 선택 이후 3초 카운트동안 재생될 카메라 무빙 Sequence 구성
    2. 달리는 동안 선택한 숫자 추적하는 카메라 구현
5. GameSystem
    1. Trigger 지나치고나서 멈추게 변경하기
    2. Trigger Collision 순간의 시간을 Collect 하기
6. 달리기 하는 트랙 Texture 제작
7. WBP_Award
    1. 시상대에 올라가는 이미지 Set Brush from Texture하는 부분 반복문 사용하도록 정리하기

---

## 막힌 부분

1. 각 Number가 Trigger를 지나간 타이밍을 Array에 넣을 때, Find(Arr)가 요소 중 일부라도 일치하면 찾아주는줄 알았는데 아니었다.  
    > for each loop를 이용하는것으로 변경하여 해결했다.

---

## 다음에 할 일

1. GameSystem
    1. WBP_Result 만들어서 표처럼 순위, 숫자, 몇 초인지 표시하기

  

![](/assets/images/for-posts/ue5-20260217_01.webp)