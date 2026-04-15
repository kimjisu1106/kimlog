---
layout: post
title: DSL (Domain Specific Language)
date: 2026-04-15
categories:
  - today-i-learn
project: today-i-learn
project_name:
video_id:
app_url:
status:
---
## TIL — DSL (Domain Specific Language)

특정 도메인에서만 쓰이는 전용 언어.
범용 언어(Python, C++)와 달리 한 가지 목적에 최적화되어 있음.

| 도구 | DSL 예시 | 목적 |
|-|-|-|
| Appsheet | `[연관 업체].[업체명]` | 테이블 참조 |
| Excel | `=IF(A1>0, "양수", "음수")` | 스프레드시트 수식 |
| Jekyll/Liquid | `{% assign x = "hello" %}` | 템플릿 렌더링 |
| SQL | `SELECT * FROM users` | DB 조회 |

SQL도 따지면 DB 전용 DSL이고,
Liquid도 Jekyll 전용 DSL.
직접 만들 수도 있음 — ChordSheet의 커스텀 파일 포맷도 일종의 DSL.