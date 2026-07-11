---
layout: post
title: 메트로놈 Simple Metronome TIL 6
date: 2026-07-11
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 메트로놈 v1.13을 다듬으며 익힌 것들 — 시스템 인셋을 믿는 광고 배치, SeekBar 트랙·핸들 크기, 뷰 높이 맞추기, 그리고 기기 언어에 따라 자동으로 바뀌는 다국어까지.
tags:
  - Android-Studio
  - Kotlin
---
출시 직전 다듬기에서 나온 것들. 설정 옵션 하나 늘리는 흐름, 레이아웃 높이·폭을 다른 뷰에 맞추는 법, 시스템 인셋을 신뢰해서 기기별로 알아서 맞게 하는 법, 그리고 기본 리소스만 나눠서 기기 언어에 따라 한/영이 자동으로 바뀌게 하는 법까지.

---

## 설정 · 상태

### 설정 옵션 하나 늘리기 — 라디오 + prefs 저장/복원

인디케이터 모양(점/발자국)처럼 옵션 하나를 추가하는 흐름은 늘 같다. `SharedPreferences`에서 초기값을 읽어 라디오를 맞추고, 바뀌면 저장하고 화면에 반영한다.

```kotlin
indicatorShape = prefs.getString(KEY_INDICATOR, INDICATOR_DOT) ?: INDICATOR_DOT
binding.settingsPanel.rgIndicator.check(
    if (indicatorShape == INDICATOR_PAW) R.id.rbIndicatorPaw else R.id.rbIndicatorDot
)
binding.settingsPanel.rgIndicator.setOnCheckedChangeListener { _, id ->
    indicatorShape = if (id == R.id.rbIndicatorPaw) INDICATOR_PAW else INDICATOR_DOT
    prefs.edit().putString(KEY_INDICATOR, indicatorShape).apply()
    applyIndicatorShapes()
}
```

---

### 인디케이터 모양을 데이터로 바꾸기 — 점등은 tint

인디케이터는 각 박이 `View`이고 `background`에 drawable을 깐다. 모양 교체는 그 drawable만 바꾸면 된다. 켜짐/꺼짐은 drawable을 갈아끼우는 게 아니라 `backgroundTintList`(색)만 바꾸는데, 그래서 스킨은 단색 실루엣이면 테마 색·서브박 축소에 그대로 대응한다.

```kotlin
private fun applyIndicatorShapes() {
    val off = themeColor(R.attr.mtIndicatorOff)
    val shapeRes = if (indicatorShape == INDICATOR_PAW) R.drawable.ic_paw else R.drawable.ic_dot
    for (dot in indicatorViews) {
        dot.background = ContextCompat.getDrawable(this, shapeRes)?.mutate()
        dot.backgroundTintList = ColorStateList.valueOf(off)
    }
}
```

---

### 첫 실행 안내 — 플래그 하나로 1회, 다이얼로그는 재사용

첫 실행 온보딩은 `SharedPreferences` 플래그 하나면 된다. 처음이면 보여주고 플래그를 올린다. 그리고 그 안내를 설정의 "사용 방법" 버튼과 같은 함수로 공유하면 유지보수가 한 곳에 모인다.

```kotlin
binding.settingsPanel.btnHelp.setOnClickListener { showHelp() }
if (!prefs.getBoolean(KEY_ONBOARDED, false)) {
    showHelp()
    prefs.edit().putBoolean(KEY_ONBOARDED, true).apply()
}

private fun showHelp() {
    AlertDialog.Builder(this)
        .setTitle(R.string.help_title)
        .setMessage(R.string.help_body)
        .setPositiveButton(R.string.confirm, null)
        .show()
}
```

---

## 레이아웃

### 헤더를 아이콘 행으로 — weight로 좌우 배치

전체폭 버튼(회전·사용법)을 헤더 우측 아이콘으로 옮겼다. 가로 `LinearLayout`에서 제목에 `weight=1`을 주면 남는 폭을 다 먹어 아이콘들이 우측 끝으로 밀린다.

```xml
<LinearLayout android:orientation="horizontal" android:gravity="center_vertical">
    <TextView android:layout_width="0dp" android:layout_weight="1" android:text="@string/settings" />
    <ImageView android:id="@+id/btnRotateSetting" android:src="@drawable/ic_screen_rotation" />
    <ImageView android:id="@+id/btnHelp" android:src="@drawable/ic_help" />
</LinearLayout>
```

---

### SeekBar 트랙·핸들 키우기

트랙(라인) 두께는 커스텀 progressDrawable 없이 `min/maxHeight`로 조절되고, 핸들 크기는 `android:thumb`에 연결한 드로어블의 `<size>`로 정해진다. 색은 `thumbTint`가 덮으니 shape 색은 아무거나 둬도 된다.

```xml
<SeekBar
    android:minHeight="12dp"
    android:maxHeight="12dp"
    android:thumb="@drawable/seekbar_thumb"
    android:thumbTint="?attr/mtAccent" />
```

```xml
<!-- seekbar_thumb.xml -->
<shape android:shape="oval">
    <solid android:color="#FFFFFF" />
    <size android:width="28dp" android:height="28dp" />
</shape>
```

---

### 슬라이더 폭을 옆 줄과 맞추기

슬라이더가 짧아 보인 건 줄 자체가 `wrap_content`라 좁았기 때문. ± 줄을 `match_parent` + 아래 Play 줄과 같은 좌우 패딩으로 두고, 슬라이더는 `0dp` + `weight`로 양쪽 버튼 사이를 채우니 Play 줄과 폭이 딱 맞았다.

```xml
<SeekBar android:layout_width="0dp" android:layout_weight="1" ... />
```

---

