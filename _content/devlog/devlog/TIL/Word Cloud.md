---
layout: post
title: Word Cloud
date: 2026-05-17
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - Canvas
---
### 데이터 준비 (JS)

`tags.json`을 fetch해서 최근 1년 포스트만 필터링 → 각 포스트의 `tags` 배열을 모아 태그별 등장 횟수(`freq` 객체)를 셈 → 빈도 내림차순 정렬 후 상위 60개 추출 → `[["JavaScript", 12], ["Flutter", 8], ...]` 형태의 배열로 만들어 `wordcloud2.js`에 전달.

> 초기엔 본문까지 담긴 `search.json`(636KB)을 받았지만, 워드클라우드는 날짜·태그만 필요해서 그 둘만 담은 경량 `tags.json`(20KB)으로 분리했다.

---

### 렌더링 (wordcloud2.js)

`<canvas>` 위에 단어를 배치하는 라이브러리. 핵심 알고리즘은:

- **spiral placement**: 캔버스 중심에서 나선형으로 퍼져나가며 각 단어가 들어갈 자리를 탐색
- **픽셀 충돌 감지**: 이미 그려진 영역을 비트마스크로 추적해서 겹치는 자리는 스킵
- **가중치 → 폰트 크기**: `weightFactor` 함수가 빈도(`n`)를 픽셀 크기로 변환. 현재 코드는 `Math.max(13, (n/maxFreq) * 52)` — 최대 빈도 대비 비율로 13~52px 범위에 매핑

현재 설정값:

|옵션|값|의미|
|---|---|---|
|`rotateRatio: 0`|0|모든 단어 가로 방향|
|`shrinkToFit: true`|true|공간 부족하면 자동 축소|
|`gridSize`|`w/60`|화면 너비에 비례해 격자 크기 조정|
|`color`|`Math.random()`|매 렌더링마다 색 랜덤|