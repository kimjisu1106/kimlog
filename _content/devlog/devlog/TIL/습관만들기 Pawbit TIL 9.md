---
layout: post
title: 습관만들기 Pawbit TIL 9
date: 2026-07-10
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 서버 상태 두 개를 조합한 파생값으로 슬롯 구매 버튼을 게이팅하고, 버튼 하나를 재사용하며 비활성 사유를 라벨로 구분한 Riverpod 상태 관리 기록.
tags:
  - Flutter
  - Riverpod
  - Dart
---
## 상태 관리

### 파생 상태로 버튼 게이팅 — "빈 슬롯 없을 때만"

서버 상태 두 개(활성 습관 수, 구매한 추가 슬롯)를 조합해 "슬롯 현황" 파생값을 만들고, 그걸로 버튼을 켜고 끈다. rxdart 없이 `Provider`가 두 `StreamProvider`를 `watch`해서 합성한다.

```dart
final slotInfoProvider = Provider<({int total, int used})>((ref) {
  final extra = ref.watch(extraSlotsProvider).value ?? 0;
  final used = ref.watch(activeHabitCountProvider).value ?? 0;
  return (total: GameConfig.freeHabitSlots + extra, used: used);
});
```

```dart
final slotFull = slot.used >= slot.total; // 빈 칸 없음
onPressed: (adAvailable && slotFull) ? _buySlotWithAd : null;
```

게이트를 "빈 슬롯 유무"(`used >= total`)로 두면, 무료 9칸이든 구매로 늘어난 총량이든 한 조건으로 자동으로 맞다. "활성 습관 10개 이상" 같은 매직 넘버를 안 써도 된다.

---

## 위젯

### 같은 위젯 재사용 + 비활성 사유 분기

버튼이 꺼지는 이유가 둘(빈 슬롯 남음 / 광고 한도)이라, `onPressed`를 `null`로 넘겨 비활성만 시키고 라벨로 사유를 구분했다. 카드 위젯은 하나만 유지한다.

```dart
FilledButton(
  onPressed: onPressed,
  child: Text(onPressed == null ? disabledLabel : '광고 보기'),
)
```

```dart
onPressed: (adAvailable && slotFull) ? _buySlotWithAd : null,
disabledLabel: slotFull ? '내일 다시' : '슬롯 여유', // 빈 슬롯 사유 우선
```

`disabledLabel` 기본값을 `내일 다시`로 두면 기존 카드(보너스 포인트·수정권)는 안 건드리고 슬롯 카드만 사유를 덮어쓴다. 두 사유가 겹칠 땐 `!slotFull`을 우선해 더 근본 사유를 먼저 보여준다.

---

## 요약

- 파생값(`used >= total`) 하나로 슬롯 게이트를 표현하니 무료·구매 슬롯을 따로 안 따져도 됐다.
- 비활성은 위젯을 나누지 말고 라벨만 갈아끼우면 사유별로 유연하다.
