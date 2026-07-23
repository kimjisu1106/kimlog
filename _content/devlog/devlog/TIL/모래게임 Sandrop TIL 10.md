---
layout: post
title: 모래게임 Sandrop TIL 10
date: 2026-07-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 엔진이 이미 계산하는 출구 연결 통로를 렌더용 읽기 접근자로 노출해 규칙을 두 번 짜지 않고 "지나갈 수 있는 길"만 밝힌 기록 — 모든 빈칸을 밝히면 오히려 신호가 흐려진 이유까지.
tags:
  - Dart
  - Flutter
---
## "지나갈 수 있는"은 곧 "출구까지 연결된"

바닥 밝기로 "지금 나갈 수 있는 길"을 보여주려 했다. 처음엔 단순하게 모든 빈칸을 밝혔다.

```dart
// ❌ 첫 시도 — 빈칸이면 무조건 밝게
if (b == null) {
  children.add(at(center, tile, _PassageCell(size: tile, open: true)));
}
```

그런데 오히려 헷갈렸다. 막혀서 지금 못 나가는 빈칸(사방이 바스켓이라 출구와 끊긴 주머니)까지 밝아, 어디가 진짜 길인지 흐려졌다. "지나갈 수 있는 빈칸"은 그냥 빈칸이 아니라 출구까지 실제로 연결된 빈칸이다.

이건 이 게임의 핵심 규칙(§3.1)과 정확히 같은 개념이다 — 바스켓이 선택 가능한지는 "출구에서 빈칸을 따라 flood-fill(출구에서 시작해 빈칸을 타고 물이 번지듯 이어지는 칸을 모두 모으는 것)한 집합 R에 인접하는가"로 판정한다. 그 R이 곧 "지나갈 수 있는 길"이다.

---

## 규칙을 두 번 짜지 않는다 — 렌더용 읽기 창구만 연다

R을 페인터에서 다시 flood-fill로 구할 수도 있었다. 하지만 그러면 같은 규칙이 엔진과 UI 두 곳에 생겨 언젠가 어긋난다. 엔진은 이미 이 계산을 하고 있었다 — `selectablePositions()` 내부에서 쓰는 private `_reachableEmpties()`.

그래서 규칙을 새로 만들지 않고, 있던 계산을 렌더용으로 읽기만 하도록 노출했다.

```dart
// game.dart (엔진)
/// 출구와 연결된 빈칸(통로) 집합 — UI가 "막히지 않고 나갈 수 있는 길"만 밝히는 데 쓴다.
/// 규칙 변경 아님: 기존 [_reachableEmpties] 계산을 렌더용으로 노출하는 읽기 접근자.
Set<int> reachableEmptyIndices() {
  final inR = _reachableEmpties();
  return { for (var i = 0; i < inR.length; i++) if (inR[i]) i };
}
```

이건 규칙 변경이 아니다. 동작을 바꾸지 않고 이미 있는 결과를 화면에 보여줄 뿐이라, 시뮬레이터(Python) 쪽에 똑같이 구현할 필요도 없다. 이 프로젝트는 게임 규칙을 Dart·Python 양쪽에 두고 공통 fixture로 일치를 검증하는데, "렌더용 읽기 접근자"는 그 대상이 아니다. 규칙(behavior)과 표현(view)을 가르는 선이 여기서 유용했다.

```dart
// 보드 렌더 — 출구까지 뚫린 통로만 밝힌다 (§2.1 바닥 밝기)
final reachable = state.reachableEmptyIndices();
...
if (b == null) {
  children.add(at(center, tile,
    _PassageCell(size: tile, open: reachable.contains(bi))));
}
```

바스켓을 하나 꺼내 길이 열리면 R이 커지고, 그 칸들이 그 프레임에 바로 밝아진다 — 실시간으로 "여기로 나갈 수 있어"가 갱신된다.

---

## 매 프레임 flood-fill이 괜찮은 이유

게임 루프는 벨트 회전 때문에 매 프레임 repaint한다. 그 안에서 `reachableEmptyIndices()`(flood-fill)와 `selectablePositions()`가 각각 돈다 — 프레임마다 flood-fill 두 번.

보통은 "매 프레임 그래프 탐색"이 경보를 울리지만, 여기선 보드가 최대 7×7 = 49칸이다. 49칸 BFS(칸을 하나씩 훑어 나가는 탐색) 두 번은 60fps에서도 무시할 만한 비용이라, 캐시나 더티 플래그 없이 그냥 매번 계산한다. 최적화는 실제 병목에만 쓴다 — 규모를 먼저 보면 안 해도 되는 일이 많다.

---

## 요약

- "지나갈 수 있는 빈칸"은 모든 빈칸이 아니라 출구까지 연결된 빈칸 — 막힌 주머니를 밝히면 신호가 오히려 흐려진다
- 규칙(behavior)과 표현(view)을 가른다 — 엔진이 이미 하는 계산은 읽기 접근자로 노출해 UI가 재사용하고, 규칙을 두 번 짜지 않는다
- 렌더용 읽기 창구는 규칙 변경이 아니라서 Dart·Python 파리티(같은 규칙을 두 언어로 짜 서로 대조하는 검증) 대상이 아니다
- 최적화는 규모를 먼저 보고 — 49칸 flood-fill은 매 프레임 돌려도 된다
