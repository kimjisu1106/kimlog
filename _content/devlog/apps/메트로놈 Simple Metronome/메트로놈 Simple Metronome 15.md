---
layout: post
title: 메트로놈 Simple Metronome 15
date: 2026-08-19
permalink: "38h3l094"
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: 설정에 문의하기를 넣어 support 메일로 바로 보내고, 기기·앱 정보를 원하면 함께 담게 만든 v1.18 기록 — mailto 본문 프리필과 개인정보 경계.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 설정 드로어(플래시와 프리셋 사이)에 문의 섹션 추가 — `support@logstone.net` 표시, 탭하면 메일 앱이 열림
- "기기·앱 정보 포함" 체크박스(기본 켜짐) — 켜면 앱 버전·기기·OS·언어를 메일 본문에 미리 채움
- 문의 v1.18 출시

---

## 막힌 부분

### 문의 메일에 기기 정보를 담아도 되나 — 개인정보 경계

문제 문의가 오면 어떤 버전·기기에서 생긴 일인지 알아야 대응이 되는데, 기기 정보를 메일에 담는 게 개인정보 문제가 되는지부터 갈라야 했다.

정리한 기준은 이렇다.

- 정보를 본문에 미리 채우기만 하고, 실제로 보내는 건 사용자 본인이다 — 화면에서 보고 지우거나 고쳐서 보낼 수 있으니 동의·투명이 확보된다.
- 담는 것은 권한이 필요 없고 개인 식별이 안 되는 것만 — 앱 버전, 기기 모델(제조사+모델명), Android 버전, 언어.
- 담지 않는 것 — 광고 ID·Android ID·위치처럼 개인정보로 분류돼 별도 고지가 필요한 것.
- 한 발 더 — "기기·앱 정보 포함" 체크박스로 사용자가 포함 여부를 직접 끄고 켤 수 있게 했다. 필수는 아니지만 명시적 동의를 한 겹 더 둔 셈이다.

메일은 앱에서 직접 보내는 게 아니라 메일 앱을 여는 방식이다. 수신자·제목·본문을 미리 채워 `ACTION_SENDTO`로 넘긴다.

```kotlin
val intent = Intent(Intent.ACTION_SENDTO).apply {
    data = Uri.parse("mailto:" + getString(R.string.contact_address))
    putExtra(Intent.EXTRA_SUBJECT, getString(R.string.contact_subject))
    putExtra(Intent.EXTRA_TEXT, body)
}
```

- 해결: 진단 정보는 체크가 켜졌을 때만 본문에 붙임. 광고 ID·위치 등은 넣지 않음.

### 앱 버전을 BuildConfig 없이 읽기

이 앱은 빌드 설정에서 `BuildConfig`를 켜지 않아, `BuildConfig.VERSION_NAME`으로 버전을 못 읽는다. 대신 패키지 매니저에서 자기 패키지 정보를 꺼내 버전을 얻었다. 버전 코드는 옛 API에선 `Int`였다가 나중에 `Long`으로 바뀌어, 구버전 기기까지 안전한 호환 헬퍼를 썼다.

```kotlin
val info = packageManager.getPackageInfo(packageName, 0)
val ver = "${info.versionName} (${PackageInfoCompat.getLongVersionCode(info)})"
```

- 해결: `PackageInfoCompat.getLongVersionCode`로 minSdk 24에서도 버전 코드를 안전하게 읽음.

- 메일 앱이 없는 기기 대응: `ACTION_SENDTO`는 받을 앱이 없으면 예외(`ActivityNotFoundException`)로 앱이 죽는다. 예외를 잡아 토스트로 주소를 안내하게 했다.

---

## 다음에 할 일

- (deferrable) 이어폰을 뽑으면 자동으로 멈추게 할지, 오디오 포커스를 받을지 검토
- 첫 박이 둘째 박보다 조금 작게 들리는 이슈 — 다른 기기·헤드폰으로 재확인
