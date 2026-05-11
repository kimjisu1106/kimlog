---
layout: post
title: PDF 용량 줄이기
date: 2026-02-11
categories:
  - apps
  - summary
project: pdf-compressor
project_name: PDF 용량 줄이기
app_url: /apps/pdf-compressor/index.html
video_id:
status: finished
tags:
  - JavaScript
  - PDF
---
디자이너가 포트폴리오 PDF를 제출할 때 용량 제한에 걸리는 경우가 종종 있다. 브라우저에서 바로 PDF 용량을 줄여주는 도구가 필요해서 만들었다.

이미지/목업 위주의 포폴 PDF에 가장 효과적이다. 반대로 텍스트 위주 문서(논문, 계약서 등)는 자동으로 감지해서 원본을 그대로 반환한다.

포폴 제출용이라면 **높은 품질** 옵션을 권장한다.

---

## 동작 원리

1. 앞 3페이지의 텍스트 밀도를 분석 → 텍스트 위주면 원본 반환
2. pdf.js로 각 페이지를 고화질로 canvas에 렌더링
3. JPEG 품질을 0.82부터 단계적으로 낮추며 최적 크기 탐색
4. 압축 결과가 원본보다 크면 원본 반환
5. 여러 파일 동시 처리 → ZIP으로 묶어서 다운로드

---

## 기술 스택

- **pdf.js 3.11.174** — PDF 페이지를 canvas에 렌더링
- **pdf-lib 1.17.1** — 렌더링된 이미지로 새 PDF 생성
- **JSZip 3.10.1** — 여러 파일 압축 시 ZIP 패키징

---

## 제한

- 이미지 기반 변환이라 압축 후 텍스트 선택/복사 불가
- 이미 JPEG로 저장된 스캔 PDF는 효과가 적을 수 있음
