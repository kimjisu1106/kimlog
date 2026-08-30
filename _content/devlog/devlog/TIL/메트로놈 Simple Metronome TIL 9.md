---
layout: post
title: 메트로놈 Simple Metronome TIL 9
date: 2026-08-19
permalink: "devlog/devlog/TIL/메트로놈 Simple Metronome TIL 9"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 설정에 문의하기를 만들며 익힌 것들 — 메일 앱을 여는 mailto 인텐트, 기기·앱 정보 읽기, 크래시 방어, 그리고 무엇을 담아도 되는지의 경계.
tags:
  - Android-Studio
  - Kotlin
---
## 문의 메일 열기

문의는 앱이 직접 보내는 게 아니라, 수신자·제목·본문을 미리 채운 메일을 사용자의 메일 앱에서 열어 주는 방식이다.

### mailto로 메일 앱만 열기

`ACTION_SEND`는 공유 가능한 온갖 앱이 뜨지만, `ACTION_SENDTO`에 `mailto:` 주소를 주면 이메일을 처리하는 앱만 후보로 걸러진다. 제목·본문은 인텐트 extra로 채운다.

```kotlin
val intent = Intent(Intent.ACTION_SENDTO).apply {
    data = Uri.parse("mailto:support@logstone.net")
    putExtra(Intent.EXTRA_SUBJECT, getString(R.string.contact_subject))
    putExtra(Intent.EXTRA_TEXT, body)
}
startActivity(intent)
```

### 본문에 기기·환경 정보 담기

문의가 오면 어떤 기기·버전에서 생긴 일인지 알아야 대응이 된다. 권한 없이 읽을 수 있는 기기·환경 값을 본문에 붙였다.

```kotlin
"${Build.MANUFACTURER} ${Build.MODEL}"                       // 예: samsung SM-S911N
"Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"  // 예: Android 14 (API 34)
Locale.getDefault().toLanguageTag()                          // 예: ko-KR
```

`Build`는 기기·OS 정보를 담은 표준 클래스이고, `toLanguageTag()`는 현재 언어를 `ko-KR` 같은 표준 문자열로 준다. 모두 권한이 필요 없고 개인을 식별하지 않는다.

### BuildConfig 없이 앱 버전 읽기

이 앱은 빌드 설정에서 `BuildConfig`를 켜지 않아 `BuildConfig.VERSION_NAME`을 못 쓴다. 대신 패키지 매니저에서 자기 패키지 정보를 꺼냈다. 버전 코드는 옛 API에선 `Int`, 이후 `Long`으로 바뀌어, 호환 헬퍼로 안전하게 읽는다.

```kotlin
val info = packageManager.getPackageInfo(packageName, 0)
val ver = "${info.versionName} (${PackageInfoCompat.getLongVersionCode(info)})"
```

### 메일 앱이 없을 때 크래시 막기

`ACTION_SENDTO`는 받아 줄 앱이 없으면 `ActivityNotFoundException`으로 앱이 죽는다. 예외를 잡아 토스트로 주소를 안내해, 메일 앱이 없어도 주소는 알 수 있게 했다.

```kotlin
try {
    startActivity(intent)
} catch (e: ActivityNotFoundException) {
    Toast.makeText(this, R.string.contact_no_email, Toast.LENGTH_LONG).show()
}
```

---

## 담을 정보의 경계

### 개인정보 경계 — 담아도 되는 것 / 안 되는 것

기기 정보를 메일에 담는 건 크래시 리포트에서 흔한 방식이고, 아래 조건이면 문제가 없다.

- 앱이 몰래 보내는 게 아니라 사용자가 본문을 보고 직접 보낸다 — 지우거나 고칠 수 있으니 동의·투명이 확보된다.
- 담는 값이 권한이 필요 없고 개인을 식별하지 않는다 — 앱 버전, 기기 모델, OS, 언어.
- 광고 ID·Android ID·위치처럼 개인정보로 분류돼 별도 고지가 필요한 값은 담지 않는다.

즉 "무엇을 담느냐"와 "누가 보내느냐" 둘 다가 경계를 정한다.

### 체크박스로 포함 여부를 사용자에게

필수는 아니지만, 포함 여부를 끄고 켜는 체크박스를 둬서 명시적 동의를 한 겹 더 뒀다. 체크 상태로 본문을 가른다.

```kotlin
val body = if (binding.settingsPanel.cbContactInfo.isChecked)
    "$intro\n\n\n— — —\n$diag" else intro
```

### String 리소스 다인자 포맷

진단 정보 형식은 코드가 아니라 문자열 리소스에 두고, 값 네 개를 포맷 인자로 끼워 넣었다. 형식을 언어별 리소스로 관리하면서 값만 코드에서 채운다.

```xml
<string name="contact_diag">앱 버전: %1$s\n기기: %2$s\nOS: %3$s\n언어: %4$s</string>
```

```kotlin
getString(R.string.contact_diag, ver, device, os, lang)
```

---

## 요약

- 문의는 `ACTION_SENDTO` + `mailto:`로 메일 앱만 열어 제목·본문을 미리 채운다. 앱이 보내는 게 아니라 사용자가 보낸다.
- 담을 정보는 권한 없이 읽는 비식별 값(앱 버전·기기·OS·언어)만 — 광고 ID·위치는 제외. `BuildConfig`가 없으면 패키지 매니저로 버전을 읽는다.
- 인텐트를 받을 앱이 없을 수 있으니 `ActivityNotFoundException`을 잡아 대비한다.
- 정보를 담아도 되는지는 "무엇을·누가 보내느냐"가 함께 정한다. 포함 여부를 체크박스로 사용자에게 넘기면 동의가 더 분명해진다.
