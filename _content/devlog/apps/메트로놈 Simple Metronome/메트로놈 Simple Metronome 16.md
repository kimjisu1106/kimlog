---
layout: post
title: 메트로놈 Simple Metronome 16
date: 2026-08-29
permalink: "wkrsq54v"
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: 이어폰이 빠지거나 다른 앱이 소리를 내면 자동으로 멈추고 전화 뒤엔 이어서 울리게, 오디오 인터럽트 처리를 넣어 v1.19를 출시한 기록.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 이어폰이 빠지거나 블루투스가 끊기면 자동으로 일시정지되게 함
- 재생 중 오디오 포커스를 얻어 다른 앱 음악을 양보시키고, 소리를 뺏기면 자동 정지·전화가 끝나면 재개되게 함
- 이어폰 자동정지 + 오디오 포커스로 v1.19 출시

---

## 막힌 부분

### 이어폰이 빠지면 스피커로 튀는 걸 막기

이어폰을 뽑으면 소리가 스피커로 튀어 갑자기 크게 울린다. 안드로이드는 이 순간(이어폰 분리·BT 끊김) 직전에 `ACTION_AUDIO_BECOMING_NOISY`라는 브로드캐스트를 쏜다. 이걸 받아서 일시정지하면 된다.

한 가지 제약이 있다 — 이 브로드캐스트는 매니페스트에 미리 등록해 두는 정적 리시버로는 못 받는다. 반드시 코드에서 런타임에 등록해야 하고, 재생 중일 때만 등록해 두는 게 맞다(안 울릴 때 리시버를 켜 둘 이유가 없다).

```kotlin
private fun registerNoisy() {
    if (noisyReceiver != null) return   // 이중 등록 방지
    val r = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == AudioManager.ACTION_AUDIO_BECOMING_NOISY && playing) pauseInternal()
        }
    }
    ContextCompat.registerReceiver(this, r,
        IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY),
        ContextCompat.RECEIVER_NOT_EXPORTED)
    noisyReceiver = r
}
```

- 해결: 등록은 재생 시작(`startPlaying`), 해제는 일시정지·정지·서비스 종료. null 가드로 이중 등록을 막고, 종료 경로마다 해제해 리시버가 새지 않게 함.

### 소리를 뺏기고 되찾을 때 — 오디오 포커스

이어폰 분리 말고도, 다른 앱이 음악을 켜거나 전화가 오면 메트로놈이 그 위로 겹쳐 울리는 게 문제다. 안드로이드의 "오디오 포커스"는 지금 누가 소리의 주인인지를 조율하는 장치다. 재생을 시작할 때 포커스를 요청하면 다른 앱이 양보하고, 반대로 다른 앱이 포커스를 가져가면 우리에게 상실 신호가 온다.

핵심은 상실의 종류를 나눠 다루는 것이다.

```kotlin
when (change) {
    AudioManager.AUDIOFOCUS_LOSS ->            // 영구(다른 미디어 앱 등) → 정지
        { resumeOnFocusGain = false; if (playing) pauseInternal() }
    AudioManager.AUDIOFOCUS_LOSS_TRANSIENT ->  // 전화 등 잠깐 → 멈추되 포커스는 안 놓음
        { if (playing) { resumeOnFocusGain = true; pauseAudioOnly() } }
    AudioManager.AUDIOFOCUS_GAIN ->            // 되찾음 → 잠깐 멈췄던 거면 재개
        { if (resumeOnFocusGain && !playing) { resumeOnFocusGain = false; params?.let { startPlaying(it) } } }
    // CAN_DUCK: 무시 — 메트로놈은 소리를 줄이면 박을 놓친다
}
```

전화가 끝났을 때 자동으로 이어서 울리려면, 잠깐 멈추는 동안 포커스 요청을 놓지 말아야 한다(놓으면 되찾음 신호가 안 온다). 그래서 멈추는 길을 둘로 나눴다 — 사용자가 누른 일시정지는 포커스를 반납하는 `pauseInternal`, 전화 같은 일시 상실은 포커스를 쥔 채 오디오만 멈추는 `pauseAudioOnly`.

- 해결: 영구 상실=정지, 일시 상실=`pauseAudioOnly`+`resumeOnFocusGain` 플래그로 표시해 두고 `GAIN` 때 재개, 짧은 덕킹 요청=무시(계속 재생).
- 남은 갈래: 포커스 반납은 일시정지·정지·서비스 종료에서. 재생 시작 때는 `AUDIOFOCUS_GAIN` 요청으로 다른 앱을 양보시킴.

---

## 다음에 할 일

- 첫 박이 둘째 박보다 조금 작게 들리는 이슈 — 다른 기기·헤드폰으로 재확인
