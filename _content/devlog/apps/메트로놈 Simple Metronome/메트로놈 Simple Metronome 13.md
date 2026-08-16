---
layout: post
title: 메트로놈 Simple Metronome ― 개인정보처리방침 통합 이전 · v1.15 출시
date: 2026-08-13
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: 메트로놈 개인정보처리방침을 제품별로 조립되는 통합 정책(logstone.net/metronome/privacy/)으로 옮겨 Play Console URL을 교체하고, ±5 버튼 키운 v1.15를 출시한 기록.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 개인정보처리방침을 통합 정책 사이트로 이전 — 구 `freeprivacypolicy.com` → `logstone.net/metronome/privacy/`, Play Console 정책 URL 교체
- ±5 버튼 키운 v1.15(versionCode 15) Google Play 출시

---

## 막힌 부분

### 정책은 제품별로 조립되지만 앱 저장소에서 못 고친다

여러 앱(메트로놈·KeyBloom·Sandrop·여둘까)의 정책·약관이 한 곳(LogStoneShop)의 조항 데이터(`clauses.ts`)에서 조립돼, 제품 슬러그별로 `logstone.net/{제품}/privacy/` 페이지가 자동 생성되는 구조로 바뀌었다. 그래서 앱 저장소엔 정책 내용이 없고, 렌더러 파일을 직접 고치면 안 된다 — 조항 추가·수정은 그 저장소의 데이터에서만 하고, 다른 담당은 요청으로 넘긴다(직접 수정은 충돌).

메트로놈은 이걸 확인받아야 했다.

- 담아야: 로컬 저장(설정·프리셋)·계정 없음 / AdMob 배너(광고 식별자) / 토치·포그라운드 서비스(데이터 수집 없음) / 아동 대상 아님
- 빼야: 다른 제품 조항(카카오 애드핏·하우스 광고·AdSense·Creem 결제·후원)

조립형 정책의 함정은 공통 조항이다. 공통 조항 본문에 특정 업체·제품명을 적으면, 무관한 제품 페이지에도 그 이름이 새어 나간다. 그래서 공통은 "제3자 광고/서비스"처럼 일반화하고, 제품 고유한 것만 제품 슬러그로 태그한다. 메트로놈엔 하드웨어 조항(토치는 카메라 권한 없이 LED만, 포그라운드 서비스는 오디오 재생만)이 새로 붙었다.

> 정책 URL이 바뀌어도 앱 재빌드는 불필요 — Play Console에서 URL만 교체하면 된다. 구 URL(freeprivacypolicy.com)은 블로그 정책과 무관했다.

---

## 다음에 할 일

- (deferrable) 잠금화면 미디어 컨트롤 — `MediaSession` + `MediaStyle`. 메트로놈 백로그에 남은 마지막 항목
