---
layout: post
title: 메트로놈 Simple Metronome TIL 4
date: 2026-07-09
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 메트로놈에 설정 드로어·슬라이딩 피커·드럼 사운드·비트 플래시를 붙이며 익힌 것들 — 화면 구조 전환과 상태 유지, 가로 휠 피커 중앙 정렬, AudioTrack 안정 재생, 생명주기 리소스 정리.
tags:
  - Android-Studio
  - Kotlin
---
메트로놈에 설정 드로어·슬라이딩 피커·드럼 사운드·비트 플래시를 붙이면서 나온 것들을 한데 모았다. 화면 구조를 바꾸는 법, 가로 휠 피커를 정확히 가운데 맞추는 법, `AudioTrack`으로 흔들림 없이 재생하는 법, 그리고 생명주기에서 리소스를 놓치지 않는 법까지.

---

## 설정 · 화면 구조

### 우측 슬라이드 설정 드로어

흩어진 아이콘(테마·북마크·회전)을 `DrawerLayout`의 end drawer 하나(⚙️)로 모았다. 콘텐츠와 드로어를 `DrawerLayout`의 두 자식으로 두고, 드로어는 `layout_gravity="end"`.

```xml
<androidx.drawerlayout.widget.DrawerLayout ...>
    <LinearLayout android:id="@+id/contentRoot" .../>   <!-- 본문 -->
    <include android:id="@+id/settingsPanel" layout="@layout/settings_panel"
        android:layout_width="290dp" android:layout_height="match_parent"
        android:layout_gravity="end" />                 <!-- 우측 패널 -->
</androidx.drawerlayout.widget.DrawerLayout>
```

한 가지 함정 — 드로어는 시스템 바 인셋을 따로 안 받아서 가로에선 네비바에 가린다. 드로어 루트에 인셋 패딩을 직접 적용해야 한다.

```kotlin
ViewCompat.setOnApplyWindowInsetsListener(binding.settingsPanel.root) { v, insets ->
    val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
    v.updatePadding(top = bars.top, right = bars.right, bottom = bars.bottom)
    insets
}
```

---

### 회전 시 레이아웃을 바꾸되 상태는 유지

가로 전용 2단 레이아웃(`layout-land`)을 실제로 띄우려면 회전 시 액티비티가 재생성돼야 하는데, `configChanges`에 `orientation`이 있으면 재생성이 막혀 세로 레이아웃이 늘어난다. `orientation|screenSize`를 빼서 재생성되게 하고, 대신 재생·BPM·박자표는 `ViewModel`(`SavedStateHandle`)에 둬서 회전·테마 변경에도 유지한다.

```kotlin
class MainViewModel(private val state: SavedStateHandle) : ViewModel() {
    val currentBpm = state.getLiveData("bpm", 60)
    var numerator: Int
        get() = state["num"] ?: 4
        set(v) { state["num"] = v }
}
```

박자표를 Activity 필드로 두면 재생성 때 기본값으로 리셋된다 — 재생성에도 살아남아야 하는 상태는 반드시 ViewModel에.

---

### 가로 2단에선 발자국 줄바꿈을 컨테이너 실측 폭으로

발자국 줄바꿈을 화면 폭 기준으로 계산하면, 가로 2단에서 좁아진 좌측 패널을 넘어 잘린다. 컨테이너의 실제 폭을 우선 쓰고(레이아웃 전이면 화면 폭 fallback), 배치 후 `doOnLayout`으로 한 번 다시 계산한다.

```kotlin
val containerW = binding.indicatorContainer.width
val availWidth = if (containerW > 0) containerW else screenWidth
```

---

## 슬라이딩 피커 (가로 휠)

### RecyclerView + LinearSnapHelper

박자표 분자/분모를 가로로 슬라이드해 고르는 피커는 가로 `RecyclerView` + `LinearSnapHelper`로 만든다. 좌우에 `(폭-아이템)/2` 패딩을 줘서 첫·끝 값도 가운데로 올 수 있게 하고, 스냅으로 가운데 아이템이 선택된다.

```kotlin
rv.layoutManager = LinearLayoutManager(this, RecyclerView.HORIZONTAL, false)
LinearSnapHelper().attachToRecyclerView(rv)
rv.clipToPadding = false
```

---

### 현재 값을 정확히 가운데로 — 추정 대신 실측

`scrollToPositionWithOffset(index, offset)`의 offset 기준이 헷갈려서, 현재 값이 아니라 엉뚱한 값이 가운데 오는 문제로 한참 헤맸다. offset 추정을 버리고 두 단계로 확실히 했다 — (1) 대칭 패딩이면 스크롤 0에서 0번이 중앙이므로 목표 스크롤을 `index × 아이템폭`으로 잡고, (2) 실제로 배치된 아이템 뷰의 중심을 재서 미세 보정.

