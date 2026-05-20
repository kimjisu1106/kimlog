---
layout: post
title: Flutter 에서 퍼즐 셀 구현
date: 2026-05-10
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
Flutter에서 하나의 이미지를 n×n 조각으로 쪼개 퍼즐 셀에 표시할 때, `ClipRect + OverflowBox + Alignment` 조합으로 구현할 수 있다. 코드 핵심은 `_buildCell` 메서드이고, 원리를 이해하면 CSS `background-position`과 동일한 개념이다.

---

## 핵심 문제

각 셀은 `cellSize × cellSize`이지만, 이미지는 `cellSize*n × cellSize*n` 전체 크기로 렌더링해야 한다. Flutter는 기본적으로 자식에게 부모의 제약을 그대로 내려주기 때문에 그냥 `Image`를 넣으면 이미지 전체가 cellSize 안에 억지로 축소된다.

![](/assets/images/for-posts/20260510-01.webp)

---

## 해결 원리: ClipRect + OverflowBox

**OverflowBox**: 부모의 제약을 무시하고 자식에게 내가 원하는 크기를 준다.

```dart
OverflowBox(
  maxWidth: cellSize * n,   // 이미지를 원본 크기(n×n배)로 키움
  maxHeight: cellSize * n,
  alignment: Alignment(x, y), // 어느 부분을 창에 맞출지
  child: Image.asset(..., width: cellSize * n, height: cellSize * n),
)
```

**ClipRect**: OverflowBox 밖으로 삐져나온 부분을 잘라낸다.


OverflowBox가 키운 이미지 (n=3, 전체 3×3)
![](/assets/images/for-posts/20260510-02.webp)

ClipRect = 셀 창문 역할 → 창에 걸리는 부분만 보임
col=0, row=0 셀 → ① 만 보임
![](/assets/images/for-posts/20260510-03.webp)


---

## Alignment 공식

```dart
Alignment(
  -1.0 + 2.0 * col / (n - 1),   // x: -1(왼쪽) ~ 0(중앙) ~ +1(오른쪽)
  -1.0 + 2.0 * row / (n - 1),   // y: -1(위)   ~ 0(중앙) ~ +1(아래)
)
```

Flutter `Alignment(x, y)`의 의미: **자식의 (x,y) 지점을 부모의 (x,y) 지점에 맞춰라**.

|셀 위치|col, row|alignment|효과|
|---|---|---|---|
|좌상단|0, 0|(-1, -1)|이미지 좌상단 → 셀 좌상단에 맞춤|
|중앙|1, 1|(0, 0)|이미지 중앙 → 셀 중앙에 맞춤|
|우하단|2, 2|(+1, +1)|이미지 우하단 → 셀 우하단에 맞춤|
![](/assets/images/for-posts/20260510-04.webp)

---

## CSS 배경 이미지와 동일한 개념

웹 CSS로 치면 이렇다:

```css
.cell {
  width: cellSize;
  height: cellSize;
  background-image: url(image.png);
  background-size: cellSize*n cellSize*n;  /* OverflowBox */
  background-position: col/(n-1)*100% row/(n-1)*100%; /* Alignment */
  overflow: hidden;                         /* ClipRect */
}
```

**핵심 요약**: OverflowBox는 "부모 제약 무시권", Alignment는 "보여줄 위치 지정", ClipRect는 "나머지 잘라내기". 세 개가 합쳐져서 하나의 이미지를 n×n 창문으로 쪼개 보여주는 구조.