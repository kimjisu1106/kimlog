---
layout: post
title: 포켓몬 도감완성 PokeWalk
date: 2026-05-30
categories:
  - apps
  - summary
project: poke-walk
project_name: 포켓몬 도감완성 PokeWalk
video_id: vxKyth_LZMU
app_url: https://kimlog0415.github.io/pokewalk/
status: finished
tags:
  - React
  - JavaScript
  - CSS
---
## 요약

- 1세대 포켓몬 151마리 도감 완성을 목표로 하는 방치형 탐험 게임
- React로 개발한 개인 프로젝트

---

## 제작 동기

- 짧게 켜도 한 발짝 나아가는, 손이 자주 가는 웹 게임을 만들어보고 싶었음
- Zweii의 미니게임에서 영감을 받음 — 갈림길을 고르며 길을 걷다 무언가를 만나는 방치형 구조를 핵심 루프로 가져와 포켓몬 도감 수집에 접목
- 포켓몬은 PokeAPI 스프라이트, 배경·캐릭터 스프라이트는 Gemini, BGM은 Suno로 충당

---

## 목표 설정

- 작업 기간: 2026.05.30.~2026.05.31.
- 목표:
  - 게임보이 감성의 픽셀아트 탐험 게임 만들기
  - 갈림길 선택 → 포켓몬 발견 → 가위바위보 포획으로 이어지는 게임 루프 구현
  - 입력 없으면 자동 진행되는 방치형 플레이 지원
  - GitHub Pages 배포 + 블로그 임베드

---

## 주요 작업

- 8개 씬 상태머신 (home/travel/fork/encounter/battle/caught/flee/duplicate)
- 갈림길 4단계 이진트리 → 16개 서식지 매핑
- PokeAPI 연동 (포켓몬 정보 + 다국어 이름 + 도감 설명)
- 가위바위보 포획 로직 + 자동선택 타이머
- localStorage 도감 (수집/열람 상태 영구 저장)
- 다국어 지원 (한국어 / 日本語 / English)
- 캐릭터 스프라이트 · 배경 스크롤 · 씬 페이드 애니메이션
- BGM / SFX (씬별 배경음 + 효과음, AI 생성)
- GitHub Actions 자동 배포

