---
layout: post
title: 메트로놈 Simple Metronome TIL 3
date: 2026-07-08
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 메트로놈 비주얼을 다듬으며 익힌 안드로이드 기법들 — 발자국을 세트 단위로 줄바꿈하는 그룹 레이아웃, 줄 수를 실측 폭으로 계산하기, 스피너 두 개를 분수처럼 스타일링하기, 테마색 드로어블·SeekBar 틴트.
tags:
  - Android-Studio
  - Kotlin
---
메트로놈 비주얼을 다듬으면서 나온 안드로이드 기법들. 발자국 인디케이터가 줄바꿈에서 세트째 찢어지던 문제를 그룹 레이아웃으로 푸는 법, 줄 수를 화면 폭으로 계산하는 법, 버튼 글자가 꺾이지 않게 막는 법, 그리고 스피너 두 개를 분수처럼 보이게 만드는 스타일링까지.

---

## 레이아웃 / 그룹핑

### 세트 단위 줄바꿈 — 중첩 LinearLayout 그룹

9/8 박자면 발자국이 [큰1+작2] × 3세트다. 점 9개를 반으로 나눠 두 줄에 뿌리면 큰 발자국과 그 작은 발자국들이 다른 줄로 갈라진다. "한 박 = 한 세트"라는 도메인 단위를 레이아웃 구조에도 그대로 반영해야 한다 — 박마다 작은 LinearLayout 그룹을 만들고, 줄에는 점이 아니라 그룹만 얹는다.

```kotlin
fun makeBeatGroup(): LinearLayout {
    val group = LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        gravity = Gravity.CENTER_VERTICAL
    }
    group.addView(makeDot(true))                           // 큰 발자국
    for (s in 1 until subs) group.addView(makeDot(false))  // 작은 발자국들
    return group
}

for (count in rowBeats) {
    val row = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    repeat(count) { row.addView(makeBeatGroup()) }   // 줄에는 세트만
    container.addView(row)
}
```

주의할 불변식 하나 — 점등은 `indicatorViews` 리스트를 인덱스 순서로 돌기 때문에, 그룹으로 감싸더라도 리스트에 넣는 순서가 오디오 서브디비전 순서와 같아야 소리와 불빛이 어긋나지 않는다.

---

### 줄 수는 점 개수가 아니라 실제 폭으로

처음엔 "점 5개 이상이면 2줄"처럼 개수로 판정했는데, 이 방식은 점 크기·화면 폭·가로모드가 바뀔 때마다 어긋난다. 필요한 총 폭을 계산해 화면 폭과 비교하고, 넘치는 만큼 줄 수를 올림 나눗셈으로 구하는 게 맞다.

```kotlin
val groupWidth = (largeSize + 2 * largeMargin) + (subs - 1) * (smallSize + 2 * smallMargin)
val availWidth = resources.displayMetrics.widthPixels - horizontalPadding

// 올림 나눗셈: 필요한 줄 수 (1 ~ beats)
val rows = ((beats * groupWidth + availWidth - 1) / availWidth).coerceIn(1, beats)
val perRow = (beats + rows - 1) / rows
```

가로모드는 화면이 넓어 자동으로 1줄이 되고, 12/4처럼 극단적인 경우엔 3줄 이상으로 늘어난다. 분기 코드 없이 같은 식 하나로 다 커버된다.

---

### 한 요소를 키우면 이웃이 밀린다

BPM 숫자를 50→68sp로 키웠더니 옆의 ±5/±1 버튼 칸이 좁아져 버튼 글자가 두 줄로 꺾였다. weight로 나눠 갖는 행에서는 한 요소의 크기가 형제 요소의 폭을 직접 깎는다. 키우는 쪽을 타협(68→56sp)하고, 버튼에는 줄바꿈 자체를 금지시켰다.

```xml
<!-- 버튼 스타일 -->
<item name="android:maxLines">1</item>
<item name="android:paddingLeft">8dp</item>
<item name="android:paddingRight">8dp</item>
<item name="android:minWidth">64dp</item>
```

---

## 스타일 / 드로어블

### shape drawable에 테마색 스트로크

둥근 테두리 박스를 그릴 때 색을 `#...`으로 박으면 테마(다크 ↔ 강아지)를 바꿔도 테두리가 그대로다. drawable XML 안에서도 `?attr/`를 쓸 수 있어서(API 21+), 테마 속성을 참조하면 테마 전환에 자동으로 따라온다.

```xml
<shape android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
    <corners android:radius="16dp" />
    <stroke android:width="1.5dp" android:color="?attr/colorPrimary" />
</shape>
```

---

### 커스텀 스피너 아이템으로 분수 UI

기본 스피너 룩(작은 글자, 배경, 화살표)으로는 박자표로 안 읽혔다. 스피너의 "선택된 상태" 모양은 어댑터에 넘기는 레이아웃이 결정하므로, 굵은 큰 숫자 + 투명 배경 전용 레이아웃을 만들어 물린다. 분자·분모 스피너를 세로로 쌓고 사이에 가로줄 View를 넣으면 분수가 된다.

```xml
<!-- spinner_ts_selected_item.xml -->
<TextView
    android:gravity="center"
    android:textColor="?attr/mtInk"
    android:textSize="22sp"
    android:textStyle="bold" />
```

```kotlin
ArrayAdapter.createFromResource(
    this, R.array.numerator_options, R.layout.spinner_ts_selected_item
)
```

드롭다운 팝업 모양은 `setDropDownViewResource`로 따로 지정하므로, 선택 상태만 크게 하고 팝업은 일반 목록으로 둘 수 있다.

---

### MaterialButton cornerRadius — 스타일에서 일괄 라운드

버튼 모서리는 뷰마다 만지지 않고 스타일에 `cornerRadius`를 둬서 일괄 적용한다. 아웃라인 버튼과 채움 버튼에 각각 다른 반경을 주면 위계도 생긴다.

```xml
<style name="Widget.SimpleMetronome.OutlinedAccent" parent="...OutlinedButton">
    <item name="cornerRadius">18dp</item>
</style>
<style name="Widget.SimpleMetronome.ToggleAccent" parent="...Button">
    <item name="cornerRadius">22dp</item>
    <item name="android:textStyle">bold</item>
</style>
```

---

### SeekBar 틴트 3종

시크바는 색이 세 군데로 나뉜다 — 지나온 트랙, 남은 트랙, 손잡이. 각각 따로 틴트해야 테마에 온전히 녹는다.

```xml
<SeekBar
    android:progressTint="?attr/colorPrimary"           <!-- 지나온 트랙 -->
    android:progressBackgroundTint="?attr/mtIndicatorOff" <!-- 남은 트랙 -->
    android:thumbTint="?attr/mtAccent" />                 <!-- 손잡이 -->
```

---

## 설계

### 중복 컨트롤은 지운다

박자표 도입 전에는 "Sub per Beat"(분할) 컨트롤이 필요했지만, 박자표는 그 정보를 이미 담고 있다 — 6/8을 고르면 셋잇단이고, 4/4를 고르면 4분음표다. 표현이 겹치는 컨트롤을 남겨두면 "6/8 + 분할 2"처럼 서로 모순되는 조합이 생긴다. 컨트롤을 지우니 하단이 [박자표 | Play] 둘로 줄었고, 3칸 GridLayout도 단순한 가로 LinearLayout으로 바뀌었다.
