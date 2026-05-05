---
layout: post
title: Flutter 앱 개발 — DB부터 상태관리까지
date: 2026-05-05
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Flutter
---
### 데이터베이스와 스키마

- **스키마(Schema):** DB의 설계도. Django의 `models.py`와 같은 역할. 이번에 습관, 잔고 등을 포함한 6개의 테이블 설계를 확정함.
- **build_runner:** Dart 전용 코드 생성기. `.dart` 어노테이션을 읽어서 `.g.dart` 코드를 자동 생성한다. `database.dart`에 테이블 정의를 쓰면 `database.g.dart`에 실제 쿼리 코드를 만들어줌. 실제 DB 테이블 생성은 앱 실행 시 Drift가 자동으로 처리. 
	- Django(Python)는 동적 언어라 실행 중에 모델을 읽고 바로 이해할 수 있지만, Flutter(Dart)는 정적 언어라 모든 게 미리 컴파일되어 있어야 한다.

---

### 데이터 접근 객체, DAO

- **DAO (Data Access Object):** DB에 직접 손을 넣어 데이터를 넣고 빼는 '전용 일꾼'.
- Django는 모델 자체가 똑똑해서(`Model.objects.all()`) 필요 없지만, Flutter(Drift)는 모델이 단순한 틀이라서 **HabitDao** 같은 별도의 로직 보관함이 필요함.

---

### 상태 관리와 실시간 동기화

- **Stream(스트림):** 데이터가 흐르는 파이프라인. 데이터가 바뀌면 화면이 즉시 반응하게 만드는 핵심 기술.
- **StreamProvider 분리 패턴:** 여러 데이터를 하나로 묶으면 특정 데이터의 변화를 놓칠 수 있음. 각각의 데이터(습관/잔고)에 개별 알람벨(Provider)을 달고 화면이 이를 동시에 감시(`ref.watch`)하게 해서 반응성을 높임.

---

### UI 및 내비게이션

- **IndexedStack:** 하단 탭을 옮겨 다녀도 기존 화면의 상태(스크롤 위치, 입력 내용 등)를 메모리에 올려두고 보이는 것만 바꿔줌. 탭 전환해도 상태가 유지됨
- **Onboarding Flag:** `SharedPreferences`를 이용해 '최초 실행 여부'를 저장. 한 번 본 가이드는 다시 안 나오게 하는 로직.

---

### 트러블슈팅 및 예외 처리

- **잔고 검증:** 꿈 조각이 0 미만으로 떨어지지 않게 로직 설계. 
- **Android Desugaring:** 최신 코드를 구형 안드로이드 폰에서도 이해할 수 있게 번역해 주는 설정을 추가해 호환성 해결.