```kotlin
rv.doOnPreDraw {
    rv.scrollBy(index * itemW - rv.computeHorizontalScrollOffset(), 0)
    rv.post {
        rv.findViewHolderForAdapterPosition(index)?.let { vh ->
            rv.scrollBy((vh.itemView.left + vh.itemView.right) / 2 - rv.width / 2, 0)
        }
    }
}
```

`doOnPreDraw`로 패딩 적용·레이아웃이 끝난 뒤 실행하는 게 핵심. 초기 정렬 중엔 선택 콜백을 막아(플래그) 열자마자 값이 바뀌는 것도 방지한다.

---

## 오디오 (AudioTrack)

### 드럼을 코드로 합성

외부 샘플 없이 파형으로 kick/snare/hihat을 만든다. 킥은 저음이라 폰 스피커가 잘 못 내서, 고음 어택(비터)을 섞어 첫 박이 또렷하게 들리게 했다.

```kotlin
kickPcm = synth(0.18) { t ->
    val body = sin(2*PI*(45 + 120*exp(-t*32))*t) * exp(-t*20)
    val beater = sin(2*PI*2200.0*t) * exp(-t*130) * 0.45   // 폰 스피커용 고음 어택
    (body + beater) * 0.9
}
```

---

### 컴파운드 박자에 하이햇 맞추기

6/8·9/8은 한 박이 8분음표 3개(컴파운드)다. 하이햇을 박당 2·4로 균등 분할하면 8분음표 그리드에서 어긋난다. 컴파운드면 3·6, 단순박이면 2·4로.

```kotlin
val eighthPerBeat = if (subsPerBeat == 3) 3 else 2   // 컴파운드는 박당 8분 3개
val hats = if (hihatSubs == 4) eighthPerBeat * 2 else eighthPerBeat
```

---

### 재생 세대 토큰 — 옛 콜백에 안 밀리게

재생 중 설정을 바꾸면 새 `AudioTrack`을 만드는데, 옛 트랙의 지연된 위치 콜백이 남아 인디케이터를 한 칸씩 밀어냈다. 재생마다 토큰을 올리고, 콜백은 자기 토큰이 최신일 때만 실행한다. 또 상태 키(bpm·박·분할)가 같으면 재시작을 스킵해 중복 재생을 막는다.

```kotlin
private var playToken = 0
// playPattern에서
val token = ++playToken
// 위치 콜백 / 초기 하이라이트
runOnUiThread { if (token == playToken) highlightNextIndicator() }
```

---

### MODE_STREAM 연속 재생

`MODE_STATIC` + `setLoopPoints` 루프는 되풀이 경계에서 첫 박이 anti-pop 페이드에 깎이는 문제가 있었다(첫 박만 작게). 백그라운드 스레드가 패턴을 끊김 없이 계속 write하는 `MODE_STREAM`으로 바꿔 루프 경계 자체를 없앴다. 정지는 토큰 신호 + `pause()`/`flush()`로 블로킹 write를 풀고, 스레드가 자기 트랙을 정리한다.

```kotlin
audioThread = Thread {
    while (token == playToken) {
        var w = 0
        while (w < pattern.size && token == playToken) {
            val n = at.write(pattern, w, pattern.size - w)
            if (n <= 0) break
            w += n
        }
    }
    at.stop(); at.release()
}.also { it.start() }
```

> 이걸로도 "첫 박이 둘째보다 작게 들림"은 안 잡혔다(PCM엔 gain이 동일). 기기 오디오 후처리로 의심하고 미해결로 남겨둠 — 데이터가 아니라 재생 경로 밖의 문제일 수 있다.

---

## 플래시 · 생명주기

### 비트 플래시 — 화면 오버레이 + 토치

화면 플래시는 최상단에 투명 오버레이 뷰를 두고(평소 터치 통과), 비트마다 alpha를 순간 올렸다가 페이드한다. 토치는 `CameraManager.setTorchMode`로 짧게 켰다 끈다 — 카메라 권한이 필요 없다(시스템이 관리하는 토치).

```kotlin
private fun torch(on: Boolean) {
    val id = flashCameraId ?: return   // FLASH_INFO_AVAILABLE로 찾은 카메라
    try { cameraManager.setTorchMode(id, on) } catch (e: Exception) {}
}
```

---

### Android 12 뒤로가기 — onStop에서 정지

재생 중 뒤로가기를 눌러도 소리·토치가 안 꺼졌다. Android 12+는 루트 화면에서 뒤로가기 시 액티비티를 파괴하지 않고 백그라운드로만 보내서 `onDestroy`(정지 로직)가 안 불리기 때문. `onStop`에서 처리하되, 회전·테마 재생성은 제외해야 그건 재생이 이어진다.

```kotlin
override fun onStop() {
    super.onStop()
    if (!isChangingConfigurations) {   // 회전·테마 재생성 제외
        stopMetronome()
        viewModel.setPlaying(false)
    }
}
```
