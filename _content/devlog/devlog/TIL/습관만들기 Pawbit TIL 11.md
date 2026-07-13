---
layout: post
title: 습관만들기 Pawbit TIL 11
date: 2026-07-11
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 통째 교체 리디자인을 로직 보존하며 적용하는 법과 RadialGradient·Column·Stack 레이아웃 함정 3종, 점선 테두리·luminance 대비·Image 틴트까지.
tags:
  - Flutter
  - Dart
  - Drift
---
## 큰 변경 적용

### 통째 교체 리디자인을 로직 보존하며 적용

외부(디자인 리뷰)가 만든 화면 교체 파일을 그대로 덮기 전에, 파일별로 현재 코드와 대조해 "UI만 바뀌고 로직·Provider·DAO 호출은 보존"됐는지 검증했다. 그 결과 바로 전날 출시한 기능(완료 진동 토글)이 교체본에서 빠진 걸 발견해 되살렸다.

- 파일 통째 교체는 일반 diff로 "무엇이 사라졌는지"가 잘 안 드러난다. 최근 커밋의 기능이 살아 있는지 기능 단위로 확인해야 한다.
- 서로 얽힌 교체(예: DEV 패널을 A→B로 이동)는 짝으로 적용해야 중복 정의나 dangling 참조가 안 생긴다.

---

## 레이아웃 함정

### RadialGradient radius는 "짧은 변" 기준

넓은 타원 그림자를 `RadialGradient`로 그렸더니 가운데 점처럼 좁게 나왔다. radius는 박스의 짧은 변 기준 비율이라, 132×24 박스에서 24를 기준으로 계산돼 작은 원만 채운다.

```dart
// ❌ 점처럼 좁아짐 — radius가 짧은 변(24) 기준
decoration: BoxDecoration(
  gradient: RadialGradient(colors: [dark, Colors.transparent]),
),

// ✅ 넓은 pill + boxShadow 블러로 가장자리 페이드
decoration: BoxDecoration(
  color: dark,
  borderRadius: BorderRadius.circular(40),
  boxShadow: [BoxShadow(color: dark, blurRadius: 14, spreadRadius: -1)],
),
```

### Column mainAxisSize 기본 max — Stack/Align에서 전체 높이로 팽창

표지판 카드가 화면 세로를 꽉 채웠다. 원인은 `Column`이 `mainAxisSize` 미지정(기본 `MainAxisSize.max`)인데, `Stack`의 비배치 자식(`Align`)은 느슨한(큰) 제약을 받아 Column이 최대 높이까지 늘어난 것.

```dart
Column(
  mainAxisSize: MainAxisSize.min, // ← 없으면 max로 전체 높이 차지
  children: [...],
)
```

### Stack z-order — 나중에 그린 자식이 위

강아지가 표지판 뒤에 가려 산책이 안 보였다. `Stack`은 `children` 순서대로 그려서 뒤 자식이 위. 강아지 위젯을 표지판들 다음(마지막)으로 옮겨 항상 보이게 했다.

---

## 그리기 · 대비

### 점선 둥근 테두리 CustomPainter

기존 dashed 유틸이 없어 신설했다. `Path`에 `RRect`를 넣고 `PathMetric`으로 dash 길이만큼 잘라 그린다.

```dart
final path = Path()
  ..addRRect(RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(radius)));
for (final m in path.computeMetrics()) {
  var d = 0.0;
  while (d < m.length) {
    final next = (d + dash).clamp(0.0, m.length);
    canvas.drawPath(m.extractPath(d, next), paint);
    d += dash + gap;
  }
}
```

### luminance로 밝은 배경 대비 확보

흰/밝은 타일에선 완료 도장이 묻혔다. 배경색 밝기(`computeLuminance`)로 도장 색·투명도를 분기한다.

```dart
final onLightTile = color.computeLuminance() > 0.85;
Opacity(
  opacity: onLightTile ? 0.72 : 0.55,
  child: PawStamp(
    color: onLightTile ? const Color(0xFF463322) : const Color(0xFF5A4632),
  ),
);
```

### Image 틴트 — color + BlendMode.srcIn

발바닥 아이콘을 습관 색으로 물들였다. `Image`의 `color`에 `colorBlendMode`(기본 `BlendMode.srcIn`)가 적용돼 알파 모양대로 틴트된다.

```dart
Image.asset('assets/paw.png', width: 18, height: 18, color: habitColor);
```

---

## DB · 구조

### 연속 달성일(streak) — 완료 날짜 역순 카운트

완료 체크인의 distinct 날짜 집합에서 오늘(없으면 어제)부터 하루씩 뒤로 연속되는 동안 센다. 날짜는 `DateTime(y, m, d - 1)`로 내려 DST·월경계에 안전(24시간 빼기 대신).

```dart
final days = rows
    .map((c) => DateTime(c.date.year, c.date.month, c.date.day))
    .toSet();
var cursor = DateTime(now.year, now.month, now.day);
if (!days.contains(cursor)) {
  cursor = DateTime(cursor.year, cursor.month, cursor.day - 1); // 오늘 안 했으면 어제부터
}
var streak = 0;
while (days.contains(cursor)) {
  streak++;
  cursor = DateTime(cursor.year, cursor.month, cursor.day - 1);
}
```

### 위젯 분리로 배치 유연화

요약 카드를 통계(스트릭·조각)와 총평(강아지 메시지) 두 위젯으로 쪼개니 "통계는 상단, 총평은 하단" 같은 독립 배치가 쉬워졌다. 한 위젯에 다 넣으면 위치를 통으로만 옮길 수 있다.

### 설정 → 화면 이동 & 내장 라이선스

- 프로필 카드를 `InkWell`로 감싸 탭 시 `Navigator.push(ForestScreen())`(이름 변경 화면)으로 이동.
- 오픈소스 라이선스는 Flutter 내장 `showLicensePage(context: context, applicationName: 'Pawbit')` — 패키지 없이 표준 라이선스 화면.

---

## 요약

- 파일 통째 교체를 받을 땐 로직 보존을 기능 단위로 검증한다.
- 세 함정: `RadialGradient` radius=짧은 변, `Column` 기본 `mainAxisSize.max`, `Stack`은 뒤가 위.
- 배경 대비는 `computeLuminance`로, 아이콘 틴트는 `color` + `srcIn`으로.
