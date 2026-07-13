---
layout: post
title: 메트로놈 Simple Metronome TIL 7
date: 2026-07-12
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 메트로놈을 백그라운드에서도 재생시키며 익힌 것들 — 오디오를 포그라운드 서비스로 옮기고, 알림으로 제어하고, 비트 틱을 서비스에서 화면으로 흘려보내는 법.
tags:
  - Android-Studio
  - Kotlin
---
"홈으로 나가도 계속 재생"을 붙이며 나온 것들. 백그라운드 오디오가 왜 포그라운드 서비스를 요구하는지, 서비스와 화면을 어떻게 잇는지, 알림으로 재생을 제어하는 법, 그리고 생명주기의 "계속할지 끝낼지"를 어디서 정하는지까지.

---

## 포그라운드 서비스 구조

### 포그라운드 서비스란 무엇인가

안드로이드에서 화면을 담당하는 게 Activity라면, 화면 없이 도는 작업 단위가 서비스(Service)다. 문제는 그냥 서비스는 시스템이 메모리가 필요할 때 언제든 정리한다는 것 — Android 8부터 백그라운드 실행 제한이 강해져서, 앱이 화면에서 사라지면 백그라운드 작업은 오래 못 산다.

포그라운드 서비스는 시스템에 대고 "이건 사용자가 알고 있고, 지금 진행 중인 중요한 일이다" 라고 선언하는 서비스다. 일종의 거래인데, 의무와 대가가 짝을 이룬다.

- 의무: 상시 알림을 반드시 띄워야 한다. 사용자가 "뭔가 돌고 있다"를 알 수 있어야 하니까. (음악 앱에 항상 알림이 붙어 있는 이유)
- 대가: 시스템이 함부로 죽이지 않는다. 앱이 화면에 없어도 프로세스 우선순위가 유지돼 계속 돌 수 있다.

음악 재생·내비게이션·운동 기록·파일 다운로드가 대표적인 예다. 화면을 떠나도 소리를 계속 내야 하는 메트로놈도 정확히 여기에 해당한다. 즉 "알림을 띄우는 대신 계속 살아 있을 권리를 받는" 셈이다.

Android 14(타깃 34+)부터는 여기서 한 발 더 나아가 왜 포그라운드로 도는지 타입까지 밝혀야 한다. 메트로놈은 `mediaPlayback`(미디어 재생) 타입이다.

---

### 백그라운드 오디오는 "안 멈추게"로는 안 된다

원래 앱은 `onStop`에서 오디오를 멈췄다. 백그라운드 재생을 하려고 그 정지를 빼기만 하면 안 된다 — Android 8+는 포그라운드 서비스(FGS) 없이 백그라운드 오디오를 오래 못 돌리고, 시스템이 프로세스를 정리해 소리가 끊긴다. 오디오를 서비스가 소유하고 상시 알림을 띄워야 안정적이다. AudioTrack·PCM 합성·재생 토큰을 전부 `MetronomeService`로 옮겼다.

Android 14(타깃 34+)부터는 타입이 지정된 FGS라, 매니페스트에 타입과 권한을 선언해야 한다.

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
<service
    android:name=".MetronomeService"
    android:exported="false"
    android:foregroundServiceType="mediaPlayback" />
