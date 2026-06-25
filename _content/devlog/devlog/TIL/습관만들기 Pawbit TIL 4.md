---
layout: post
title: 습관만들기 Pawbit TIL 4
date: 2026-06-23
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
## 애니메이션

### 여러 조각을 동시에 날리려면 controller도 각자 따로

`SingleTickerProviderStateMixin`은 Ticker를 하나만 제공한다. 즉 AnimationController를 하나만 쓸 수 있다는 뜻이다. 퍼즐 조각 여러 개를 동시에 독립적으로 날리려면 각 조각이 자체 AnimationController를 생성하고, 끝나면 직접 dispose해야 한다.

```dart
final ctrl = AnimationController(vsync: this, duration: ...);
ctrl.forward().then((_) {
  ctrl.dispose(); // 끝나면 즉시 정리
});
```

이걸 모르면 "두 번째 조각은 첫 번째가 끝나야만 날아간다"는 상황이 생긴다. `TickerProviderStateMixin`으로 바꾸면 controller를 원하는 만큼 만들 수 있다.
따라서 첫 번째 애니메이션이 아직 안끝났어도 두 번째 애니메이션 실행 가능해진다.

---

### 순서는 지키되 다른 체인을 막지 않으려면 .then()

`async/await`는 `await`한 줄이 끝날 때까지 그 아래 코드를 실행하지 않는다. 조각 A가 날아가는 동안 조각 B, C, D를 동시에 날릴 수 없다.

`.then()` 체이닝은 다르다. 체인 안에서 fly → burst → reveal 순서를 보장하면서도, 이 코드 자체는 non-blocking이라 다음 조각의 체인이 바로 시작된다.

```dart
ctrl.forward().then((_) {        // fly 완료 후
  _animateBurst(end).then((_) { // burst 완료 후
    setState(() => reveal());   // 셀 공개
  });
});
// 이 코드는 non-blocking — 다음 조각 체인이 동시에 시작 가능
```

---

## 성능

### 로컬 DB는 애니메이션을 기다려줄 필요 없다

로컬 SQLite 쓰기는 보통 5ms 이내에 끝난다. 반면 퍼즐 조각 애니메이션은 fly(550ms) + burst(380ms) = 930ms다. DB를 `await`하지 않고 애니메이션과 동시에 실행해도, 애니메이션이 끝날 때쯤 DB는 이미 완료되어 있다. 사용자가 체감하는 지연은 0.
