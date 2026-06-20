---
layout: post
title: 여둘까 Office Layout
date: 2026-06-17
categories:
  - apps
  - log
  - summary
project: office-layout
project_name: 여둘까 Office Layout
video_id:
app_url: https://office-layout.pages.dev
status: finished
tags:
  - JavaScript
  - HTML
---
## 요약

평면도 위에 책상·집기를 끌어다 놓고 복도 간격을 확인하는 브라우저 기반 가구 배치 도구. 설치 없이 URL 하나로 접속해 바로 사용한다.

---

## 제작 동기

새 사무실 공간 가구 배치 업무가 생겼는데, 캐드를 쓸 수 있는 사람이 나뿐이라 총무파트에서 원하는 대로 배치해야하는 상황이 됐다. 차라리 직접 할 수 있는 도구를 만들어주는 게 낫겠다 싶어서 만들었다.

---

## 목표 설정

- 작업 기간: 2026.06.17. ~ 2026.06.19.
- 목표
    - 비전문가(총무부)가 CAD 없이 평면도 위에 가구를 직접 배치
    - 복도·통로 간격 측정 및 배치 결과 내보내기

---

## 주요 작업

1. 단일 HTML 파일 구조 — Konva.js(캔버스), pdf.js(평면도 읽기), jsPDF(내보내기) 모두 CDN ✅
2. 평면도 이미지·PDF 업로드 + 축척 보정 (두 점 클릭으로 실제 mm 입력) ✅
3. 가구 프리셋 팔레트 + 드래그 배치, 객체 스냅 / 격자 스냅 ✅
4. 복도 간격 측정 도구 ✅
5. 주석(도형·화살표·텍스트) 추가 ✅
6. 프로젝트 저장/불러오기 (JSON, 선택적 AES-256-GCM 암호화) ✅
7. PNG·JPG·PDF 내보내기 ✅