```

---

### bound + started 하이브리드

서비스를 쓰는 방식이 두 가지다 — `startService`(started, 언바인딩해도 살아남음)와 `bindService`(bound, 인스턴스에 직접 명령·콜백). 백그라운드 재생은 둘 다 필요하다.

- started(+foreground): Activity가 사라져도 재생이 유지되게 수명을 앵커.
- bound: 전경일 때 명령(`play/pause/updateParams`)을 보내고 비트 틱을 되받는 저지연 통로.

단일 프로세스·단일 Activity라 AIDL 없이 `LocalBinder`로 서비스 인스턴스를 그대로 넘겨 메서드를 직접 부른다.

```kotlin
inner class LocalBinder : Binder() {
    val service: MetronomeService get() = this@MetronomeService
}
```

주의: bound만으로는 언바인딩 시 서비스가 죽는다. 그래서 재생 시작은 반드시 `startForegroundService`로 started 상태를 만든다.

---

### 오디오 엔진을 서비스로 이전

`AudioTrack` + write 스레드 + `buildPatternBuffer` + PCM 합성을 통째로 서비스로 옮겼다. 한 가지 걸림돌 — 옛 코드는 위치 콜백에서 `runOnUiThread`로 화면을 갱신했는데, 서비스엔 그런 메서드가 없다. `Handler(Looper.getMainLooper())` + 리스너로 대체한다.

```kotlin
private val mainHandler = Handler(Looper.getMainLooper())
// 옛 runOnUiThread { ... } → mainHandler.post { ... }
```

---

## 알림

### 상시 알림 + 재생/정지 토글

채널은 `IMPORTANCE_LOW`(소리·진동 없음). 알림에 현재 템포·박자표를 보여주고, 재생/정지 토글 액션을 단다. 액션은 서비스로 향하는 `PendingIntent.getService`.

```kotlin
val toggleLabel = getString(if (isPlaying) R.string.stop else R.string.resume)
NotificationCompat.Builder(this, CHANNEL_ID)
    .setSmallIcon(R.drawable.ic_paw)
    .setContentText("${p.bpm} BPM · ${p.num}/${p.den}")
    .setContentIntent(contentPI)                 // 본문 탭 → Activity 복귀(SINGLE_TOP)
    .setOngoing(isPlaying)                        // 재생 중엔 스와이프 불가
    .setDeleteIntent(stopPI)                      // 일시정지 땐 스와이프로 종료
    .addAction(icon, toggleLabel, togglePI)
    .build()
```

`ongoing`을 재생 상태에 따라 켜고 끄는 게 포인트 — 재생 중엔 실수로 못 지우고, 일시정지 땐 스와이프(=삭제 인텐트)로 완전 종료된다.

---

### startForeground 타이밍

`startForegroundService`로 서비스를 띄우면 약 5초 안에 `startForeground`를 불러야 ANR·크래시가 없다. 재생은 사용자가 전경에서 버튼을 눌러 시작하므로 백그라운드 시작 제한에도 안 걸린다. 그래서 재생 경로 맨 위에서 동기로 승격한다.

```kotlin
if (Build.VERSION.SDK_INT >= 29)
    startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
else
    startForeground(NOTIF_ID, notif)
