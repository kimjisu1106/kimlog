---
layout: post
title: 메트로놈 Simple Metronome TIL 10
date: 2026-08-29
permalink: "devlog/devlog/TIL/메트로놈 Simple Metronome TIL 10"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 이어폰 분리와 오디오 포커스로 재생을 자동 제어하며 익힌 것들 — becoming-noisy 브로드캐스트, 오디오 포커스 상실의 종류별 대응, 자동 재개를 위한 상태 분리.
tags:
  - Android-Studio
  - Kotlin
---
## 이어폰 분리 자동정지

이어폰을 뽑거나 블루투스가 끊기면 소리가 스피커로 튀어 갑자기 크게 울린다. 이걸 막으려고 그 순간 일시정지하게 했다.

### becoming-noisy — 정적 리시버로는 못 받는다

안드로이드는 오디오 출력이 스피커로 바뀌기 직전(이어폰 분리·BT 끊김)에 `ACTION_AUDIO_BECOMING_NOISY` 브로드캐스트를 쏜다. 그런데 이 액션은 매니페스트에 미리 적어 두는 정적 리시버로는 전달되지 않는다 — 반드시 코드에서 런타임에 등록해야 한다.

### RECEIVER_NOT_EXPORTED로 등록

Android 13(API 33)부터는 동적 리시버를 등록할 때 다른 앱에 노출할지(exported) 여부를 반드시 밝혀야 한다. 이 리시버는 시스템 브로드캐스트만 받으면 되므로 노출할 필요가 없다. `ContextCompat.registerReceiver`를 쓰면 구버전까지 이 플래그를 알아서 맞춰 준다.

```kotlin
ContextCompat.registerReceiver(
    this, r, IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
    ContextCompat.RECEIVER_NOT_EXPORTED
)
```

### 리시버는 재생 수명에 묶는다

안 울릴 때 리시버를 켜 둘 이유가 없다. 등록은 재생 시작 시, 해제는 일시정지·정지·서비스 종료 시. 이미 등록돼 있으면 다시 등록하지 않게 null로 가드하고, 끝나는 길마다 해제해 리시버가 새지 않게 한다.

```kotlin
private fun registerNoisy() {
    if (noisyReceiver != null) return
    ...
    noisyReceiver = r
}
private fun unregisterNoisy() {
    noisyReceiver?.let { unregisterReceiver(it) }
    noisyReceiver = null
}
```

---

## 오디오 포커스

이어폰 분리 말고도, 다른 앱이 음악을 켜거나 전화가 오면 메트로놈이 그 위로 겹쳐 울린다. "오디오 포커스"는 지금 누가 소리의 주인인지를 조율하는 시스템 장치다.

### 포커스를 요청하면 다른 앱이 양보한다

재생을 시작할 때 `AUDIOFOCUS_GAIN`을 요청하면, 소리를 내던 다른 앱이 물러난다(양보). 반대로 다른 앱이 포커스를 가져가면 우리에게 상실 신호가 온다. 요청·반납은 API 버전마다 방식이 달라, 호환 헬퍼 `AudioManagerCompat`을 썼다.

```kotlin
AudioManagerCompat.requestAudioFocus(audioManager, req)   // 재생 시작 시
AudioManagerCompat.abandonAudioFocusRequest(audioManager, req)  // 멈출 때
```

### 요청은 속성과 함께 만든다

포커스 요청 객체(`AudioFocusRequestCompat`)에는 어떤 종류의 소리인지(오디오 속성)와 상실을 받을 리스너를 담는다. 메트로놈은 미디어 재생으로 잡았다 — 잠금화면 미디어 컨트롤과 성격을 맞춘 것이다.

```kotlin
AudioFocusRequestCompat.Builder(AudioManagerCompat.AUDIOFOCUS_GAIN)
    .setAudioAttributes(
        AudioAttributesCompat.Builder()
            .setUsage(AudioAttributesCompat.USAGE_MEDIA)
            .setContentType(AudioAttributesCompat.CONTENT_TYPE_MUSIC)
            .build()
    )
    .setOnAudioFocusChangeListener(audioFocusListener)
    .build()
```

### 상실은 종류를 나눠 다룬다

핵심은 상실이 영구인지 잠깐인지 가르는 것이다.

```kotlin
when (change) {
    AudioManager.AUDIOFOCUS_LOSS ->            // 영구(다른 미디어 앱 등) → 정지
        { resumeOnFocusGain = false; if (playing) pauseInternal() }
    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ->  // 전화 등 잠깐 → 멈추되 포커스는 안 놓음
        { if (playing) { resumeOnFocusGain = true; pauseAudioOnly() } }
    AudioManager.AUDIOFOCUS_GAIN ->            // 되찾음 → 잠깐 멈췄던 거면 재개
        { if (resumeOnFocusGain && !playing) { resumeOnFocusGain = false; params?.let { startPlaying(it) } } }
    // AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK: 무시
}
```

### 자동 재개하려면 포커스를 놓지 않는다

전화가 끝났을 때 자동으로 이어서 울리려면, 잠깐 멈추는 동안 포커스 요청을 놓지 말아야 한다 — 놓으면 되찾음(`GAIN`) 신호가 오지 않는다. 그래서 멈추는 길을 둘로 나눴다.

- `pauseInternal` — 사용자가 누른 일시정지. 포커스를 반납한다.
- `pauseAudioOnly` — 전화 같은 일시 상실. 포커스를 쥔 채 오디오만 멈추고, `resumeOnFocusGain` 플래그로 "되찾으면 재개"를 표시해 둔다.

### 덕킹은 무시했다 — 앱 성격에 따른 선택

짧은 알림음이 끼면 시스템은 보통 볼륨을 낮추라는(`CAN_DUCK`) 신호를 준다. 음악이면 잠깐 작아지는 게 자연스럽지만, 메트로놈은 소리가 작아지면 박을 놓친다. 그래서 이 신호는 무시하고 원래 크기로 계속 울리게 뒀다. 같은 API라도 앱이 무슨 도구냐에 따라 반응이 달라진다.

---

## 요약

- 이어폰 분리·BT 끊김은 `ACTION_AUDIO_BECOMING_NOISY`로 알 수 있다 — 정적 리시버로는 못 받으니 재생 중에만 런타임 등록(`RECEIVER_NOT_EXPORTED`), 수명에 맞춰 해제한다.
- 오디오 포커스를 요청하면 다른 앱이 양보하고, 뺏기면 상실 신호가 온다. `AudioManagerCompat`으로 버전 차이를 흡수한다.
- 상실은 영구(정지)와 잠깐(전화 → 멈췄다 재개)을 갈라 다룬다. 자동 재개하려면 잠깐 멈출 때 포커스를 놓지 않아야 해서, 반납하는 멈춤과 쥔 채 멈추는 걸 나눴다.
- 같은 포커스 API라도 앱 성격이 반응을 정한다 — 메트로놈은 덕킹을 무시하고 원래 크기로 울린다.
