---
layout: post
title: 습관만들기 Pawbit TIL 5
date: 2026-07-03
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Flutter
  - Dart
---
## 애니메이션

### 등장 애니메이션에서 "제일 클 때 안 보이는" 함정

발바닥 도장을 완료 시 200% → 100%로 줄이며 등장시키려 했는데, 정작 커지는 게 안 보였다. 원인은 scale과 opacity를 같은 진행값 하나로 묶은 것이다.

```dart
// ❌ 제일 클 때(scale 시작) opacity가 0 → 큰 상태가 안 보인다
final v = Curves.easeOut.transform(_c.value);
Opacity(
  opacity: v,                                   // 0 → 1
  child: Transform.scale(scale: 2.0 - 1.0 * v), // 200% → 100%
);
```

`v = 0`일 때 scale은 200%지만 opacity도 0이라 완전히 투명하다. 게다가 `easeOut`은 초반이 빨라서 큰 구간을 순식간에 지나간다. 결국 "큰 순간"이 보이지도 않고 찰나에 사라진다.

해결은 scale과 opacity의 타이밍을 분리하는 것. opacity를 앞 40% 안에 채워서, 커진 상태가 보이게 한다.

```dart
// ✅ raw t 기준으로 scale/opacity를 따로
final t = _c.value;
final scale = 2.0 - 1.0 * Curves.easeOut.transform(t); // 큰 → 작은
final opacity = (t * 2.5).clamp(0.0, 1.0);             // 앞 40%에 불투명
Opacity(opacity: opacity, child: Transform.scale(scale: scale));
```

교훈: 두 속성이 "같은 애니메이션"이어도 진행 곡선·속도는 따로 줘야 의도한 연출이 나온다.

---

### AnimatedBuilder — raw value를 쓰고, 정적 child는 밖으로

`AnimatedBuilder`의 `builder`에서 `_c.value`(0~1 raw)를 직접 쓰면 Curve를 원하는 속성에만 부분 적용할 수 있다. 이 기능으로 opacity와 scale 타이밍이 분리된다.
그리고 매 프레임 바뀌지 않는 위젯은 `child`로 빼두면 builder가 다시 만들지 않아 성능에 좋다.

```dart
AnimatedBuilder(
  animation: _c,
  builder: (context, child) {
    final t = _c.value;
    return Opacity(opacity: (t * 2.5).clamp(0, 1),
      child: Transform.scale(scale: 2.0 - 1.0 * Curves.easeOut.transform(t),
        child: child)); // child 재사용
  },
  child: Image.asset('assets/paw.png', ...), // 매 프레임 재생성 X
);
```

---

## 위젯 재활용

### 내장 Material 아이콘을 "스티커"로 재활용 — 에셋 0, 라이선스 무료

스티커를 위해 PNG를 따로 만들거나 패키지를 붙일 필요가 없었다. Flutter에 기본 번들된 `Icons`(Material Icons, Apache 2.0)를 파스텔 색으로 tint하면 그대로 스티커가 된다. 의존성·에셋 추가 0.

```dart
// 스티커 = 아이콘 + 색
class StickerItem {
  final IconData icon;
  final Color color;
  const StickerItem(this.icon, this.color);
}

Icon(item.icon, color: item.color, size: 48); // 파스텔 tint
```

단, 내장 아이콘은 카테고리가 편중돼 있다. 특히 동물이 거의 없다 — 토끼(`cruelty_free`), 새(`flutter_dash`) 정도만 있고 정작 개·고양이가 없다. 더 다양한 세트가 필요하면 `material_symbols_icons` 같은 패키지 검토 또는 별도 제작한 PNG 사용이 필요하다.

---

## 상태 표시

### 3칸 인디케이터 — 값을 칸수·색으로 매핑

강아지 케어 상태(0 건강 ~ 3 아픔)를 알약형 3칸으로 표시했다. 남은 칸 = 3 - level로 뒤집고, 채워진 칸 수에 따라 색을 정한다.

```dart
final filled = (3 - level).clamp(0, 3);
final color = switch (filled) {
  3 => green,   // 건강
  2 => yellow,  // 주의
  1 => red,     // 위험
  _ => grey,    // 0칸 = 아픔
};

Row(children: List.generate(3, (i) => _cell(
  on: i < filled, color: color, // 왼쪽부터 채움
)));
```

레벨(내부 수치)과 표시(칸수·색)를 분리해두면, 나중에 단계 수나 색 규칙만 바꿔도 로직이 안 깨진다.
