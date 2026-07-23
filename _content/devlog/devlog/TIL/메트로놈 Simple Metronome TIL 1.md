---
layout: post
title: 메트로놈 Simple Metronome TIL 1
date: 2026-07-06
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
  - Gradle
---
메트로놈 앱에 강아지 테마를 붙이면서 나온 안드로이드 기법들을 한데 모았다. 서명 비밀번호를 git에서 빼는 법, 앱 안에서 테마를 통째로 갈아끼우는 법, 색을 하드코딩하지 않고 테마 속성으로 참조하는 법, 그리고 인디케이터를 벡터로 그리고 색만 바꿔 켜는 법까지.

---

## 보안 / 빌드

### 서명 키스토어와 비밀번호는 git에 올리지 않는다

release 서명에 쓰는 키스토어 파일과 비밀번호가 git에 들어가면, 그 저장소를 가진 누구나 내 이름으로 앱을 서명할 수 있다. 비밀번호는 `keystore.properties`(gitignored)로 빼고, 빌드 스크립트가 그 파일에서 읽게 한다. 파일이 없는 클론에서도 debug 빌드는 되도록 존재 여부를 검사한다.

```kotlin
import java.util.Properties

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) keystorePropsFile.inputStream().use { load(it) }
}

android {
    signingConfigs {
        create("release") {
            if (keystorePropsFile.exists()) {
                storeFile     = file("simpleMetronomeKeystore")
                storePassword = keystoreProps.getProperty("KEYSTORE_PASSWORD")
                keyAlias      = keystoreProps.getProperty("KEY_ALIAS")
                keyPassword   = keystoreProps.getProperty("KEY_PASSWORD")
            }
        }
    }
}
```

`.gitignore`에는 비밀번호 파일과 키스토어, 빌드 산출물을 함께 막는다.

```gitignore
keystore.properties
/app/simpleMetronomeKeystore
*.keystore
*.jks
/app/release/
```

---

### Gradle Kotlin DSL에서 `java.util.Properties`가 안 풀리는 이유

위 코드를 처음엔 `java.util.Properties()`라고 풀네임으로 썼는데 빌드가 `Unresolved reference: util`로 죽었다. `build.gradle.kts`(Kotlin DSL) 스코프에는 Gradle이 넣어주는 `java` 접근자가 이미 있어서, `java.util…`의 `java`가 패키지가 아니라 그 접근자로 먼저 잡힌다. 파일 맨 위에 import를 넣어 이름을 확정하면 해결된다.

```kotlin
// ❌ java 가 Gradle 접근자로 잡혀 실패
val p = java.util.Properties()

// ✅ import 로 이름 고정
import java.util.Properties
val p = Properties()
```

---

## 테마 시스템

### 런타임 테마 전환 — setTheme는 setContentView 전에, recreate로 재적용

앱 안에서 테마(기본 ↔ 강아지)를 바꾸려면 `setTheme()`를 뷰가 만들어지기 **전에** 불러야 한다. 이미 그려진 화면엔 새 테마가 안 먹기 때문이다. 바꿀 때는 선택을 저장하고 `recreate()`로 액티비티를 다시 만든다. ViewModel(`SavedStateHandle`)에 들어 있는 BPM·재생 상태는 recreate에도 살아남는다.

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val isDog = prefs.getString(KEY_THEME, "base") == "dog"
    setTheme(if (isDog) R.style.Theme_SimpleMetronome_Dog else R.style.Theme_SimpleMetronome)
    binding = ActivityMainBinding.inflate(layoutInflater)  // setTheme 이후에 inflate
    setContentView(binding.root)
}

binding.btnTheme.setOnClickListener {
    prefs.edit().putString(KEY_THEME, next).apply()
    recreate()   // 새 테마로 재생성, ViewModel 상태 유지
}
```

---

### 색 하드코딩 대신 커스텀 테마 속성(attr)

레이아웃과 드로어블이 색을 `@color/...`로 박아두면 테마만 바꿔선 색이 안 변한다. 커스텀 속성을 선언하고 `?attr/`로 참조하게 하면, 두 테마가 같은 속성을 값만 다르게 채워 화면 전체가 한 번에 따라온다.

```xml
<!-- attrs.xml : 속성 이름만 선언 -->
<attr name="mtBg" format="color" />
<attr name="mtInk" format="color" />
<attr name="mtAccent" format="color" />
```

```xml
<!-- themes.xml : 두 테마가 값만 다르게 -->
<style name="Theme.SimpleMetronome">
    <item name="mtBg">@color/background</item>
    <item name="mtInk">@color/colorOnPrimary</item>
