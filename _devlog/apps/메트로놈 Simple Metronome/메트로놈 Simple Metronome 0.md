---
layout: post
title: 메트로놈 Simple Metronome
date: 2025-08-05
categories:
  - summary
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
---
## 요약

- 피아노 연습 중 광고가 붙은 기존 메트로놈 앱에 불편함을 느껴, ChatGPT를 활용해 직접 Android 메트로놈 앱을 기획하고 Google Play에 출시했다.

---

## 제작 동기

- 피아노 연습실을 다니며 메트로놈 앱을 쓰던 중, 2시간 내내 흘러가는 광고 배너가 불편했다.
- "내가 직접 만들어서 내 계정 광고를 붙이면 되지 않을까"라는 생각으로 직접 제작을 결심했다.
- HTML/CSS/JS 클론코딩 수준의 개발 지식만 있었지만, ChatGPT와 협업하는 방식으로 진입장벽을 낮췄다.

---

## 목표 설정

- 작업 기간: 2025.06.~2025.08.
- 목표
    - 연습 중 방해가 없는 광고 최소화 앱 구현 (배너만, 전면 광고 제외)
    - 타이밍이 안정적인 메트로놈 구현
    - 세로/가로 전환 및 다양한 박자(Beats per Bar, Sub per Beat) 지원
    - Google Play 출시

---

## 주요 작업

1. 1차 구현 및 리셋 ☑️
    1. 앱 아이콘 및 메인 컬러 팔레트 확정 (Teal / Dark Charcoal / Light Gray / Pink Accent) ☑️
    2. 초기 버전 개발 — 소리 간격 불안정 문제 확인 후 프로젝트 전면 재시작 ☑️
2. 핵심 기능 구현 ☑️
    1. 안정적인 타이밍의 메트로놈 로직 구현 ☑️
    2. BPM 조절 (±1 / ±5 버튼 + SeekBar 이중 방식) ☑️
    3. 박자 인디케이터 시각 요소 추가 ☑️
    4. Rotate 지원 — BPM 유지하며 세로/가로 전환 가능 ☑️
3. 박자 기능 확장 ☑️
    1. Beats per Bar / Sub per Beat 기능 추가 (4/4, 6/8, 12/8 등 지원) ☑️
4. 광고 및 배포 ☑️
    1. Google AdMob 하단 배너 광고 적용 ☑️
    2. Google Play 비공개 테스트 (Closed Test) — 지인·가족 12명 모집 및 피드백 수집 ☑️
    3. Google Play 프로덕션 출시 ☑️
