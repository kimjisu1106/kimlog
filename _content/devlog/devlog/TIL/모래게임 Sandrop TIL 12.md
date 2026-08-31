---
layout: post
title: 모래게임 Sandrop TIL 12
date: 2026-07-23
permalink: "5d1njvi8"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 연출 지연은 UI에 두고 규칙은 엔진에 그대로 둬야 봇과 어긋나지 않는다는 걸 되돌리며 배우고, 열쇠 비행 애니메이션과 배지 잘림 버그를 다룬 기록.
tags:
  - Dart
  - Flutter
---
## 게임 엔진과 규칙

### 연출 지연은 UI에, 규칙은 엔진에

열쇠 기믹을 넣기로 했다. "열쇠가 자물쇠에 닿을 때 길이 열려야 한다"는 그림이 자연스러워서, 엔진에서 길막 여는 시점을 뒤로 미뤘다.

```dart
// ❌ 엔진 규칙을 바꿈 — 열쇠를 꺼내도 길막을 안 열고, 나중에 openGate()로
void _leaveBoard(Basket b) {
  b.revealed = true;
  // 길막 열기를 여기서 뺐다
}
bool openGate(int gateId) { ... }   // 애니메이션이 끝나면 UI가 호출
```

테스트가 무너졌다. 이 게임은 레벨을 봇으로 검증한다 — 봇이 열쇠를 꺼내면 길이 뚫려야 뒤를 풀 수 있는데, 엔진이 길을 안 열어주니 봇이 갇혔다. 500레벨이 "클리어 불가"로 찍혔다.

문제는 애니메이션이라는 실시간 개념을 규칙 엔진에 넣은 것이었다. 봇에게는 애니메이션이 없다. 봇은 한 틱에 열쇠를 꺼내고 그 자리에서 길이 열려야 한다. "열쇠가 날아가는 1.8초"는 사람이 보는 화면에만 존재한다.

되돌렸다. 규칙은 그대로, 지연은 UI에만 뒀다.

```dart
// ✅ 규칙 — 열쇠가 보드를 떠나면 즉시 열림 (봇·Python parity 유지)
void _leaveBoard(Basket b) {
  b.revealed = true;
  if (b.gate != null) openedGates.add(b.gate!);
}
```

```dart
// UI — 화면상 길막만 열쇠 도착까지 잠가 둔다
final Set<int> _gateVisualLock = {};   // 엔진보다 늦게 열리는 시늉

// 열쇠 비행이 자물쇠에 닿으면(t≥1) 시각 잠금 해제
if (kd.t >= 1) {
  if (_gateVisualLock.remove(kd.gateBoardIndex)) {
    _cellFlashUntil[kd.gateBoardIndex] = _animT + 0.6;  // 열림 플래시
  }
}
```

트레이드오프는 남는다 — 규칙상 길은 이미 열려 있으니, 열쇠가 날아가는 동안 길막 너머를 탭하면 아직 잠겨 보이는 길을 지난다. 하지만 그 1.8초 동안 사람은 열쇠가 날아가는 걸 보지 뒤를 탭하지 않는다. 드문 경우를 위해 봇까지 바꾸는 건 과했다.

---

### 경로마다 타이밍이 다르다

열쇠를 꺼내는 길은 둘이다. 탭해서 꺼내기(애니메이션 있음)와 매그넷(즉시). 매그넷은 연출이 없으니 길막을 그 자리에서 열어야 한다.

```dart
Basket? magnetTake(int boardIndex) {
  ...
  _leaveBoard(b);   // 여기서 즉시 openedGates.add — 매그넷은 날아가는 열쇠가 없다
  return b;
}
```

같은 "보드를 떠남"이라도 어떤 경로로 떠나느냐에 따라 연출이 붙기도 안 붙기도 한다. 공통 처리(`_leaveBoard`)에는 규칙만 두고, 연출은 각 경로가 알아서 얹는다.

---

## Flutter 애니메이션

### 바구니와 열쇠를 별도 객체로

처음엔 열쇠 바구니 하나를 통째로 자물쇠까지 날렸다. 열쇠 표식을 키웠더니 바구니 색을 덮어버렸다. 크기를 줄이면 이번엔 열쇠가 안 보였다.

방향을 바꿨다. 바구니와 열쇠는 다른 것이다.

```dart
// 바구니 — 어느 경우든 정상적으로 통로를 걸어 엘리베이터로
_walkers.add(_Walker(b, _color(b.color), points));

// 열쇠라면 아이콘만 떨어져 나와 자물쇠로 날아간다
if (gateBi >= 0) {
  _keyDarts.add(_KeyDart(
    geo.boardCell(startCol, startRow),   // 열쇠가 있던 칸
    geo.boardCell(gateCol, gateRow),     // 자물쇠 칸
    gateBi,
  ));
}
```

