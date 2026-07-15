---
layout: post
title: 안드로이드 AudioTrack 연속 재생, 실측 피커 정렬, 카메라 토치 플래시
date: 2026-07-09
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Android-Studio
  - Kotlin
---
## 오디오

### 정적 버퍼 루프의 "루프 경계 페이드" — MODE_STREAM 연속 재생으로 없앤다

메트로놈 소리를 한 마디 패턴 버퍼로 만들어 `AudioTrack`의 `MODE_STATIC` + `setLoopPoints(..., -1)`로 무한 루프 재생했는데, 루프 경계마다 첫 박이 살짝 작게 들렸다. `AudioTrack`은 재생 시작·루프 이음새에서 클릭 잡음(pop)을 막으려 짧은 anti-pop 페이드를 넣는데, 그게 첫 박의 어택을 깎는다. 모드나 볼륨을 만져도 페이드 자체는 남는다.

해결은 루프를 아예 없애는 것이다. `MODE_STREAM`으로 바꾸고, 백그라운드 스레드가 같은 패턴 버퍼를 끊김 없이 이어 `write`하면 "루프 경계"라는 개념 자체가 사라진다.

```kotlin
val at = AudioTrack.Builder()
    // ...
    .setTransferMode(AudioTrack.MODE_STREAM) // STATIC 루프 → STREAM 연속
    .build()
at.play()

audioThread = Thread {
    var w = 0
    while (token == playToken) {
        val n = at.write(pattern, w, pattern.size - w) // 블로킹 write
        if (n <= 0) break
        w += n
        if (w >= pattern.size) w = 0                   // 경계 없이 다음 마디로 이어붙임
    }
}.also { it.start() }
```

`write`는 버퍼가 찰 때까지 블로킹이라, 정지는 그냥 스레드를 join하면 UI가 멈춘다. 대신 종료 신호(`playToken++`)를 주고 `pause()/flush()`로 블로킹을 풀어, 스레드가 스스로 자기 트랙을 stop/release 하게 했다.

> 정적 버퍼가 "가장 정확하다"고만 생각했는데, 정확도(타이밍)와 이음새(음질)는 다른 축이었다. 타이밍은 위치 콜백으로 잡고, 이음새는 연속 스트림으로 잡는 게 맞았다.

---

### 재생 세대 토큰으로 오래된 콜백을 무시한다

BPM·박자표·사운드를 바꾸면 트랙을 새로 만든다. 이때 직전 트랙의 위치 콜백이 뒤늦게 도착해 인디케이터를 엉뚱하게 점등시킬 수 있다. 재생마다 세대 번호(토큰)를 올리고, 콜백에서 "내가 지금 세대냐"를 확인하면 stale 콜백이 걸러진다.

```kotlin
private var playToken = 0

fun playPattern(bpm: Int) {
    val token = ++playToken           // 이번 재생 세대
    // ...
    runOnUiThread { if (token == playToken) highlightNextIndicator() } // 최신 세대만 반영
}

fun stopAudio() { playToken++ }       // 세대를 올려 이전 콜백을 모두 무효화
```

---

### 드럼을 코드로 합성 + 컴파운드 박자 하이햇 분할

클릭 WAV 말고 드럼 사운드도 넣었는데, 샘플 파일 없이 PCM을 코드로 합성했다. 킥은 빠르게 떨어지는 저주파 사인 + 어택(고음 비터), 스네어·하이햇은 노이즈에 엔벨로프를 씌워 만든다. 패턴은 짝수 박 킥·홀수 박 스네어(첫 박 강세)에 하이햇을 매 박 쪼개 얹는다.

여기서 컴파운드 박자가 함정이다. 6/8·9/8·12/8은 한 박이 점4분음표 = 8분음표 3개라, 하이햇을 박당 2로 쪼개면 강세가 어긋난다. 박당 8분=3 / 16분=6으로 나눠야 한다.

```kotlin
// 한 박 안에서 하이햇을 몇 번 칠지 — 단순박 vs 컴파운드박
val hihatSubs = if (isCompound) (if (sixteenth) 6 else 3)
                else            (if (sixteenth) 4 else 2)

for (beat in 0 until beats) {
    val base = beat * samplesPerBeat + lead
    mixInto(pattern, if (beat % 2 == 0) kickPcm else snarePcm, base, gain = 1.0)
    for (h in 0 until hihatSubs) {
        val off = base + h * (samplesPerBeat / hihatSubs)
        mixInto(pattern, hihatPcm, off, gain = 0.5)
    }
}
```

(`mixInto`는 소스를 offset 위치에 gain을 곱해 더하는 믹서다. 첫 박이 페이드에 안 깎이게 모든 박을 `lead`≈6ms만큼 밀어 샘플 0에 무음을 둔다.)

---

## UI / 레이아웃

