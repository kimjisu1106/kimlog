---
layout: post
title: 습관만들기 Pawbit 7
date: 2026-05-24
categories:
  - log
  - apps
project: habit-tracker
project_name: 습관만들기 Pawbit
video_id:
app_url:
status:
tags:
  - Dart
  - Flutter
  - Drift
---
## 오늘 한 일

- 아이콘 에셋 변경
- 퍼즐
	- 퍼즐 맞추는 애니메이션 추가
	- 퍼즐 배치 방식 변경(순차 → 랜덤)
	- 같은 이미지를 난이도별로 재도전 할 수 있도록 변경
- 갤러리 구현
	- 관람객, 액자, 배열 로직
- 상점
	- 슬롯 추가권, 수정권 StatChip 추가
- 체크인 AppBar에 슬롯/수정권 StatChip 추가

---

## 막힌 부분

### `AnimationController.repeat()`는 `AnimationStatus.completed`를 발생시키지 않는다

문제점: 관람객이 14초 사이클 끝날 때마다 옷 색과 방향을 바꾸려고 했는데 콜백이 한 번도 안 불렸다.
원인: `repeat()`는 내부적으로 무한 순환 시뮬레이션을 돌리기 때문에 값이 1.0에 도달해도 `completed` status를 emit하지 않는다.
해결: `forward()` (한 번만 재생) + 끝나면 다시 `_startChar` 호출하는 재귀 패턴으로 교체.

```dart
// 동작 안 함
controller.repeat();
controller.addStatusListener((status) {
  if (status == AnimationStatus.completed) { } // 절대 호출 안 됨
});

// 사이클마다 콜백 보장
void _startChar(int i) {
  if (!mounted) return;
  setState(() {
    _charIsRTL[i] = _rng.nextBool();
    _charShirtColors[i] = _shirtColors[_rng.nextInt(_shirtColors.length)];
    _charPosTweens[i] = _buildTween(_charIsRTL[i]);
  });
  _walkCtrls[i].forward(from: 0).whenCompleteOrCancel(() => _startChar(i));
}
```

> `late final List<T>`는 리스트 참조는 final이지만 `list[i] = newValue`로 원소 교체는 가능하다. `setState` 안에서 `_charPosTweens[i] = ...`가 작동하는 이유.
>  C++의 `int * const`와도 같다.

---

### iOS PageView bounce가 빈 화면처럼 보이는 현상

문제점: 갤러리에 퍼즐이 1개일 때 오른쪽으로 스와이프하면 텅 빈 베이지 화면이 잠깐 나타났다.
원인: iOS 기본 physics(`BouncingScrollPhysics`)가 마지막 페이지 너머로 overscroll을 허용한다. 그 빈 공간으로 뒤쪽 Stack의 배경이 드러난다.
해결: `ClampingScrollPhysics`를 parent로 지정해 경계에서 딱 멈추게 한다.

```dart
PageView.builder(
  physics: const PageScrollPhysics(parent: ClampingScrollPhysics()),
  ...
)
```

> `PageScrollPhysics`만 단독 사용하면 iOS에서 `BouncingScrollPhysics`를 parent로 상속한다. `ClampingScrollPhysics`를 명시적으로 주면 플랫폼 무관하게 동일하게 동작한다.

---

### Riverpod `StreamProvider` 타입 변경 시 반드시 hot restart

문제점: provider 반환 타입을 `Map<String, DateTime?>` → `Map<String, Set<String>>`으로 변경 후 타입 불일치 에러 발생.
원인: hot reload만 하면 Riverpod이 이전 타입의 provider를 메모리에 유지한다.
해결: provider 타입 시그니처가 바뀌면 반드시 hot restart.

---

### Drift stream에 `.map()` 체이닝으로 Dart 레이어 집계

문제점: 갤러리에서 이미지별 최고 난이도 퍼즐 1개 선택 + 최근 완성순 정렬이 필요했다.
원인: difficulty가 `'easy'`/`'normal'`/`'hard'` 문자열이라 SQL `MAX(difficulty)`로는 알파벳 순 비교가 되어 잘못된 결과가 나온다. `customSelect`로 raw SQL을 짜면 서브쿼리 + 순위 매핑이 필요해 복잡해진다.
해결: 전체 완료 레코드를 가져온 뒤 `.watch().map()`으로 Dart에서 직접 집계. Stream 체인이므로 DB 변경 시 자동 재계산된다.

```dart
Stream<List<Puzzle>> watchCompletedPuzzles() =>
    (select(puzzles)..where((p) => p.isCompleted.equals(true)))
        .watch()
        .map((list) {
      const diffRank = {'easy': 0, 'normal': 1, 'hard': 2};

      final best = <String, Puzzle>{};
      for (final p in list) {
        final current = best[p.imageId];
        if (current == null ||
            (diffRank[p.difficulty] ?? 0) > (diffRank[current.difficulty] ?? 0)) {
          best[p.imageId] = p;
        }
      }

      return best.values.toList()
        ..sort((a, b) => (b.completedAt ?? DateTime(0))
            .compareTo(a.completedAt ?? DateTime(0)));
    });
```

> difficulty를 숫자(0/1/2)로 바꾸면 SQL에서 해결 가능하지만, 문자열이 가독성이 더 좋고 나중에 difficulty를 여러 곳에서 비교·정렬할 일이 많아질 때 변경 예정

---

## 다음에 할 일

- 퍼즐 그림 선택 화면 고도화
  - 앱 제공 이미지 목록 표시 (현재는 하드코딩)
