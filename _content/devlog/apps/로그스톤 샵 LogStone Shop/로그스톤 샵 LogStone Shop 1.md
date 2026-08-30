---
layout: post
title: 로그스톤 샵 LogStone Shop 1
date: 2026-08-09
permalink: "devlog/apps/로그스톤 샵 LogStone Shop/로그스톤 샵 LogStone Shop 1"
categories:
  - apps
  - log
project: logstone-shop
project_name: 로그스톤 샵 LogStone Shop
video_id:
app_url: https://logstone.net
status:
description: KeyBloom을 파는 스토어를 Astro로 세우고, 디자인 핸드오프를 입혀 실동작 파티클 데모가 도는 제품 페이지로 만들어 Cloudflare Pages에 배포한 첫 로그.
tags:
  - Astro
  - CSS
  - JavaScript
---
## 오늘 한 일

LOGSTONE 브랜드로 KeyBloom을 파는 스토어를 하루 만에 세웠다.

- 스택을 Astro로 확정하고 프로젝트를 시작함
	- 이유: 헤더·푸터 같은 공통 레이아웃을 재사용하고, 앱이 늘 때마다 데이터와 페이지만 추가하는 구조에 맞음. 빌드 결과는 순수 정적 HTML이라 Cloudflare Pages에 그대로 올라간다
- 스튜디오 홈 + KeyBloom 제품 페이지 뼈대를 만듦 — 영어 기본(`/`)에 한국어(`/ko/`) 전환, 문구는 언어별 사전 파일 하나에서 관리
- 결제·키 발급·세금은 Creem(MoR)에 맡기고 사이트는 소개와 구매 링크까지만 담당하는 구조
- 처음 뼈대가 너무 밋밋해서 방향을 고민하다, Claude design으로 만들어둔 KeyBloom 상품 소개 이미지 핸드오프의 Modernist 톤(잉크·핑크 액센트, 2px 룰, radius 0)을 제품 페이지에 그대로 입힘
- 커버와 라이브 무대는 정지 이미지가 아니라 핸드오프에 동봉된 파티클 렌더러(keybloom-stage.js)가 실제로 도는 캔버스 — 화면 밖에서는 자동으로 멈춘다
- 모션 7종 타일도 정지 PNG 대신 GIF용 루프 파라미터로 실동작하게 함
- 홈도 같은 톤으로 통일하고, 헤더와 중복되던 타이틀은 헤더에 합친 마스트헤드로 정리
- 소리꽃 KeyBloom 재생목록을 제품 페이지에 넣음 — 빌드할 때 재생목록 피드를 읽어 영상 카드를 만들고, 클릭한 카드만 플레이어로 바뀐다
- Cloudflare Pages(logstoneshop.pages.dev)에 배포하고 push마다 자동 재배포되게 함

---

## 막힌 부분

- 유튜브 재생목록 임베드가 목록을 못 불러오고 한 곡만 재생됨
	- 해결: 플레이어 하나로 버티는 대신 영상별 썸네일 카드 캐러셀로 형태를 바꿈. 빌드 시 재생목록 RSS를 파싱해 카드를 만들어서 새 영상도 다음 배포 때 자동 반영된다
- 내용이 짧은 페이지에서 푸터가 화면 중간까지 올라와 보임
	- 해결: 본문 영역이 남는 높이를 채우게 해 푸터를 항상 화면 맨 아래에 고정
- 헤더와 본문 컨테이너 폭이 페이지마다 달라 어긋나 보임
	- 해결: 폭을 CSS 변수 하나로 통일해 사이트 전체가 같은 값을 쓰게 함

---

## 다음에 할 일

- Creem 상품 생성·체크아웃 링크 연결
- 무료 앱 다운로드 링크 연결(첫 릴리스 후)
- OG 메타·공유 이미지
- 로고 교체(지금은 임시 모노그램)
