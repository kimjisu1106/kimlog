---
layout: post
title: 메트로놈 Simple Metronome 8
date: 2026-07-09
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status: finished
description: 흩어진 설정을 우측 슬라이드 드로어로 통합하고 메인 화면을 미니멀하게 개편했으며, 박자표 슬라이딩 피커·가로 2단 레이아웃·드럼 비트 사운드·비트 플래시를 붙였다.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 흩어진 설정을 우측 슬라이드 드로어(`DrawerLayout`) 하나로 통합 (테마·BPM 기억·사운드·플래시·화면 회전)
- 메인 화면 미니멀 개편 — BPM 히어로 + 템포 이름, 원형 −/+ 버튼, 발자국 기준선
- 박자표 탭 → 분자/분모 2줄 슬라이딩 피커(가로 `RecyclerView` + `LinearSnapHelper`)
- 가로모드 좌(발자국)/우(컨트롤) 2단 — 회전 시 재생성되게 `configChanges`에서 orientation 제거, 상태는 ViewModel로 유지
- 사운드에 드럼 비트(코드 합성 kick/snare/hihat) + 하이햇 8/16, 비트 플래시(화면·토치)

---

## 막힌 부분

### 슬라이딩 피커에서 현재 값을 정확히 가운데로

`scrollToPositionWithOffset(index, offset)`의 offset 기준이 헷갈려 계속 어긋났다(현재 값이 아니라 엉뚱한 값이 가운데). 추정을 버리고, 대칭 패딩이면 스크롤 0에서 0번이 중앙이라는 점을 이용해 목표 스크롤을 `index × 아이템폭`으로 잡아 이동한 뒤 실제 아이템 뷰 중심으로 미세 보정했다.

```kotlin
val pad = ((rv.width - itemW) / 2).coerceAtLeast(0)
rv.setPadding(pad, 0, pad, 0)
rv.doOnPreDraw {
    rv.scrollBy(index * itemW - rv.computeHorizontalScrollOffset(), 0)
    rv.post {
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

### 첫 박이 둘째 박보다 작게 들림 (미해결)

메트로놈·드럼 둘 다 매 마디 첫 박이 작게 들렸다. 버퍼상 gain은 동일해서 데이터 문제는 아니었다. 시작 anti-pop 페이드를 의심해 무음 리드인을 넣고, 루프 경계 페이드를 의심해 `MODE_STATIC` 루프를 `MODE_STREAM` 연속 write로 바꿔봤지만 그대로였다. 기기 오디오 후처리로 의심하고 일단 미해결로 기록.

---

## 다음에 할 일

- "첫 박 작게 들림" 실기기 로그·출력 녹음으로 재조사 (헤드폰 vs 스피커 비교)
- 릴리스 준비 (versionCode 올리고 aab 빌드·업로드)
