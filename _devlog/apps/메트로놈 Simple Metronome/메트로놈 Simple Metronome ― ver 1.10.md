---
layout: post
title: 메트로놈 Simple Metronome ― ver 1.10
date: 2025-08-26
categories:
  - devlog
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
---
## 1. 화면 회전 시 재생 유지

기존에는 휴대폰을 세로 ↔ 가로로 돌릴 때마다 메트로놈 소리가 끊기고 다시 시작했다.  
피아노 위에서 기기를 놓고 쓰다 보면 의외로 이 동작을 자주 하게 되는데, 그때마다 템포가 다시 잡히는 게 은근히 거슬렸다.

이번 업데이트에서는 화면을 회전해도 메트로놈 소리가 끊기지 않고 그대로 이어지도록 수정했다.  
이제 연습 중에 기기를 돌려도 흐름이 끊기지 않는다.