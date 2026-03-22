---
layout: post
title: Unreal Engine 5 Dev Log 8 ― 가챠, 캡슐 머신, 놀이기구 3
date: 2025-12-16
categories:
  - devlog
  - ue5
project: gacha-machine
project_name: Gacha Machine
video_id:
app_url:
status:
---
![](https://blog.kakaocdn.net/dna/bFfTYm/dJMcafFsf1I/AAAAAAAAAAAAAAAAAAAAAHyMRLUkbFH7iFVeDPKhw8-Uzih3ZU9_OXF5-VptPA_2/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=8sVZUquWJWPCQ6Uh4Xz5e5z7aLg%3D)

# 오늘 한 일

1. Insert Coin 존
    1. Blender로 Coin Insert 시 불 들어올 버튼 제작. 스피어를 잘라서 만듦. 신기함.

---

# 막힌 부분

1. 캡슐 부분에 플리커 현상 생김  
    - BP_GachaMachine의 조명 부분 Asset이 Level에 동일한 위치에 Spawn 되어있었음. Actor제거해서 해결

---

# 다음에 할 일

1. Insert Coin 존에 player가 도달하면 가챠 기계에 코인 count를 하나씩 빼고 관련 조명이 1개씩 켜지게 들어오게 하기. 3개가 되면 pull zone 활성화.

![](https://blog.kakaocdn.net/dna/WBbBl/dJMcabJQFQP/AAAAAAAAAAAAAAAAAAAAACFUToCSCThRbyaoF65RixxC6xFXa8MyacnteeN8yGzn/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=fBT4vNPtmI4HAq5AnS%2FQcmCSGjc%3D)![](https://blog.kakaocdn.net/dna/b4hXjg/dJMcabJQFQQ/AAAAAAAAAAAAAAAAAAAAADVH8TidEHvMvRObCzouH52VQ6oCdr7eIIbYuqKID9hK/img.png?credential=yqXZFxpELC7KVnFOS48ylbz2pIh7yKj8&expires=1774969199&allow_ip=&allow_referer=&signature=wxiTq7Uy5F52QtDGa4d6mitpU7Y%3D)