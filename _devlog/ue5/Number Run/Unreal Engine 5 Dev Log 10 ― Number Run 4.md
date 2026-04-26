---
layout: post
title: Unreal Engine 5 Dev Log 10 ― Number Run 4
date: 2026-02-20
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

1. WBP_Result, WBP_RankingRow, BP_RankingItem
    1. ListView를 이용해 순위, 숫자, 소요시간 표시하기
    2. Duration은 소수점 아래 3자리까지 표기되도록 수정
    3. Duration<0인 경우(=도착하지 못한 경우) FAIL이 표기되도록 설정
2. BP_Crowd, 기타 꾸미기
    1. 트랙 주변을 좀 그럴듯 하게 꾸며보았다.
3. BP_Cam
    1. BP_Cam을 몇 대 더 추가해 카메라 움직임을 조금 더 연출했다.
    2. SelectedNumber를 따라가는 무빙이라 시퀀서 말고 그냥 카메라가 쫓아가는 방식으로 만들었다.
    3. 카메라 전환은 timer를 이용해 2초마다 ArrCams 순서대로 전환되게 설정했다.

---

## 막힌 부분

1. 각 숫자가 Trigger를 지나는 순간을 체크할 때 숫자가 정확하게 들어가지 않는 오류 발생  
    > 구조체 핀 분할이 아닌 Break를 사용하고, Set members in ST Numbers를 이용해 업데이트 된 것만 변경하도록 수정

---

## 다음에 할 일

1. 

  

![](/assets/images/for-posts/ue5-20260220_01.webp)
![](/assets/images/for-posts/ue5-20260220_02.webp)
![](/assets/images/for-posts/ue5-20260220_03.webp)
![](/assets/images/for-posts/ue5-20260220_04.webp)
![](/assets/images/for-posts/ue5-20260220_05.webp)
![](/assets/images/for-posts/ue5-20260220_06.webp)