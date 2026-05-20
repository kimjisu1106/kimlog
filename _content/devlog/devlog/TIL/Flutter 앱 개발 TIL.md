---
layout: post
title: Flutter 앱 개발 TIL
date: 2026-05-11
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
---
## `StreamProvider.family`의 record 타입 키

최신 문법인 Dart 3의 record(`(DateTime, DateTime)`)는 `==`/`hashCode`가 구조적으로 자동 구현되어 Riverpod family 키로 바로 쓸 수 있다. 별도 wrapper 클래스 불필요.

---

### `SingleChildScrollView` + `NeverScrollableScrollPhysics` marquee 패턴

- weekly view에서 글자가 화면보다 길면 스르륵 흐르게 만들기(Marquee 효과)
- `NeverScrollableScrollPhysics`: 사용자가 직접 손으로 스크롤하지 못하게 막기
- `ScrollController.animatoTo()`를 호츨해 사용자 터치 없이 텍스트 흐르게 하기.
- `maxScrollExtent == 0`이면 텍스트가 넘치지 않으므로 애니메이션 루프를 조기 종료한다.

---

### `CustomPainter` 재사용

- `_DonutPainter`를 원래는 DailyScreen의 날짜 테두리로만 사용했는데 MonthlyScreen에서도 사용하게 되어 private으로 만들어 진 것을 public으로 변경해 import로 공유해서 재사용했다.

---

### `weekday % 7`

- Dart의 `DateTime.weekday`는 Mon=1…Sun=7로 인식하기 때문에 일요일 기준 0-index 열로 변환할 때 `weekday % 7`이면 Sun=0, Mon=1…Sat=6으로 딱 떨어진다.