### 버튼 높이를 형제 뷰에 맞추기

Play 버튼을 `match_parent` 높이로 줬는데도 박자표 박스보다 짧았다. `MaterialButton`의 기본 `insetTop/insetBottom`이 각각 6dp라, 뷰는 줄 높이를 채워도 그려지는 배경이 위아래 12dp 안쪽으로 들어가서다. 인셋을 0으로 없애니 배경이 줄 높이를 꽉 채웠다.

```xml
<com.google.android.material.button.MaterialButton
    android:layout_height="match_parent"
    android:insetTop="0dp"
    android:insetBottom="0dp" ... />
```

여기서 "줄 높이 = 박자표 높이"가 되는 이유가 핵심이다. 가로 `LinearLayout`이 `wrap_content` 높이일 때, `match_parent` 자식(Play)은 줄 높이 계산에서 빠지고, `wrap_content` 형제 중 가장 큰 것(박자표)이 줄 높이를 정한다. 그래서 Play가 자동으로 박자표 높이를 따라간다.

---

### Vector Drawable을 pathData로 직접

점·물음표 같은 아이콘은 이미지가 아니라 벡터다. Material 아이콘의 `pathData`를 그대로 넣고, 색은 `tint`(테마 attr)로 입혀 다크/크림에 자동 대응한다.

```xml
<vector android:width="24dp" android:height="24dp"
    android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFF"
        android:pathData="M12,12m-9,0a9,9 0 1,0 18,0a9,9 0 1,0 -18,0" />   <!-- 원(점) -->
</vector>
```

---

## 시스템 대응

### WindowInsets는 시스템 값을 그대로 믿기

태블릿에서 광고가 하단 네비바에 가렸다. 원인은 "가로면 하단 인셋을 0으로" 하드코딩한 것 — 휴대폰은 가로에서 네비바가 옆으로 가지만, 태블릿은 가로에서도 하단 네비바가 그대로다. 특수 케이스를 없애고 `bars.bottom`을 그대로 쓰니 둘 다 맞았다.

```kotlin
ViewCompat.setOnApplyWindowInsetsListener(binding.contentRoot) { v, insets ->
    val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
    v.updatePadding(top = bars.top, left = bars.left, right = bars.right, bottom = bars.bottom)
    insets
}
```

휴대폰 가로는 네비바가 우측이라 `bars.bottom == 0`(광고 바닥에 붙음), 태블릿 가로는 네비바 높이만큼 광고가 위로 올라간다. 내가 경우를 나누는 것보다 시스템이 주는 값을 믿는 게 옳았다.

---

### 다국어 — 기본 영어 + 한국어, 기기 언어 자동

한국어만 있던 앱을 한/영으로 만들 때, 코드 로직은 거의 필요 없다. 기본 리소스(`values/`)를 영어로 두고 한국어를 `values-ko/`로 나누면, 안드로이드가 기기 언어를 보고 알아서 고른다.

```
res/values/strings.xml       ← 기본 = 영어
res/values-ko/strings.xml    ← 한국어(기기 언어가 한국어일 때)
res/xml/locales_config.xml   ← <locale en/> <locale ko/>
```

```xml
<!-- AndroidManifest <application> -->
android:localeConfig="@xml/locales_config"
```

`localeConfig`를 선언하면 Android 13+에서 "설정 → 앱 → 언어"에 이 앱만 바꾸는 메뉴가 생겨, 기기 전체 언어를 안 바꿔도 테스트할 수 있다. 유일한 함정은 코드/레이아웃에 하드코딩된 문자열(다이얼로그 버튼, Play/Stop)을 빠짐없이 `R.string`으로 옮기는 것. 템포 이름(`Largo`·`Allegro`)은 이탈리아어 음악용어라 번역하지 않는다.

```kotlin
// 하드코딩 → 리소스
binding.btnToggle.text = getString(if (playing) R.string.stop else R.string.play)
```

---

## 빌드 · git

### debug 빌드 판별 — BuildConfig 없이

`BuildConfig`를 안 켰어도(`viewBinding`만 쓰는 경우) debug/release는 `applicationInfo`의 플래그로 구분할 수 있다. 스토어 스크린샷용으로 debug에서만 광고를 숨길 때 썼다(이후 되돌렸지만 판별 기법 자체는 유효).

```kotlin
val debuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
```

---

### IDE 설정 파일을 git에서 빼기

Android Studio가 실행할 때마다 바꾸는 `.idea/deploymentTargetSelector.xml` 같은 파일이 커밋에 자꾸 딸려왔다. `.gitignore`에 넣고 `--cached`로 추적만 해제하면 로컬 파일은 그대로 남고 git만 무시한다.

```bash
git rm --cached .idea/deploymentTargetSelector.xml .idea/deviceManager.xml
```

`.idea`는 전부 무시하면 안 된다 — AS가 공유용으로 관리하는 것(codeStyles·vcs 등)도 있어서, 실행할 때마다 바뀌는 노이즈 파일만 골라 빼는 게 맞다.

---

## 요약

- 옵션 추가는 늘 같은 흐름 — prefs 읽어 라디오 맞추고, 바뀌면 저장하고 반영.
- 뷰 높이·폭은 형제에 맞출 수 있다 — `weight`(폭), `match_parent`+`inset 0`(높이). `wrap_content` 줄 높이는 가장 큰 `wrap` 형제가 정한다.
- 기기별 차이(휴대폰 vs 태블릿 네비바)는 내가 나누지 말고 시스템 인셋을 그대로 믿을 것.
- 다국어는 리소스만 나누면 자동 — `values/`(기본) + `values-ko/`, `localeConfig`로 앱별 언어까지. 함정은 하드코딩 문자열 누락뿐.
