---
layout: post
title: insertOnConflictUpdate vs DoUpdate(target)
date: 2026-05-06
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:

  - Flutter
  - Dart
  - Drift
tags:
  - Flutter
  - Dart
  - Drift
---
**`insertOnConflictUpdate` vs `DoUpdate(target: ...)`**

- `insertOnConflictUpdate`는 PK 충돌만 감지함. custom unique key (`habitId, date`)로는 충돌을 못 잡고 INSERT를 시도 → SQLite unique constraint 예외 발생.
- 해결: `DoUpdate((old) => ..., target: [col1, col2])`로 충돌 감지 대상을 명시.
- Django의 `get_or_create` → `update` 패턴과 달리, Drift(SQLite)는 insert-on-conflict 방식이라 충돌 기준 컬럼을 직접 지정해야 함.