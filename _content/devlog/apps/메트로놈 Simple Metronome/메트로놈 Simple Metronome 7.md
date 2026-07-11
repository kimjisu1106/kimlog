---
layout: post
title: 메트로놈 Simple Metronome 7
date: 2026-07-09
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
description: 흩어진 설정을 우측 슬라이드 드로어로 통합하고 메인 화면을 미니멀하게 개편했으며, 박자표 슬라이딩 피커·드럼 비트 사운드·비트 플래시를 붙이고 첫 박이 작게 들리던 문제를 MODE_STREAM 전환으로 추적·완화했다.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 우측 설정 드로어로 통합 — 흩어져 있던 테마·BPM 기억·사운드·플래시·화면 회전 설정을 슬라이드 드로어(`DrawerLayout`) 하나로. 테마 변경 시 소리가 재생되던 버그도 수정
- 메인 화면 미니멀 개편 — BPM 히어로 크게 + 템포 이름(Largo·Allegro…), 원형 −/+ 버튼, 발자국 기준선
- 박자표 슬라이딩 피커 — 박자표를 탭하면 분자/분모를 2줄 스크롤로 선택(가로 `RecyclerView` + `LinearSnapHelper`, ±5 포함). ViewModel(`SavedStateHandle`)에 저장해 회전·테마 변경에도 유지
- 가로모드 2단 레이아웃 — 좌(발자국) / 우(컨트롤), `configChanges`에서 orientation을 빼 회전 시 재생성, 상태는 ViewModel로 유지
- 사운드 선택 — 메트로놈 클릭 / 드럼 비트를 코드로 PCM 합성. 드럼은 짝수 박 킥·홀수 박 스네어(첫 박 강세) + 하이햇, 컴파운드 박자는 하이햇을 박당 8분=2 / 16분=4로 분할
- 비트 플래시 — 비트마다 화면 + 카메라 토치(LED) 점멸(기본 꺼짐). 앱 이탈 시 소리·토치 정지, 빠른 템포 토치 물리 한계 안내

---

## 막힌 부분

### 슬라이딩 피커에서 현재 값을 정확히 가운데로

`scrollToPositionWithOffset(index, offset)`의 offset 기준이 헷갈려 현재 값이 아니라 엉뚱한 값이 가운데로 왔다. RecyclerView 아이템 폭이 측정 전엔 확정되지 않아 계산값과 실제 렌더 폭이 달랐던 것도 원인. 추정을 버리고, 대칭 패딩이면 스크롤 0에서 0번이 중앙이라는 점을 이용해 목표 스크롤을 `index × 아이템폭`으로 잡아 이동한 뒤, 실제 아이템 뷰 중심으로 미세 보정했다.

```kotlin
val pad = ((rv.width - itemW) / 2).coerceAtLeast(0)
rv.setPadding(pad, 0, pad, 0)
rv.doOnPreDraw {
    rv.scrollBy(index * itemW - rv.computeHorizontalScrollOffset(), 0)  // 산술 목표로 이동
    rv.post {                                                            // 레이아웃 확정 후 실측 보정
        rv.findViewHolderForAdapterPosition(index)?.let { vh ->
            rv.scrollBy((vh.itemView.left + vh.itemView.right) / 2 - rv.width / 2, 0)
        }
    }
}
```

### 재생 중 설정을 바꾸면 첫 박이 어긋남

BPM·박자표·사운드를 재생 중 바꾸면 소리와 발자국의 첫 박이 밀렸다. 두 가지였다 — (1) 미터가 같은 값으로 바뀌면(예 4/4→4/8) 재시작이 스킵돼 인디케이터만 리셋됨 → 미터 변경 땐 강제 재시작. (2) 옛 `AudioTrack`의 지연된 위치 콜백이 인디케이터를 밀어냄 → 재생 세대 토큰으로 옛 콜백 무시.

```kotlin
private var playToken = 0
// playPattern에서
val token = ++playToken
at.setPlaybackPositionUpdateListener(object : AudioTrack.OnPlaybackPositionUpdateListener {
    override fun onPeriodicNotification(t: AudioTrack) {
        runOnUiThread { if (token == playToken) highlightNextIndicator() }  // 최신 세대만
    }
    override fun onMarkerReached(t: AudioTrack) {}
})
```

### 컴파운드 박자 드럼 하이햇 정렬

6/8은 한 박이 8분음표 3개인데 하이햇을 박당 2/4로 균등 분할하니 그리드에서 어긋났다. 컴파운드면 3·6, 단순박이면 2·4로.

```kotlin
val eighthPerBeat = if (subsPerBeat == 3) 3 else 2   // 컴파운드는 박당 8분 3개
val hats = if (hihatSubs == 4) eighthPerBeat * 2 else eighthPerBeat
```

### 첫 박이 둘째 박보다 작게 들림

정적 버퍼를 무한 루프(`MODE_STATIC` + `setLoopPoints`)로 재생했는데, 루프 경계마다 첫 클릭이 약하게 들렸다. `AudioTrack`이 재생 시작·루프 이음새에서 클릭 잡음을 막으려 넣는 짧은 anti-pop 페이드가 첫 박의 어택을 깎은 것이다(모드 무관).

1차 완화로 모든 박을 `lead`(≈6ms)만큼 밀어 페이드가 무음 구간에 걸리게 했고(박 간격·템포 불변), 킥엔 고음 비터 어택을 얹어 폰 스피커에서 또렷하게 만들었다. 그래도 루프 경계 문제가 남아서, 결국 루프 자체를 없앴다 — 백그라운드 스레드가 패턴 버퍼를 끊김 없이 이어 `write`하는 `MODE_STREAM`으로 전환했다.

```kotlin
val at = AudioTrack.Builder()
    // ...
    .setTransferMode(AudioTrack.MODE_STREAM) // STATIC 루프 → STREAM 연속
    .build()
at.play()

audioThread = Thread {
    var w = 0
    while (token == playToken) {
        val n = at.write(pattern, w, pattern.size - w) // 패턴을 끊김 없이 반복 write
        if (n <= 0) break
        w += n
        if (w >= pattern.size) w = 0                   // 루프 경계 없이 이어 붙임
    }
}.also { it.start() }
```

정지는 `playToken++`로 스레드에 종료 신호를 주고 `pause()/flush()`로 블로킹 `write`를 풀어, 스레드가 자기 트랙을 정리한다(UI 블록 없음). 여기까지 해도 특정 기기에서 "첫 박이 미세하게 작게" 들리는 잔상이 남아, PCM gain은 동일한 걸 확인하고 기기 오디오 후처리를 의심하며 미해결 known issue로 기록해뒀다.

---

## 다음에 할 일

- "첫 박 작게 들림" 잔상 — 실기기 로그·출력 녹음으로 재조사 (헤드폰 vs 스피커)
- 실기기 최종 확인 — 컴파운드 강세, 발자국 세트 줄바꿈, 토치 빠른 템포 한계
- 설정 영속화 점검 — 테마·사운드·플래시 저장/복원
- 릴리스 준비 (versionCode 올리고 aab 빌드·업로드)
