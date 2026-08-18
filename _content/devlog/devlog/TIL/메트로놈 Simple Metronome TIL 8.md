---
layout: post
title: 메트로놈 Simple Metronome TIL 8
date: 2026-08-18
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 잠금화면·블루투스 버튼을 받는 미디어 세션과, 인디케이터를 눌러 박마다 강박·음소거를 정하는 기능을 만들며 익힌 것들 — 미디어 세션, PCM 피치 리샘플, 뷰 앞면 표식, 박자표별 저장.
tags:
  - Android-Studio
  - Kotlin
---
## 잠금화면 미디어 컨트롤

메트로놈은 이미 알림에 재생·정지 버튼이 있었다. 그런데 잠금화면, 시스템 미디어 패널, 블루투스 이어폰의 재생 버튼은 반응하지 않았다. 이 컨트롤들은 "미디어 세션"을 거쳐야 뜬다.

### 미디어 세션이란 — 알림 액션과 뭐가 다른가

미디어 세션(`MediaSessionCompat`)은 "지금 이 앱이 무언가 재생 중"이라는 걸 안드로이드 시스템에 알리는 통로다. 알림 버튼은 그 앱 알림 안에서만 동작하지만, 세션에 재생 상태를 실으면 시스템이 잠금화면·미디어 패널에 컨트롤을 직접 그려 주고 하드웨어 버튼도 그 세션으로 보내 준다.

```kotlin
mediaSession = MediaSessionCompat(this, "MetronomeService").apply {
    setCallback(object : MediaSessionCompat.Callback() {
        override fun onPlay() { startPlaying() }
        override fun onPause() { pauseInternal() }
        override fun onStop() { stopSession() }
    })
    isActive = true
}
```

### 재생 상태·정보를 시스템에 알리기

세션엔 두 가지를 올린다. 재생 상태(`PlaybackState`)는 지금 재생 중인지와 어떤 버튼을 허용할지(재생/일시정지/정지)를, 정보(`Metadata`)는 잠금화면에 보일 제목·부제(여기선 앱 이름과 `120 BPM · 4/4`)를 담는다.

```kotlin
// 재생 상태 — 상태 + 허용 액션
val state = if (playing) PlaybackStateCompat.STATE_PLAYING else PlaybackStateCompat.STATE_PAUSED
mediaSession.setPlaybackState(
    PlaybackStateCompat.Builder()
        .setActions(ACTION_PLAY or ACTION_PAUSE or ACTION_PLAY_PAUSE or ACTION_STOP)
        .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
        .build()
)
```

### MediaStyle 알림 — 세션에 연결

기존 알림을 `MediaStyle`로 바꾸고 세션 토큰을 연결하면, 알림이 미디어 컨트롤 모양이 되고 잠금화면 컨트롤과 한 몸이 된다. `setShowActionsInCompactView`로 접힌 상태에서 보일 액션을 고른다.

```kotlin
.setStyle(
    androidx.media.app.NotificationCompat.MediaStyle()
        .setMediaSession(mediaSession.sessionToken)
        .setShowActionsInCompactView(0)
)
```

### 블루투스·이어폰 버튼 받기

이어폰·블루투스의 재생 버튼은 `MEDIA_BUTTON`이라는 시스템 이벤트로 온다. 매니페스트에 `MediaButtonReceiver`를 등록하고, 서비스에서 그 인텐트를 세션으로 넘기면 세션 콜백(위의 `onPlay`/`onPause`)으로 들어온다.

```xml
<receiver android:name="androidx.media.session.MediaButtonReceiver" android:exported="true">
    <intent-filter><action android:name="android.intent.action.MEDIA_BUTTON" /></intent-filter>
</receiver>
```

```kotlin
override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    MediaButtonReceiver.handleIntent(mediaSession, intent)
    ...
}
```

### 세션 생명주기 — 켜고, 멈추고, 놓아주기

세션은 재생·일시정지 내내 살아 있어야(`isActive = true`) 컨트롤이 뜬다. 완전히 멈추면 상태를 `STATE_STOPPED`로 두고 `isActive = false`, 서비스가 사라질 때 `release()`로 자원을 반납한다. 안 놓으면 세션이 시스템에 남는다.

### Play Console 권한 선언

