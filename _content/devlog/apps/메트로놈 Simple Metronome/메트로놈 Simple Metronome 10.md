---
layout: post
title: 메트로놈 Simple Metronome 10
date: 2026-07-12
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: 홈·앱전환·뒤로가기 후에도 계속 재생되도록 오디오 엔진을 포그라운드 서비스로 옮기고, 알림에서 재생/정지를 제어하게 만든 v1.14 작업.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 오디오 엔진을 포그라운드 서비스(`MetronomeService`)로 이전 — 홈·앱전환·뒤로가기·회전에도 계속 재생 (태블릿에 악보 켜두고 트는 시나리오)
- 상시 알림에서 재생/정지 토글, 최근 앱 목록에서 스와이프하면 종료
- 비트 인디케이터를 서비스가 방출하는 절대 인덱스로 다시 동기화
- 권한(`FOREGROUND_SERVICE_MEDIA_PLAYBACK`·`POST_NOTIFICATIONS`) 추가, versionCode 14로 릴리스 빌드

---

## 막힌 부분

### "그냥 안 멈추게"로는 백그라운드 오디오가 안 된다

원래는 `onStop`에서 소리를 멈췄다. 백그라운드 재생을 하려고 그 정지를 빼기만 하면, Android 8+에서는 시스템이 앱 프로세스를 정리해 소리가 곧 끊긴다. 안정적으로 돌리려면 포그라운드 서비스가 오디오를 소유하고 상시 알림을 띄워야 한다. AudioTrack 엔진·PCM 합성·`playToken`을 전부 서비스로 옮겼다.

```kotlin
// Activity가 아니라 서비스가 오디오를 소유. 전경 사용자 조작이라 5초 규칙 안전.
if (Build.VERSION.SDK_INT >= 29)
    startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
else
    startForeground(NOTIF_ID, notif)
```

### 비트 인디케이터가 서비스와 화면으로 나뉨

전엔 AudioTrack 위치 콜백이 화면의 인디케이터 뷰를 직접 갱신했다. 이제 오디오는 서비스에, 뷰는 Activity에 있으니 이 결합을 끊어야 한다. 서비스가 절대 서브디비전 인덱스를 방출하고, Activity는 전경일 때(바인딩 중)만 그 인덱스로 dot을 칠한다. 절대 인덱스라 앱에 다시 들어와도 다음 틱이 바로 맞는 dot을 칠해 어긋나지 않는다.

```kotlin
// 서비스: 위치 콜백에서 절대 인덱스 방출
tickIndex = (tickIndex + 1) % (beatsPerBar * subsPerBeat)
tickListener?.invoke(tickIndex)   // 리스너는 전경(bind)일 때만 non-null
```

### "계속할지 끝낼지"를 상황마다 정의

백그라운드 재생을 켜면 생명주기 의미가 바뀐다. 홈·앱전환·뒤로가기·회전은 계속, 최근 앱 스와이프(`onTaskRemoved`)와 알림 정지는 종료. `onStop`은 이제 오디오를 멈추지 않고 바인딩만 푼다. `bindService`가 비동기라 연결되기 전에 `onStop`이 오면 언바인딩이 누락돼 leak이 나서, 무조건 언바인딩하도록 했다.

```kotlin
override fun onStop() {
    super.onStop()
    service?.setListeners(null, null)
    try { unbindService(connection) } catch (e: IllegalArgumentException) {}
}
```

> 재생의 진실 원천도 Activity가 아니라 서비스로 옮겼다. 프로세스가 죽었다 살아나 `isPlaying`이 stale하게 true로 복원돼도, 재연결 때 서비스에 세션이 없으면 false로 정리한다.

