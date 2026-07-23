---
layout: post
title: 메트로놈 Simple Metronome 4
date: 2026-07-06
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

- git 없이 관리되던 프로젝트를 저장소로 만들고, 평문으로 노출돼 있던 서명 비밀번호를 `keystore.properties`로 분리해 gitignore 처리
- 비트 인디케이터를 벡터로 교체 — 첫 박은 강아지 얼굴, 나머지는 발자국. 켜짐/꺼짐은 drawable을 갈아끼우지 않고 `backgroundTintList`로 색만 바꿈
- 기본(다크) ↔ 강아지(크림·밤색) 테마 전환 토글 추가. 색을 커스텀 테마 속성(`?attr/mt*`)으로 바꿔 테마만 바꿔도 화면 전체가 따라오게 함

---

## 막힌 부분

### Gradle Kotlin DSL에서 `java.util.Properties`가 안 풀렸다

`keystore.properties`를 읽으려고 `java.util.Properties()`를 썼더니 빌드가 `Unresolved reference: util`로 죽었다. Kotlin DSL(`build.gradle.kts`)에는 `java`라는 Gradle 접근자가 이미 있어서, `java.util…`의 `java`가 패키지가 아니라 그 접근자로 먼저 잡혀 버린 것이다. 파일 맨 위에 import를 넣어 이름을 확정했다.

```kotlin
import java.util.Properties

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) keystorePropsFile.inputStream().use { load(it) }
}
```

### 테마를 바꿔도 색이 안 따라왔다

레이아웃과 드로어블이 색을 `@color/...`로 하드코딩하고 있어서, 테마만 바꿔선 색이 그대로였다. 커스텀 속성을 만들어 `?attr/`로 참조하게 바꾸고, 두 테마가 값만 다르게 채우도록 했다.

```xml
<!-- attrs.xml -->
<attr name="mtBg" format="color" />
<attr name="mtInk" format="color" />
<attr name="mtAccent" format="color" />
```

스피너 팝업만은 페이지와 반대 색(밝은 배경 + 어두운 글씨)이라, 팝업 전용 색(`mtPopupBg`/`mtPopupInk`)을 따로 뒀다.

---

## 다음에 할 일

- 인디케이터 크기 키우기 (지금 너무 작음)
- 강아지 표시를 이모지(🐶 / 🐾) 느낌으로 — 기기별 렌더 차이와 테마 틴트 불가 트레이드오프를 두고 방향 결정
