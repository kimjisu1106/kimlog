---
layout: post
title: 메트로놈 Simple Metronome 11
date: 2026-08-10
permalink: "devlog/apps/메트로놈 Simple Metronome/메트로놈 Simple Metronome 11"
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: v1.14 백그라운드 재생을 출시하려고 Play Console에 포그라운드 서비스 권한을 선언하고, 백그라운드 재생을 보여주는 데모 영상을 찍어 제출한 기록.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- Play Console에 v1.14 제출 — `FOREGROUND_SERVICE_MEDIA_PLAYBACK` 권한을 "미디어 재생" 용도로 선언
- 백그라운드 재생을 보여주는 데모 영상 촬영·업로드 (재생 → 다른 앱으로 전환해도 소리 유지 → 알림에서 정지)
- 심사 영상용으로 debug 빌드에서만 배너 광고를 숨김 (릴리스는 그대로 노출)

---

## 막힌 부분

### 심사 영상에 광고가 찍히는 문제

데모 영상에 배너 광고가 나오면 지저분하다. 릴리스는 광고를 그대로 두되, debug 빌드에서만 배너를 숨겼다. `BuildConfig`를 안 켜서 `applicationInfo.flags`의 `FLAG_DEBUGGABLE`로 판별한다. 릴리스 buildType은 `isDebuggable`을 안 켜므로 릴리스에선 광고가 정상 노출된다. 영상은 에뮬레이터 debug 빌드로 촬영.

```kotlin
val debuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
if (debuggable) binding.adView.visibility = View.GONE
else { MobileAds.initialize(this) {}; binding.adView.loadAd(AdRequest.Builder().build()) }
```

### 데모 영상은 비공개(Private)면 안 된다

처음엔 영상을 비공개로 올리려 했는데, 비공개는 나와 초대한 사람만 볼 수 있어서 심사자가 못 본다. 링크 있는 사람만 보되 검색엔 안 뜨는 미등록(Unlisted) 으로 올려야 심사자가 링크로 열 수 있다. 개인 폰 화면 노출이 걱정되면 에뮬레이터로 찍으면 된다.

---

## 다음에 할 일

- 심사 통과 대기 → 통과 후 릴리스 빌드를 실기기에 올려 광고가 실제로 뜨는지 확인 (debug는 숨김이라 꼭 체크)
- (deferrable) 잠금화면 미디어 컨트롤 — `MediaSession` + `MediaStyle`