### 회전 시 레이아웃만 바꾸고 상태는 ViewModel로 유지

가로모드는 좌(발자국)/우(컨트롤) 2단이 낫다. `layout-land/`에 다른 XML을 두면 회전 시 시스템이 알아서 갈아끼운다 — 단, `android:configChanges`에서 `orientation`을 빼야(직접 처리하지 않아야) 시스템이 레이아웃을 재적용한다.

문제는 회전=Activity 재생성이라 화면 상태(BPM·박자표·재생 여부)가 날아간다는 것. 이건 `ViewModel` + `SavedStateHandle`에 두면 재생성·프로세스 종료에도 살아남는다.

```kotlin
class MetronomeViewModel(private val state: SavedStateHandle) : ViewModel() {
    var meter: Pair<Int, Int>
        get() = state["meter"] ?: (4 to 4)
        set(v) { state["meter"] = v }   // 회전·recreate에도 유지
}
```

레이아웃 전환은 뷰 계층에, 상태 보존은 ViewModel에 — 둘을 분리하니 회전 처리가 깔끔해졌다.

---

### RecyclerView 슬라이딩 피커 중앙 정렬은 계산 말고 실측으로

박자표를 가로 스크롤 피커로 만들고 현재 값을 가운데 오게 하려 했는데, 스크롤 오프셋을 산술로 계산하니 아이템이 반칸씩 걸쳤다. 아이템 폭이 레이아웃 전엔 확정되지 않아 계산값과 실제 렌더 폭이 달랐던 것.

산술 목표로 먼저 이동한 뒤, `post`로 레이아웃이 끝난 다음 실제 아이템 뷰를 측정해 중앙과의 차이만큼만 보정하면 정확히 맞는다.

```kotlin
lm.scrollToPositionWithOffset(target, 0)   // 1차: 산술 목표
rv.post {                                   // 레이아웃 확정 후
    val child = lm.findViewByPosition(target) ?: return@post
    val delta = child.left + child.width / 2 - rv.width / 2
    rv.scrollBy(delta, 0)                    // 실제 중앙과의 차이만큼만
}
```

레이아웃 이전의 크기를 계산으로 예측하려 들지 말고, 확정된 뒤 재서 맞추는 게 결국 빠르다.

---

### 우측 슬라이드 설정 드로어

흩어져 있던 토글(테마·사운드·플래시·회전)을 우측에서 나오는 `DrawerLayout` 하나로 모았다. 왼쪽 드로어(네비게이션)와 달리 `Gravity.END`로 두면 설정 서랍처럼 쓸 수 있다.

```kotlin
binding.settingsBtn.setOnClickListener {
    binding.drawerLayout.openDrawer(GravityCompat.END)
}
// 뒤로가기로 닫히게
onBackPressedDispatcher.addCallback(this) {
    if (binding.drawerLayout.isDrawerOpen(GravityCompat.END))
        binding.drawerLayout.closeDrawer(GravityCompat.END)
    else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
}
```

---

## 하드웨어 / 생명주기

### 비트마다 화면 + 카메라 토치 플래시

비트에 맞춰 화면 오버레이를 번쩍이고, 카메라 플래시(LED)도 켰다 끈다. LED는 `CameraManager.setTorchMode`로 제어한다(카메라 권한 불필요).

```kotlin
val cm = getSystemService(CameraManager::class.java)
val camId = cm.cameraIdList.first { id ->
    cm.getCameraCharacteristics(id)[CameraCharacteristics.FLASH_INFO_AVAILABLE] == true
}
// 비트에서
cm.setTorchMode(camId, true)
overlay.postDelayed({ cm.setTorchMode(camId, false) }, flashMs)
```

단, LED는 물리 소자라 on/off에 수 ms가 걸린다. 빠른 템포에선 미처 꺼지기 전에 다음 on이 와서 그냥 켜져 있는 것처럼 보인다 — 이건 막을 수 없어 "빠른 템포에선 토치가 안 깜빡일 수 있음" 안내로 처리했다.

---

### 화면 이탈 시 소리·토치 정지

앱을 벗어나거나(홈·전화) 화면이 꺼져도 소리와 토치가 계속 돌면 안 된다. `onStop`(또는 `onPause`)에서 오디오 스레드를 종료하고 토치를 끈다. `onStop` 기준으로 잡으면 다른 앱 위에 반투명으로 떠 있는 경우까지 포함해 확실히 정리된다.

```kotlin
override fun onStop() {
    super.onStop()
    stopAudio()                       // 재생 세대 종료 + 스레드 정리
    runCatching { cm.setTorchMode(camId, false) } // 토치 강제 소등
}
```

LED를 켠 채로 앱이 죽으면 다음 실행 때까지 켜져 있을 수 있어서, 생명주기에서의 소등은 선택이 아니라 필수다.