백그라운드에서 오디오를 재생하는 포그라운드 서비스는 종류를 밝혀야 한다. 매니페스트에 `foregroundServiceType="mediaPlayback"`과 `FOREGROUND_SERVICE_MEDIA_PLAYBACK` 권한을 넣고, Play Console엔 이 권한을 왜 쓰는지(미디어 재생) 선언한다 — 이게 없으면 심사에서 막힌다.

---

## 박별 강박/음소거

인디케이터(박 점)를 누르면 그 박이 강박(높은 음) → 일반 → 음소거로 바뀌고, 강박은 테두리 링, 음소거는 흐리게 표시된다.

### PCM 리샘플로 피치 올리기 — 새 샘플 없이 강박음 만들기

강박은 원래 클릭보다 높은 음이어야 한다. 높은 음 오디오 파일을 따로 넣는 대신, 기존 클릭 소리(PCM 샘플 배열)를 더 촘촘히 건너뛰며 다시 읽어(리샘플) 재생 속도를 올렸다. 속도가 오르면 피치도 오른다. 중간값은 앞뒤 샘플을 선형보간(두 값 사이를 비율로 섞음)해 매끈하게 만든다.

```kotlin
private fun resamplePitch(src: ShortArray?, ratio: Double): ShortArray {
    val s = src ?: return ShortArray(0)
    if (s.isEmpty()) return ShortArray(0)
    val out = ShortArray((s.size / ratio).toInt().coerceAtLeast(1))
    for (i in out.indices) {
        val pos = i * ratio
        val i0 = pos.toInt()
        val frac = pos - i0
        val a = s[i0.coerceIn(0, s.size - 1)].toDouble()
        val b = s[(i0 + 1).coerceIn(0, s.size - 1)].toDouble()
        out[i] = (a + (b - a) * frac).toInt().coerceIn(-32768, 32767).toShort()
    }
    return out
}
```

서비스가 시작될 때 `accentClickPcm = resamplePitch(clickPcm, 1.5)`을 한 번 만들어 둔다(매번 만들면 낭비).

### 패턴 버퍼에서 박별 처리 — 강박은 소스 교체, 음소거는 스킵

메트로놈은 한 마디를 통째로 오디오 버퍼로 미리 만들어 반복 재생한다. 박마다 상태를 보고, 강박이면 메인 박 소리를 높은 음(`accent`)으로 바꿔 섞고, 음소거면 그 박을 통째로 건너뛴다.

```kotlin
fun stateOf(beat: Int) = p.beatStates.getOrElse(beat) { if (beat == 0) 1 else 0 }
for (beat in 0 until p.beatsPerBar) {
    val state = stateOf(beat)
    if (state == 2) continue   // 음소거
    for (sub in 0 until p.subsPerBeat) {
        val offset = beat * samplesPerBeat + sub * (samplesPerBeat / p.subsPerBeat) + lead
        val src = if (sub == 0 && state == 1) accent else click   // 강박이면 높은 음
        mixInto(pattern, src, offset, if (sub == 0) 1.0 else 0.75)
    }
}
```

### 3단계 상태 순환

각 박의 상태는 정수 배열(`IntArray`)에 담는다 — 0=일반, 1=강박, 2=음소거. 누를 때마다 `(state + 1) % 3`으로 다음 상태로 돈다. 나머지 연산 하나로 세 값을 순환시킨다.

```kotlin
beatStates[beat] = (beatStates[beat] + 1) % 3
```

### 배경 점등과 표식을 층 분리 — 뷰 앞면에 링

인디케이터는 재생 중 배경색(`backgroundTintList`)을 바꿔 켜진 박을 표시한다. 강박 링을 같은 배경에 그리면 박이 켜질 때 링이 덮여 사라진다. 그래서 링은 뷰의 앞면(`foreground`)에 얹었다. 뷰는 배경과 앞면을 따로 그리므로, 점등이 쓰는 배경과 층이 달라 서로 건드리지 않는다.

```kotlin
val ring = if (state == 1)
    ContextCompat.getDrawable(this, R.drawable.ic_accent_ring)?.mutate() else null
mainDotViews[b].foreground = ring
mainDotViews[b].foregroundTintList = if (ring != null) ColorStateList.valueOf(accent) else null
```

### 음소거 흐림 — 그룹 투명도

