---
layout: post
title: 메트로놈 Simple Metronome 5
date: 2026-07-07
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 발자국 인디케이터를 크게 키우고(강아지 얼굴은 실루엣이 어색해서 뺌), 발자국이 5개 이상이면 2줄로 자동 배치
- 박자 설정을 박자표(분자/분모)로 재구성 — 분수처럼 쌓은 스피너로 `4/4`처럼 보이게
- `6/8·9/8·12/8`을 정통 컴파운드로 처리하고, `/8`일 때는 Subdivision을 잠금

---

## 막힌 부분

### 발자국이 다 같이 켜졌다 (벡터 tint 공유)

`backgroundTintList`로 현재 박만 색을 바꾸는데, 벡터 드로어블이 `constantState`를 공유해서 한 점의 tint가 다른 점까지 번질 수 있었다. 각 점의 배경을 `mutate()`해서 독립시켰다.

```kotlin
dot.background = ContextCompat.getDrawable(this, R.drawable.ic_paw)?.mutate()
dot.backgroundTintList = ColorStateList.valueOf(color)
```

### 박자표를 기존 엔진에 얹기

오디오 엔진은 `beatsPerBar × subsPerBeat`(2레벨)만 안다. 박자표를 여기에 매핑하는 규칙을 뒀다. `/8`이 3의 배수면 컴파운드(N/3박 × 3잇단), 아니면 8분음표 N개.

```kotlin
when {
    denominator == 8 && numerator % 3 == 0 -> { beatsPerBar = numerator / 3; subsPerBeat = 3 }
    denominator == 8 -> { beatsPerBar = numerator; subsPerBeat = 1 }
    else -> { beatsPerBar = numerator; subsPerBeat = subdivisionSel }
}
```

`/8`(컴파운드)은 이미 8분음표가 기본이라 분할이 의미가 없어서 Subdivision 스피너를 잠갔다.

```kotlin
binding.spinnerSubs.isEnabled = (denominator == 4)
```

---

## 다음에 할 일

- 분수 스피너 정렬·숫자 크기 다듬기 (분자/분모가 가로줄 기준으로 깔끔하게 겹치도록)
- 실기기에서 컴파운드 강세·2줄 배치 확인
