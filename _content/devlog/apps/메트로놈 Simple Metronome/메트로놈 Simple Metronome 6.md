---
layout: post
title: 메트로놈 Simple Metronome 6
date: 2026-07-08
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
description: 박자표를 분수 박스로·BPM을 크게 다듬고, 발자국 인디케이터를 박 단위 세트로 묶어 줄바꿈이 세트를 찢지 않게 하고, 중복이던 Subdivision 컨트롤을 없앴다.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 비주얼 폴리시 — 박자표를 둥근 테두리 박스 + 굵은 숫자 분수로, BPM 크게, ±·Play 버튼 라운드, 시크바를 테마색으로 틴트
- 발자국 인디케이터를 박 단위 세트로 그룹핑 — [큰1+작N]이 한 덩어리, 줄바꿈은 세트 단위로만. 줄 수는 화면 폭 기준 자동(1~N줄)
- Subdivision 컨트롤 제거 — 박자표가 분할을 이미 표현(6/8=셋잇단)하므로 중복. 하단을 [박자표 | Play] 가로 배치로 단순화
- 박자표 분자 1~12로 확장 — 12/8(4박 × 3잇단) 지원

---

## 막힌 부분

### 발자국 세트가 줄바꿈에서 찢어졌다

점 개수를 반으로 나눠 두 줄에 뿌리니, 9/8에서 큰 발자국과 그 작은 발자국들이 다른 줄로 갈라졌다. 한 박 = [큰1+작2]가 한 세트라는 단위를 레이아웃에도 그대로 반영해야 했다. 박마다 작은 LinearLayout 그룹을 만들고, 줄에는 그룹만 얹는다. 줄 수 판정도 점 개수가 아니라 실제 필요 폭으로 바꿔서 가로모드에 자동 적응하게 했다.

```kotlin
fun makeBeatGroup(): LinearLayout {
    val group = LinearLayout(this).apply { orientation = LinearLayout.HORIZONTAL }
    group.addView(makeDot(true))                    // 큰 발자국
    for (s in 1 until subs) group.addView(makeDot(false))  // 작은 발자국들
    return group
}

val rows = ((beats * groupWidth + availWidth - 1) / availWidth).coerceIn(1, beats)
val perRow = (beats + rows - 1) / rows   // 세트 단위로만 줄 분배
```

점등 순서는 `indicatorViews`에 넣는 순서 = 오디오 서브디비전 순서 그대로라, 그룹으로 감싸도 소리와 어긋나지 않는다.

### 한 요소를 키우면 이웃이 밀린다

BPM 숫자를 키웠더니(50→68sp) 옆의 ±5/±1 버튼 칸이 좁아져 버튼 글자가 두 줄로 꺾였다. UI는 요소 하나의 크기가 아니라 형제 요소들과의 폭 배분 문제라서, BPM을 56sp로 타협하고 버튼에는 한 줄 고정을 걸었다.

```xml
<item name="android:maxLines">1</item>
<item name="android:paddingLeft">8dp</item>
<item name="android:paddingRight">8dp</item>
```

### 박자표 스피너를 분수처럼 보이게

기본 스피너 룩(작은 글자, 배경, 화살표)으로는 박자표로 안 읽혔다. 선택 아이템 전용 레이아웃(굵은 큰 숫자, 투명 배경)을 만들어 어댑터에 물리고, 분자·분모 스피너를 세로로 쌓은 뒤 사이에 가로줄 View를 넣어 분수 모양을 만들었다. 테두리는 shape drawable에 테마색 스트로크를 써서 두 테마(다크/강아지) 모두 자동 대응.

```xml
<shape android:shape="rectangle">
    <solid android:color="@android:color/transparent" />
    <corners android:radius="16dp" />
    <stroke android:width="1.5dp" android:color="?attr/colorPrimary" />
</shape>
```

---

## 다음에 할 일

- 실기기 최종 확인 — 컴파운드 강세, 세트 줄바꿈, 박자표 크기
- 테마를 변경할 수 있도록 설정 탭 만들기
- 다크모드, 설정 저장 이런 것들 목록 하나에 모으기
- 메트로놈 박자에 맞춰서 플래시 기능 기획하기(비트 누르면 뭘 켜고 끌지 정할 수 있게 하기. default는 끄기)
- 다크모드/라이트모드 변경시 소리 재생되는거 수정필요
- 소리를 기존 메트로놈소리, 드럼비트 소리(드럼비트소리인경우 하이햇을 16분음표로 쪼갤지, 8분음표로 칠지 정하기)
