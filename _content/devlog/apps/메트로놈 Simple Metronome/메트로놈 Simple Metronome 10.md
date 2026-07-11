---
layout: post
title: 메트로놈 Simple Metronome 10
date: 2026-07-11
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
description: 인디케이터 점/발자국 선택·첫 실행 사용법 안내·영한 다국어를 붙이고, 슬라이더·박자표·Play 배치를 다듬고, 태블릿에서 광고가 네비바에 가리던 문제를 고쳐 v1.13으로 출시 준비를 마쳤다.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 인디케이터 모양 선택 — 설정에서 점(기본)/발자국 택1 (무료)
- 첫 실행 사용법 안내 — 첫 실행 때 한 번 카드로, 이후엔 설정의 "사용 방법"으로 언제든
- 설정 헤더 정리 — 전체폭 "화면 회전"·"사용 방법" 버튼을 헤더 우측 아이콘 2개로
- 레이아웃 다듬기 — 슬라이더 트랙·핸들 키움, 세로 ± 줄을 Play 줄 폭에 맞춰 슬라이더 늘림, 가로는 박자표를 ± 줄로 올림, 세로 Play 높이를 박자표 박스에 맞춤
- 태블릿에서 광고가 하단 네비바에 가리던 문제 수정
- 영어/한국어 다국어 — 기본 영어 + `values-ko`, 기기 언어 자동 전환(`localeConfig`로 앱별 언어도)
- 미사용 문자열 정리 후 v1.13(versionCode 13) 릴리스 빌드 → Google Play 프로덕션 출시 시작, 스토어 스크린샷 새로 교체

---

## 막힌 부분

### 태블릿에서만 광고가 하단 네비바에 가림

가로일 때 하단 인셋을 `if (isLandscape) 0`으로 무조건 눌러버린 게 문제였다. "가로 = 네비바가 옆에 있다"는 가정인데, 휴대폰은 맞지만 태블릿은 가로에서도 하단 네비바가 그대로 있어서 광고가 그 밑에 깔렸다. 특수 케이스를 없애고 시스템이 주는 `bars.bottom`을 그대로 믿으니 둘 다 알아서 맞았다 — 휴대폰 가로는 네비바가 우측이라 `bars.bottom == 0`(광고 바닥에 붙음), 태블릿 가로는 네비바 높이만큼 광고가 위로 올라간다.

```kotlin
ViewCompat.setOnApplyWindowInsetsListener(binding.contentRoot) { v, insets ->
    val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
    v.updatePadding(top = bars.top, left = bars.left, right = bars.right, bottom = bars.bottom)
    insets
}
```

### 세로 Play 버튼이 박자표 박스보다 짧아 보임

Play를 `layout_height="match_parent"`로 뒀는데도 박자표보다 짧았다. `MaterialButton`의 기본 `insetTop/insetBottom`이 각각 6dp라, 뷰는 줄 높이를 채워도 그려지는 배경은 위아래 12dp 안쪽으로 들어가서다. 인셋을 0으로 없애니 배경이 줄 높이(=박자표 높이)를 꽉 채웠다.

```xml
<com.google.android.material.button.MaterialButton
    android:id="@+id/btnToggle"
    android:layout_height="match_parent"
    android:insetTop="0dp"
    android:insetBottom="0dp"
    ... />
```

여기서 줄 높이가 박자표 높이가 되는 건, 가로 `LinearLayout`이 `wrap_content` 높이일 때 `match_parent` 자식(Play)은 높이 계산에서 빠지고, `wrap_content` 형제 중 가장 큰 것(박자표)이 줄 높이를 정하기 때문이다.

### 슬라이더가 얇고 짧음

트랙은 커스텀 드로어블 없이 `min/maxHeight`로 두껍게, 핸들은 `oval` 셰이프 드로어블의 `<size>`로 키우고, 슬라이더 폭은 `0dp` + `weight`로 아래 Play 줄과 같은 폭이 되게 늘렸다.

```xml
<SeekBar
    android:layout_width="0dp"
    android:layout_weight="1"
    android:minHeight="12dp"
    android:maxHeight="12dp"
    android:thumb="@drawable/seekbar_thumb"
    android:thumbTint="?attr/mtAccent" />
```

---

## 다음에 할 일

- 프로덕션 검토 통과 대기 + 출시 후 크래시·리뷰 모니터링, 태블릿 실기기 확인
- 백그라운드 재생(포그라운드 서비스 + 알림) — 태블릿에 악보 켜두고 트는 시나리오