```

---

### 알림 권한은 첫 재생 때 런타임 요청

Android 13+는 `POST_NOTIFICATIONS`가 런타임 권한이다. 콜드 스타트에 묻지 않고 처음 재생을 누를 때 요청한다(알림이 실제로 필요해지는 순간). 거부해도 재생은 계속된다 — FGS 자체는 이 권한이 필요 없고, 알림만 안 뜬다.

```kotlin
if (Build.VERSION.SDK_INT >= 33 &&
    checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
    notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
```

---

## Activity ↔ 서비스

### 파라미터는 Intent extras로

재생 시작은 `startForegroundService`인데, 여기에 현재 상태를 실어 보내야 한다. `MetronomeParams`(bpm·박자표·박·서브·사운드·하이햇)를 Intent extras로 직렬화(전부 primitive라 간단).

```kotlin
fun playIntent(ctx: Context, p: MetronomeParams) =
    Intent(ctx, MetronomeService::class.java).setAction(ACTION_PLAY).apply {
        putExtra(EXTRA_BPM, p.bpm); putExtra(EXTRA_NUM, p.num); /* … */
    }
```

전경에서 값이 바뀔 땐(슬라이더 드래그 등) 이미 바인딩돼 있으니 binder로 `updateParams(params)`를 직접 부른다.

---

### 파라미터 전체 비교로 심리스 재빌드

옛 코드는 `(bpm, beats, subs)`만 키로 비교해서, 사운드만 바꾸면 재시작이 안 되는 문제가 있어 `forceRestartIfPlaying`을 따로 뒀다. 이제 `MetronomeParams` 전체를 비교하니 그런 예외가 사라졌다 — 무엇이 바뀌든 값이 다르면 재빌드.

```kotlin
fun updateParams(p: MetronomeParams) {
    val changed = p != params
    params = p
    if (playing && changed) startAudio(p)   // 심리스 재빌드
    if (foregroundStarted) updateNotification()
}
```

---

### 재생 상태의 진실 원천은 서비스

Activity가 죽었다 살아날 수 있으니(회전·프로세스 재시작), 재생 여부의 진실은 서비스가 쥔다. `viewModel.isPlaying`은 버튼 텍스트용 UI 반영일 뿐. 바인딩될 때 서비스 상태로 재조정한다. `SavedStateHandle`이 `isPlaying=true`를 stale하게 복원해도, 세션이 없으면 false로 정리한다.

```kotlin
override fun onServiceConnected(name: ComponentName?, ib: IBinder?) {
    val svc = (ib as MetronomeService.LocalBinder).service
    if (svc.isSessionActive()) {
        viewModel.setPlaying(svc.isPlaying())
        if (svc.isPlaying()) paintIndicator(svc.currentTickIndex()) else resetIndicatorsUi()
    } else {
        viewModel.setPlaying(false)   // stale 상태 정리
        resetIndicatorsUi()
    }
}
```

---

### bindService는 비동기 → leak 조심

`bindService(intent, connection, BIND_AUTO_CREATE)`는 서비스 객체를 즉시 돌려주지 않는다. 시스템이 뒤에서 연결을 맺고 나중에 `onServiceConnected(...)` 콜백으로 binder를 건넨다 — 요청과 수령이 분리된 비동기 호출이다.

여기서 중요한 건, `bindService`를 부른 그 순간부터 시스템이 내 `ServiceConnection`을 등록해 붙들고 있다는 점이다(아직 연결 전이어도). 그리고 `ServiceConnection`은 보통 Activity 내부 객체라 Activity를 참조한다.

```
시스템 → (붙잡음) → ServiceConnection → (참조) → Activity
```

그래서 이게 왜 누수(leak)냐 — GC는 "죽었냐"가 아니라 "누가 붙잡고 있냐"를 본다.

코틀린/자바는 개발자가 메모리를 직접 비우지 않는다. GC(가비지 컬렉터)가 돌면서 "이제 아무도 안 쓰는 객체"를 치운다. 그런데 GC의 판단 기준은 논리적 생사가 아니라 참조다.

- 아무도 가리키지 않음 → 안 쓰는구나 → 치움
- 하나라도 가리킴 → 아직 쓰나 보다 → 안 치움

화면을 나가면 Activity는 논리적으로 끝났지만 메모리 상의 객체는 아직 남아 있고, 참조가 끊겨야 GC가 회수한다. 그런데 위 사슬처럼 시스템이 `ServiceConnection`을 쥐고 그게 Activity를 가리키고 있으면, GC 눈엔 "누가 쓰는 물건"으로 보여 영영 못 치운다. 죽은 Activity가 메모리에 그대로 남는 것 — 이게 leak이다.

Activity는 뷰·비트맵을 다 물고 있어 덩치가 크다. 앱을 나갔다 들어오길 반복하면 죽은 Activity가 하나씩 쌓이고, 결국 메모리 부족(OOM)으로 앱이 죽는다. 안드로이드도 로그캣으로 경고해준다.

```
Activity ... has leaked ServiceConnection ... that was originally bound here
```

`unbindService`는 이 사슬을 끊는 일이다. 그래야 GC가 죽은 Activity를 회수할 수 있다.

규칙은 단순하다 — `bindService` 한 번에 `unbindService` 한 번. 짝이 안 맞으면 샌다.

함정은 "연결됐을 때만 언바인딩"으로 가드하는 것이다.

```kotlin
private var bound = false            // onServiceConnected에서 true

override fun onStart() { bindService(...) }
override fun onStop()  { if (bound) unbindService(connection) }   // ❌ 레이스
```

정상 흐름이면(bind → 연결 → onStop) 문제없다. 하지만 연결 콜백이 오기 전에 사용자가 앱을 나가거나 빠르게 회전하면, `onStop` 시점의 `bound`는 아직 `false`라 가드가 언바인딩을 건너뛴다. 그런데 바인딩은 이미 등록돼 있으니 그대로 샌다.

핵심은 언바인딩의 짝이 "연결됨"이 아니라 "bindService를 호출함"이라는 것. `onStart`에서 항상 bind하니 `onStop`에서도 무조건 unbind한다. 아직 연결 안 된 바인딩을 언바인딩해도 안전하다 — 대기 중인 연결이 취소될 뿐이다.

```kotlin
override fun onStop() {
    super.onStop()
    service?.setListeners(null, null)
    try { unbindService(connection) } catch (e: IllegalArgumentException) {}   // ✅
    bound = false
    service = null
}
```

> `bound`(연결됨)와 `bindService를 호출함`은 다른 개념이다. 이 둘을 혼동해 unbind를 연결 여부로 가드하면 샌다.

---

## 인디케이터 · 생명주기

### 비트 틱을 서비스→화면으로, 절대 인덱스로

전엔 위치 콜백이 화면 인디케이터를 직접 갱신했다. 이제 오디오는 서비스, 뷰는 Activity라 결합을 끊어야 한다. 서비스가 절대 서브디비전 인덱스를 방출하고(자체 카운터), Activity는 전경일 때(리스너 등록 중)만 그 인덱스로 dot을 칠한다. 절대값이라 다시 들어와도 다음 틱이 바로 맞는 dot을 칠해 드리프트가 없다.

```kotlin
// 서비스: 위치 콜백(playToken 게이트)
mainHandler.post {
    if (token == playToken) {
        tickIndex = (tickIndex + 1) % (p.beatsPerBar * p.subsPerBeat)
        tickListener?.invoke(tickIndex)          // 전경일 때만 non-null
    }
}
// Activity: 방출된 인덱스로 칠하고 메인 박이면 플래시
private fun onTick(index: Int) {
    paintIndicator(index)
    if (index % subsPerBeat == 0) triggerFlash(strong = index == 0)
}
```

리스너는 bind에서 등록·unbind에서 해제 → 화면 갱신은 전경에서만. 백그라운드에선 리스너가 null이라 아무 일도 안 한다(플래시·토치도 자연히 멈춤).

---

### 생명주기의 "계속할지 끝낼지"

백그라운드 재생을 켜면 각 이탈의 의미가 달라진다.

- 홈·앱전환·뒤로가기(12+)·회전·테마 변경 → 계속: `onStop`은 언바인딩만, `onDestroy`도 정지 안 함. 서비스가 재생을 쥐고 있다.
- 최근 앱 스와이프 → 종료: `Service.onTaskRemoved`에서 정지. 메트로놈다운 기대(앱을 치우면 소리도 끝).
- 알림 정지 → 종료: 알림 액션이 서비스를 정지시키고, 상태 콜백으로 Activity 버튼도 갱신.

```kotlin
override fun onTaskRemoved(rootIntent: Intent?) {
    stopSession()                 // 스와이프로 앱을 지우면 재생·알림 종료
    super.onTaskRemoved(rootIntent)
}
```

---

## 요약

- 백그라운드 오디오는 "안 멈추게"가 아니라 포그라운드 서비스 + 상시 알림이 정답. Android 14는 타입 지정 FGS + 권한.
- started(수명) + bound(명령·콜백) 하이브리드로, 서비스가 오디오를 소유하고 Activity는 전경일 때만 붙는다.
- 화면과의 결합은 절대 인덱스 틱으로 끊는다 — 다시 들어와도 드리프트 없이 재동기화.
- 재생의 진실 원천은 서비스. `bindService`는 비동기라 언바인딩은 항상 짝지어 부른다.
- 생명주기마다 "계속 vs 종료"를 명시적으로 정의하는 게 핵심(홈=계속, 스와이프=종료).
