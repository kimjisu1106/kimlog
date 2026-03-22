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

  

![](https://blog.kakaocdn.net/dna/3oWOM/dJMcahcj4JS/AAAAAAAAAAAAAAAAAAAAAOKZnACePSnjeySOMhc4ECYOjzc2fr8muhU8iWpWEwXj/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=n%2FMHPx5Yh%2B8tVYavoDciNI5%2F0bM%3D)![](https://blog.kakaocdn.net/dna/Kfi82/dJMcaf6EsQZ/AAAAAAAAAAAAAAAAAAAAAGetxbTiV0iU7QrtlMXYM6YN6nzSQwEeCkAVVTZxtz8y/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=%2BZWYBVT1HWe%2BjZH229uzbRP%2BepA%3D)![](https://blog.kakaocdn.net/dna/cgJS0e/dJMcaiWzRkd/AAAAAAAAAAAAAAAAAAAAABcLOy7r4-HJXF9EzMVkMUiy4_-6NeerxZsmYszM_jga/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=UXQRBYl8YQc5tLx5fXL8QqdYufw%3D)![](https://blog.kakaocdn.net/dna/vT0ql/dJMcab4flFB/AAAAAAAAAAAAAAAAAAAAAOLlwJdX5trfVn6CXx1Qe7XQX-c_lCblLN9O4C29d-kX/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=ayFj8aO5awateyBeTrZsW0qEhDE%3D)

![](https://blog.kakaocdn.net/dna/b5emCK/dJMcaiWzRke/AAAAAAAAAAAAAAAAAAAAAO4TI_xCj7HY3zeORIjuaBDS61H042VEth34Fz5mSgf5/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=3DzdSYABOqrY5TpsQ6K81uG9WUk%3D)![](https://blog.kakaocdn.net/dna/v0cUk/dJMcaiWzRkc/AAAAAAAAAAAAAAAAAAAAAPtqmegPJEH-zmMWjLMn7WWKfAo_58KI_i5RgRKAbCFo/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1772290799&allow_ip=&allow_referer=&signature=29ObzhBH5SkLT7NS41ZYxSqNfyc%3D)