하나의 스프라이트에 두 동작(바구니 이동 + 열쇠 강조)을 겹치려다 서로 가렸다. 분리하니 둘 다 깔끔했다.

---

### 가다가 부드럽게 느려지는 비행

```dart
class _KeyDart {
  final Offset from, to;
  double t = 0; // 0..1

  Offset get pos =>
      Offset.lerp(from, to, Curves.easeInOut.transform(t.clamp(0.0, 1.0)))!;
}
```

`t`를 선형으로 올리되 `Curves.easeInOut`(처음과 끝을 느리게, 중간을 빠르게 만드는 감속 곡선)의 `.transform`을 씌우면 출발·도착이 부드럽다. 벽은 무시하고 직선으로 간다 — `from`에서 `to`로 lerp하니 경로 계산도 필요 없다.

---

### 부모 크기에 비례하는 아이콘

칸 크기가 화면마다 다르다. 고정 픽셀로 그리면 작은 화면에서 넘친다.

```dart
class _KeyIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (_, c) {
        final s = c.maxWidth;   // 부모가 준 크기
        return Container(
          decoration: BoxDecoration(
            border: Border.all(color: AppColors.gate, width: s * 0.08),
          ),
          child: Icon(Icons.vpn_key, size: s * 0.6, color: AppColors.gate),
        );
      },
    );
  }
}
```

---

### 누가 위에 그려지나 = 리스트 순서

Stack의 자식은 리스트 순서대로 쌓인다. 겹쳐 그릴 때 누가 위로 오는지(z-order)가 이 순서로 정해진다. 열쇠를 맨 위에 그리려면 children 리스트에 마지막에 넣는다.

```dart
// 보드 셀 → 바구니 → ... → 열쇠 비행체 (맨 뒤 = 최상단)
for (final kd in keyDarts) {
  children.add(at(kd.pos, cell * 0.5, const _KeyIcon()));
}
```

UI-측 지연 상태(`_gateVisualLock`)는 엔진 상태를 뒤늦게 따라가므로, undo·레벨 리셋에서 엔진과 다시 맞춰야 한다.

```dart
// undo가 길막을 다시 잠갔으면 시각 잠금도, 날아가던 열쇠도 되돌린다
_gateVisualLock
  ..clear()
  ..addAll(_state.lockedGateIndices());
_keyDarts.removeWhere(
    (d) => _state.lockedGateIndices().contains(d.gateBoardIndex));
```

---

## Flutter 레이아웃 버그

### 빈 공간과 배지가 남는 폭을 반씩 나눠 가진다

난이도 배지가 "매우 어려움"에서 "매우 어려"로 잘렸다. 처음엔 폭이 모자란 줄 알고 폰트를 줄였다. 안 됐다.

원인은 다른 데 있었다. 배지가 든 열 옆에 `Spacer`(빈 공간을 채워 옆 위젯을 미는 위젯)가 있었다.

```dart
Row(children: [
  thumbnail,
  Flexible(child: infoColumn),   // Lv + 배지
  const Spacer(),                // ← flex 1
])
```

`Spacer`는 `Expanded(flex: 1)`이다. `Flexible`(남는 폭에 맞춰 크기가 유동적인 위젯)도 기본 flex 1. 둘이 남은 폭을 반씩 나눠 가져서, 배지 열이 받은 폭이 "매우 어려움"보다 좁았다. 그래서 잘렸다.

```dart
// ✅ Spacer를 빼면 Flexible이 남은 폭을 다 받는다
Row(children: [thumbnail, Flexible(child: infoColumn)])
```

폭이 모자란 게 아니라 폭을 양보하고 있었다. 원인을 잘못 짚으면 엉뚱한 데(폰트 크기)를 만진다.

---

### 텍스트 클립 방지

```dart
Text(
  badge.label,
  softWrap: false,                    // 줄바꿈 안 함
  overflow: TextOverflow.visible,     // 넘쳐도 자르지 않음
  ...
)
```

---

## 요약

오늘의 핵심은 "이 지연은 어디에 속하는가"였다. 열쇠가 천천히 날아가 자물쇠를 여는 건 사람이 보는 연출이지 게임의 규칙이 아니다. 규칙 엔진에 밀어 넣었더니 봇이 갇혔고, UI로 옮기니 봇은 예전처럼 즉시 풀고 사람은 느긋한 연출을 봤다.

같은 "보드를 떠남"도 경로(탭/매그넷)마다 연출이 다르고, 같은 "배지가 안 보인다"도 원인(폭 부족이 아니라 폭 양보)이 다르다. 증상이 아니라 원인을 봐야 고칠 데가 보인다.
