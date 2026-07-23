---
layout: post
title: 메트로놈 Simple Metronome TIL 2
date: 2026-07-07
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Android-Studio
  - Kotlin
---
"Beats per Bar / Sub per Beat"가 직관적이지 않다는 피드백을 받아, 메트로놈 박자 설정을 익숙한 박자표(4/4, 6/8)로 바꿨다. 이미 있는 오디오 엔진은 그대로 두고 그 위에 박자표를 얹는 과정에서 나온 것들 — 박자표를 내부 구조로 변환하는 법, 컴파운드 박자를 다루는 법, 상황에 따라 컨트롤을 잠그는 법, 그리고 벡터 발자국이 다 같이 켜지던 버그까지.

---

## 박자표 / 미터 로직

### 박자표(분자/분모)를 내부 엔진에 매핑

오디오 엔진은 `beatsPerBar × subsPerBeat`(박 × 분할, 2레벨)만 안다. 엔진을 뜯어고치는 대신, 사용자가 고른 박자표를 이 두 값으로 변환하는 규칙만 뒀다. 메트로놈에선 분모(/4·/8)가 소리로는 거의 차이가 없어서, 분모를 "그룹핑을 정하는 스위치"로 쓴다.

```kotlin
// 분자 N, 분모 D, 분할 → beatsPerBar × subsPerBeat
private fun recomputeMeter() {
    when {
        denominator == 8 && numerator % 3 == 0 -> { beatsPerBar = numerator / 3; subsPerBeat = 3 }
        denominator == 8 -> { beatsPerBar = numerator; subsPerBeat = 1 }
        else -> { beatsPerBar = numerator; subsPerBeat = subdivisionSel }
    }
    updateIndicators(beatsPerBar, subsPerBeat)
    if (viewModel.isPlaying.value == true) playPattern(viewModel.currentBpm.value ?: 60)
}
```

---

### 컴파운드 박자 처리

`6/8`은 8분음표 6개를 3개씩 묶어 큰 박 2개(점4분음표)로 느끼는 컴파운드 박자다. 이걸 "6번 클릭"이 아니라 "2박 × 3잇단"으로 연주해야 음악적으로 맞다. 분모가 8이고 분자가 3의 배수면 `beatsPerBar = N/3`, `subsPerBeat = 3`으로 보낸다.

- `6/8` → 2박 × 3
- `9/8` → 3박 × 3
- `12/8` → 4박 × 3

강세는 엔진이 이미 "각 박의 첫 분할(sub 0)만 크게(gain 1.0), 나머지는 약하게(0.75)" 처리하고 있어서, 큰 박(8분음표 1·4·7…)에 자동으로 강세가 얹힌다. 3의 배수가 아닌 `/8`(5/8, 7/8 등)은 일단 8분음표 N개로 두고 불규칙 그룹핑(2+3 등)은 추후로 남겼다.

---

### /8일 때 분할 컨트롤 잠그기 (조건부 UI)

컴파운드(`/8`)는 이미 8분음표가 기본 분할이라, 별도 "Subdivision" 컨트롤은 의미가 없다. 그래서 `/8`일 때 스피너를 잠근다. `isEnabled = false`만 하면 동작만 막히고 눈에 안 띄어서, `alpha`로 회색 처리를 함께 준다.

```kotlin
private fun updateSubdivisionEnabled() {
    val enabled = denominator == 4
    binding.spinnerSubs.isEnabled = enabled
    binding.spinnerSubs.alpha = if (enabled) 1.0f else 0.4f
}
```

---

## 드로어블 / 인디케이터

### 벡터 tint 공유 버그와 mutate()

발자국은 벡터 하나를 깔고 `backgroundTintList`로 현재 박만 색을 바꾼다. 그런데 리소스에서 꺼낸 드로어블은 `ConstantState`를 공유해서, 한 점에 tint를 걸면 같은 상태를 공유하는 다른 점까지 색이 번질 수 있다. 각 점의 배경을 `mutate()`해서 상태를 복제하면 독립적으로 물든다.

```kotlin
// ❌ 상태 공유 — 한 점 tint가 다른 점까지 번질 수 있음
dot.background = ContextCompat.getDrawable(this, R.drawable.ic_paw)

// ✅ mutate로 각 점 독립
dot.background = ContextCompat.getDrawable(this, R.drawable.ic_paw)?.mutate()
dot.backgroundTintList = ColorStateList.valueOf(color)
```

---

### 인디케이터 동적 2줄 배치

발자국을 키우니 박이 많을 때 한 줄에 안 들어갔다. 점 개수가 일정 수 이상이면 두 줄로 나눈다. 세로에서 5개를 기준으로 잡았다.

```kotlin
val totalDots = beats * subs
val useTwoRows = isPortrait && totalDots >= 5
val perRow = (totalDots + 1) / 2   // 홀수면 첫 줄에 하나 더
```

---

### dimens로 크기, 여백으로 가로 넘침 관리

인디케이터 크기는 코드가 아니라 `dimens.xml`에 둬서 레이아웃이 읽게 한다. 점을 키우면 한 줄에 들어가는 개수가 줄어서, 여백을 같이 줄여 넘침을 관리한다(크기 ↔ 개수 트레이드오프).

```xml
<dimen name="indicator_size">56dp</dimen>
<dimen name="indicator_sub_size">30dp</dimen>
<dimen name="indicator_margin">6dp</dimen>
<dimen name="indicator_sub_margin">4dp</dimen>
```

---

## 스피너

### 스피너 초기 onItemSelected auto-fire 주의

`Spinner`는 어댑터가 붙고 처음 배치될 때 `onItemSelected`가 한 번 자동으로 불린다 — 리스너를 `setSelection` 뒤에 등록해도 그렇다. 그래서 초기 상태를 이 콜백에 의존하면 순서가 꼬일 수 있다. 기본값은 리스너 등록 전에 `setSelection`으로 정해두고, 초기 계산은 auto-fire에 맡기지 말고 셋업 끝에 명시적으로 한 번 돌린다.

```kotlin
spinner.setSelection(defaultIndex)        // 리스너 붙이기 전에 기본값
spinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
    override fun onItemSelected(p: AdapterView<*>, v: View?, pos: Int, id: Long) { /* ... */ }
    override fun onNothingSelected(p: AdapterView<*>) {}
}
// 초기 상태는 auto-fire에 의존하지 말고 직접 확정
updateSubdivisionEnabled()
recomputeMeter()
```
