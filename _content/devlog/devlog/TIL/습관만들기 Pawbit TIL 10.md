---
layout: post
title: 습관만들기 Pawbit TIL 10
date: 2026-07-11
permalink: "wyz781my"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 완료 진동을 끌 수 있게 하며 — 켜짐·꺼짐 하나에 DB까지 갈 필요는 없다는 것.
tags:
  - Flutter
  - Riverpod
  - Dart
---
## 진동은 끌 수 있어야 했다

습관을 완료하면 가벼운 진동이 오게 해 뒀다. 그런데 진동은 사람마다 호불호가 갈린다. 그냥 넣어 두기보다 끌 수 있게 하는 게 맞다고 봤다. 설정 「표시」에 완료 진동 토글을 달고, 기본은 켜 둔다.

---

## 켜짐·꺼짐 하나에 DB까지 갈 필요는 없다

이미 있던 「주 시작 요일」 설정과 같은 방식으로 붙여서 금방 끝났다. 값은 기기 저장 공간인 SharedPreferences에 두고, 앱 안에서는 Riverpod의 `StateProvider`(바꿀 수 있는 값 하나를 담아 두는 프로바이더)로 들고 다닌다.

앱이 켜질 때 저장된 값을 읽어 이 프로바이더에 넣어 두고, 토글을 바꾸면 둘 다 고친다.

완료를 누른 순간에는 이 값을 `read`로 한 번 꺼내 본다. 앞선 TIL 1의 `watch`가 값이 바뀔 때마다 화면을 다시 그리는 것과 달리, `read`는 그 순간의 값만 꺼내고 끝난다.

- 판단: 저장할 게 켜짐·꺼짐 하나면 DB에 표를 만들고 마이그레이션까지 할 이유가 없다. 이미 있는 같은 종류의 설정과 같은 방식으로 붙이면 새로 설계할 것도 없다.