음소거 박은 박 그룹 전체의 투명도(`alpha`)를 낮춰 흐리게 했다. 점등·링과 겹치지 않는 또 하나의 축이다.

```kotlin
beatGroups.getOrNull(b)?.alpha = if (state == 2) 0.3f else 1.0f
```

### 박자표(박 수)별로 따로 저장

4/4에서 강박을 정해 두고 3/4로 바꾸면 박 수가 달라 그대로 못 쓴다. 그래서 상태 배열을 박 수(`beatsPerBar`)를 키로 한 JSON에 저장한다. 박자표를 오갈 때 그 박 수에 맞는 패턴을 다시 불러오므로 4/4와 3/4가 안 섞인다.

```kotlin
// 저장 — {"4":[1,0,0,0], "3":[1,0,0], ...}
val obj = JSONObject(prefs.getString(KEY_ACCENTS, "{}") ?: "{}")
val arr = JSONArray().apply { beatStates.forEach { put(it) } }
obj.put(beatStates.size.toString(), arr)
prefs.edit().putString(KEY_ACCENTS, obj.toString()).apply()
```

### Intent로 배열 넘기기

오디오 엔진은 별도 서비스에 있어, 화면에서 정한 박 상태를 서비스로 보내야 한다. 앞서(TIL 7) 파라미터를 `Intent` extras로 넘겼는데 그건 숫자 하나씩이었다. 배열은 `IntArray`째로 실어 보낸다.

```kotlin
putExtra(EXTRA_STATES, p.beatStates.toIntArray())          // 넣기
beatStates = getIntArrayExtra(EXTRA_STATES)?.toList() ?: emptyList()   // 꺼내기
```

### shape drawable(테두리 링)을 표식으로

표식 링은 속이 빈 원에 테두리만 있는 모양이다. 앞서(TIL 5·6) 아이콘은 `pathData`로 선을 그리는 벡터였는데, 이건 `shape` 드로어블로 원(`oval`)에 `stroke`(테두리)만 준 것이다. 색은 코드에서 `foregroundTintList`로 입혀 테마 강조색을 따르게 했다.

```xml
<shape android:shape="oval">
    <solid android:color="#00000000" />
    <stroke android:width="3dp" android:color="#FFFFFF" />
</shape>
```

---

## 설계 메모 — 비공개 저장소의 changelog

앱 소개 페이지에 버전별 업데이트 내역을 붙이려 했다. 다른 앱은 공개 저장소의 GitHub 릴리스를 빌드할 때 API로 긁어 왔는데, 이 앱의 코드 저장소는 비공개라 인증 없이는 못 읽는다(요청이 404).

공개 저장소를 새로 만들거나 토큰을 빌드 비밀로 넣는 건 과했다. 대신 내역 마크다운 파일을 소개 사이트 저장소 안에 두고 빌드할 때 로컬로 읽게 했다 — 외부 호출도 인증도 없이 되고, 새 버전은 파일에 한 블록만 이어붙이면 된다. "데이터를 어디서 가져오나"의 답이 늘 네트워크일 필요는 없고, 배포 단위 안에 두는 게 더 단순할 때가 있다.

---

## 요약

- 잠금화면·미디어 패널·블루투스 버튼은 알림 액션이 아니라 미디어 세션을 거쳐야 뜬다 — 세션에 재생 상태·정보를 올리고, 알림을 `MediaStyle`로 잇고, 하드웨어 버튼은 `MediaButtonReceiver`로 라우팅한다.
- 세션은 재생 내내 `isActive`, 끝나면 `STATE_STOPPED`·`release()`. 미디어 포그라운드 서비스는 종류와 권한을 매니페스트·Play Console에 선언한다.
- 강박음은 새 샘플 없이 기존 클릭을 리샘플해 피치를 올려 만들었다. 박 상태(일반·강박·음소거)는 정수 배열로 두고 나머지 연산으로 순환시킨다.
- 표식은 점등과 층을 나눠야 안 부딪힌다 — 링은 뷰 앞면, 음소거는 그룹 투명도. 강박 패턴은 박 수를 키로 저장해 박자표끼리 안 섞이게 했다.
- 가져올 데이터의 출처가 늘 네트워크일 필요는 없다 — 배포 단위 안에 파일로 두는 게 더 단순할 때가 있다.