</style>
<style name="Theme.SimpleMetronome.Dog">
    <item name="mtBg">@color/dog_bg</item>
    <item name="mtInk">@color/dog_ink</item>
</style>
```

```xml
<!-- 레이아웃 : @color 대신 ?attr -->
<TextView android:textColor="?attr/mtInk" />
```

---

### 스피너 팝업은 페이지와 반전된 색이다

스피너를 펼쳤을 때 뜨는 팝업은 페이지와 반대 색을 쓴다. 다크 테마 기준으로 페이지는 어두운 배경 + 밝은 글씨인데, 팝업은 밝은 배경 + 어두운 글씨다. 그래서 페이지용 색을 그대로 팝업에 쓰면 글씨가 안 보인다. 팝업 전용 속성을 따로 둬야 두 테마 모두에서 정상으로 보인다.

```xml
<item name="mtPopupBg">@color/colorOnPrimary</item>  <!-- 밝은 배경 -->
<item name="mtPopupInk">@color/background</item>      <!-- 어두운 글씨 -->
```

---

### 상태바 아이콘 명암을 테마에 맞추기

배경이 밝은(크림) 강아지 테마에선 상태바 아이콘이 어두워야 보이고, 어두운 기본 테마에선 밝아야 보인다. `isAppearanceLightStatusBars`가 이걸 결정한다 — true면 "밝은 배경"이라는 뜻이라 아이콘이 어두워진다.

```kotlin
WindowCompat.getInsetsController(window, binding.root).apply {
    isAppearanceLightStatusBars = isDog       // 밝은 배경 → 어두운 아이콘
    isAppearanceLightNavigationBars = isDog
}
```

---

### `?attr` 색을 코드에서 런타임 int로 해석

인디케이터 색은 코드에서 칠하기 때문에 `?attr/mtAccent` 같은 속성을 실제 색 int로 풀어야 한다. `theme.resolveAttribute`로 현재 테마에서 값을 뽑는다. 속성이 `@color` 리소스를 가리키면 `resourceId`로, 직접 색이면 `data`로 온다.

```kotlin
private fun themeColor(attr: Int): Int {
    val tv = TypedValue()
    theme.resolveAttribute(attr, tv, true)
    return if (tv.resourceId != 0) ContextCompat.getColor(this, tv.resourceId) else tv.data
}
```

---

## 인디케이터 / 드로어블

### 벡터 + backgroundTintList로 점등 — drawable 교체 대신 리틴트

비트가 켜질 때마다 켜진 그림/꺼진 그림을 갈아끼우는 대신, 벡터 하나를 깔고 `backgroundTintList`로 색만 바꾼다. 그림이 하나라 관리가 쉽고, 색을 테마에서 뽑아 쓰니 테마 전환에도 자동으로 맞는다. 첫 박만 강아지 얼굴, 나머지는 발자국을 배경으로 준다.

```kotlin
dot.background = ContextCompat.getDrawable(
    this, if (idx == 0) R.drawable.ic_dog else R.drawable.ic_paw
)
// 켜짐/꺼짐은 tint 로만
dot.backgroundTintList = ColorStateList.valueOf(if (on) accent else off)
```

---

### 벡터 path의 arc(a) 커맨드로 원·타원 그리기

발자국·강아지 얼굴은 이미지가 아니라 벡터 `path`로 그렸다. 원과 타원은 arc 커맨드 `a`를 반 바퀴씩 두 번 이어 만든다 — `a rx,ry 0 1,0 dx,dy`가 반원, 그 반대로 한 번 더 하면 닫힌 원이 된다. `fillColor`는 흰색으로 두고 실제 색은 위의 런타임 tint로 입힌다.

```xml
<!-- 발가락 타원 하나 (중심에서 반 바퀴 + 반 바퀴) -->
<path
    android:fillColor="#FFFFFF"
    android:pathData="M6.1,7.6 a2,2.4 0 1,0 4,0 a2,2.4 0 1,0 -4,0 Z" />
```

여러 개의 subpath(발가락 4개 + 발바닥)를 한 벡터에 넣으면 발자국 하나가 된다. 단색 실루엣이라 tint 한 번으로 전체 색이 바뀐다.
