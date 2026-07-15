---
layout: post
title: 소설 타임라인 관리 도구 Lumior
date: 2026-07-08
description: "옵시디언 vault의 md frontmatter를 파싱해 소설 타임라인과 데이터 점검을 브라우저에서 보는 로컬 도구, Lumior 프로젝트 소개."
categories:
  - apps
  - summary
project: lumior
project_name: 소설 타임라인 관리 도구 Lumior
video_id:
app_url:
status:
tags:
  - Python
  - FastAPI
  - JavaScript
  - CSS
---
## 요약

옵시디언 vault에 흩어진 소설 원고 md의 frontmatter(연호·Year·Month·Day·characters)를 유일한 진실로 삼아, vault 전체를 시간축으로 조회하고 누락·이상 데이터를 점검하는 로컬 도구. Python(FastAPI) 서버가 매 요청마다 vault를 풀스캔해 JSON으로 넘기고, 기존에 쓰던 뷰어 HTML이 그걸 받아 타임라인·점검·인물축 세 가지 뷰로 보여준다. 원고 md는 어떤 경우에도 건드리지 않는 읽기 전용이 원칙이다.

---

## 제작 동기

소설 창작 자료가 vault 안에 1,300개가 넘는 md로 흩어져 있고, 각 노트의 시점은 frontmatter(연호·Year·Month·Day)에만 적혀 있다. 즉 데이터는 항상 md에 있고 도구는 파생물이다. 그동안은 데이터를 통째로 박아 넣은 정적 뷰어 HTML로 타임라인을 봤는데, 이건 만든 순간의 스냅샷이라 md를 고쳐도 갱신되지 않았다. 원하는 건 frontmatter를 고치면 바로 반영되고, 연호나 날짜가 빠졌거나 이상한 노트를 리포트로 짚어 주는 도구였다. File System Access API로 서버 없이 가는 길도 있었지만, 점검·확장까지 생각하면 로컬 서버 방식이 곧게 이어진다고 봤다.

---

## 목표 설정

- 작업 기간: 2026.07.08. ~ 진행 중
- 절대 원칙: vault의 md는 읽기 전용. 파서 레벨에서 IF 폴더/시리즈는 제외
- M1: 파서 + `/api/timeline` 풀스캔 + 뷰어를 `fetch`로 연결 → 새로고침 시 자동 반영
- M2: `/api/lint` 점검 리포트(연호 없음·Year 없음·연호-폴더 불일치·날짜 이상·characters 없음) + 뷰어 점검 탭
- M3: order 정렬, 점검에 걸린 이유 라벨, 인물축 스윔레인 뷰, 창 포커스 시 자동 새로고침

---

## 주요 작업

1. 파서 — frontmatter 추출, 값 캡처 정규식에 `[ \t]*`(개행 미포함) 사용 ✅
2. 포함 규칙 — 값이 비어도 `연호`/`Year` 필드가 있으면 포함(빈 템플릿을 점검이 잡도록) ✅
3. `/api/timeline` 풀스캔 + 기존 뷰어의 `const DATA`를 `fetch`로 교체 ✅
4. `/api/lint` 5종 점검 + 뷰어 점검 탭(항목 클릭 → 옵시디언에서 열기) ✅
5. 점검에 걸린 이유(why) 라벨 — Month=13 / 폴더 3부인데 연호 리제나 등 ✅
6. order 필드 정렬 — 같은 날짜는 Month→Day→order→제목 순 ✅
7. 인물축 스윔레인 — 고른 인물이 행, 시간이 열. 년/월/일 구분 단위 선택 ✅
8. 미상(연호·년·월 없음) 항목 보이기/숨기기 토글(기본 숨김) ✅
9. 창 포커스 시 자동 재조회 — watchdog 없이 의존성 0 ✅
10. 해설집(ref) 중첩 — `ref`가 가리키는 본문 아래에 작게 표기 ✅
11. UTF-8 관대 읽기 — 본문 깨진 바이트로 파일이 통째로 누락되던 버그 수정 ✅
12. watchdog 실시간 반영 ⏳
13. frontmatter 인라인 편집(백업 후 쓰기, 본문 미접촉) ⏳
14. 배포/공유(옵시디언 플러그인 또는 File System Access 웹앱) ⏳

---

## 결과

- M1~M3 코어 완성. md를 고치고 브라우저로 돌아오면 타임라인·점검·인물축이 자동 갱신된다
- 점검이 짚어 준 빈 연호 노트 중, 원본과 제목이 완전히 일치하는 해설집 34개는 원본 날짜를 채워 정리(도구가 아니라 일회성 데이터 작업으로, 백업 후 frontmatter만)
- 실시간 반영(watchdog)과 frontmatter 편집은 다음 단계로 남김. 도구는 계속 읽기 전용
