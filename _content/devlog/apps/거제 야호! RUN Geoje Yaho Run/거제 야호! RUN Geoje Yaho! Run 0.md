---
layout: post
title: 거제 야호! RUN Geoje Yaho! Run
date: 2026-06-03
categories:
  - apps
  - summary
project: geoje-yaho-run
project_name: 거제 야호! RUN Geoje Yaho! Run
video_id: DMhtBtwUbIM
app_url: https://geoje-yaho-run.pages.dev/
status: finished
tags:
  - JavaScript
  - HTML
  - CSS
---
## 요약

- 2D 픽셀 횡스크롤 원버튼 러너. 멤버 메이가 서울에서 거제까지 달리며 버스·콘·표지판·갈매기를 피하고, 400km를 완주하면 "거제 야호!"
- Vanilla JS + Canvas 2D로 개발한 팬메이드 밈 게임. 빌드 단계 없음.

---

## 제작 동기

- 걸그룹 리센느(RESCENE)의 'LOVE ATTACK'이 멜론 TOP100 역주행 → 멤버 메이가 "차트 진입하면 거제까지 걸어가겠다"는 공약을 이행하게 됨.
- 이 게임은 그 공약을 플레이로 옮긴 팬메이드 밈 게임.
- 밈은 타이밍이 생명이기 때문에 최대한 빠르게 만들어 배포하는 것이 목표.

---

## 목표 설정

- 작업 기간: 2026.06.03. ~ 2026.06.04.
- 목표:
  - 1~2일 안에 배포 가능한 수준으로 완성
  - Canvas 2D + Vanilla JS만으로 러너 게임 구현
  - 스프라이트·배경 이미지·오디오 에셋 직접 제작
  - Cloudflare Pages 배포

---

## 주요 작업

- 게임 루프: `requestAnimationFrame` + dt 기반 물리(중력·점프), 상태머신 7종(TITLE/PLAY/OVER/WIN/ARRIVE/EXIT/INTRO)
- 장애물 4종: 버스·콘·표지판·갈매기(갈매기는 지면 유지 또는 점프로 피해야 함)
- 배경 6구간(서울→수도권→대전→충청권→근교→거제) 이미지 패닝 + 구간 경계 크로스페이드
- 스프라이트 6종: 러닝·점프·주저앉기·울기·도착 환호·타이틀 턴어라운드
- 거제 도착 연출: 깃발까지 달려가 환호 → 계속 달리기 시 해변 보너스 런
- 오디오: 오리지널 BGM(루프) + SFX 5종(점프·실패·야호·클릭·발소리), 음소거 토글
- 최고기록 `localStorage` 영구 저장
- Cloudflare Pages 깃 연동 배포(push마다 자동 재배포)

