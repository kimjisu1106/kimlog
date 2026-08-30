---
layout: post
title: 메트로놈 Simple Metronome 14
date: 2026-08-18
permalink: "devlog/apps/메트로놈 Simple Metronome/메트로놈 Simple Metronome 14"
categories:
  - log
  - apps
project: simple-metronome
project_name: 메트로놈 Simple Metronome
video_id:
app_url: https://play.google.com/store/apps/details?id=io.github.kimjisu1106.simplemetronome
status:
description: 알림 재생/정지를 넘어 잠금화면·블루투스 버튼까지 받는 미디어 세션(v1.16)을 붙이고, 인디케이터를 눌러 박마다 강박·음소거를 정하는 기능(v1.17)을 더해 두 버전을 출시한 기록.
tags:
  - Android-Studio
  - Kotlin
---
## 오늘 한 일

- 잠금화면·시스템 미디어 패널·블루투스/이어폰 버튼으로 재생·정지되게 함 — 미디어 세션 연결, v1.16 출시
- 박마다 강세를 정하는 기능 — 인디케이터를 누르면 강박(높은 음) → 일반 → 음소거로 바뀌고, 강박은 테두리 링·음소거는 흐리게 표시, 박자표별로 저장, v1.17 출시
- 블루투스 이어폰은 소리가 조금 늦을 수 있다는 안내를 도움말에 추가
- 제품 페이지(`logstone.net/metronome/`)에 버전별 업데이트 내역을 붙임 — 코드 저장소가 비공개라 GitHub에서 못 긁으니, 내역 파일을 샵 저장소에 두고 빌드할 때 읽는 방식으로

---

## 막힌 부분

### 재생/정지 알림은 있는데 왜 잠금화면 컨트롤은 안 뜨나

알림에 재생·정지 버튼은 이미 있었다. 그런데 잠금화면, 시스템 미디어 패널, 블루투스 이어폰의 재생 버튼은 아무 반응이 없었다.

이 버튼들은 일반 알림 액션이 아니라 안드로이드 "미디어 세션"을 거쳐야 뜬다. 재생 중이라는 상태와 곡 정보를 세션에 실어 시스템에 알려야, 시스템이 잠금화면·패널에 컨트롤을 그려 주고 하드웨어 버튼도 그 세션으로 라우팅한다.

- 해결: `MediaSessionCompat`을 만들어 재생 상태(`PlaybackState`)와 정보(`Metadata`, BPM·박자표)를 시스템에 올림.
- 해결: 알림을 `MediaStyle`로 바꿔 세션 토큰에 연결.
- 해결: 블루투스·이어폰 버튼은 `MediaButtonReceiver`로 받아 서비스에 전달 — 세션 콜백의 재생/일시정지/정지로 이어짐.

### 강박 소리는 샘플을 늘리지 않고 만들었다

높은 음 클릭을 새 오디오 파일로 넣으면 앱 용량이 늘고 음색도 따로 관리해야 한다. 대신 기존 클릭 소리를 더 빠르게 다시 읽어(리샘플) 피치만 올렸다. 파일이 안 늘고 원래 클릭 음색이 유지된다.

```kotlin
// 클릭을 높은 피치로 리샘플(강박용). ratio>1이면 더 높은 음.
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

- 해결: 서비스 시작 때 `accentClickPcm = resamplePitch(clickPcm, 1.5)`을 한 번 만들어 두고, 강박으로 지정된 박에서만 이 소리를 씀. 음소거 박은 그 박을 통째로 건너뜀.

### 강박 표식이 박 점등과 겹치지 않게 — 층을 나눔

인디케이터는 재생 중 배경색을 바꿔 켜진 박을 표시한다. 강박 링을 같은 배경에 그리면 박이 켜질 때 링이 덮여 사라진다.

그래서 표식을 점등과 다른 층에 얹었다. 강박 링은 뷰의 앞면(foreground), 음소거의 흐림은 박 그룹의 투명도(alpha)로 처리했다. 점등이 쓰는 배경과 층이 달라 서로 건드리지 않는다.

- 해결: 강박 = 앞면에 테두리 링(강조색), 음소거 = 그룹 alpha 0.3. 켜짐/꺼짐 색칠은 배경 틴트 그대로.
- 남은 처리: 강박 패턴은 박 수(4/4·3/4 등)를 키로 한 저장소에 따로 담았다. 박자표를 바꾸면 그 박 수에 맞는 패턴을 다시 불러와, 4/4에서 정한 강박이 3/4로 새지 않는다.

### 블루투스 이어폰 딜레이는 앱에서 못 잡았다

무선 이어폰으로 들으면 박이 조금 늦게 들린다. 앱 코드로 당길 수 있는지부터 확인했는데, 블루투스 오디오는 코덱 버퍼링 때문에 150~250ms 지연이 구조적으로 생긴다 — 앱 밖 요인이다.

- 해결: 도움말에 유선 이어폰·스피커를 쓰거나 화면·플래시로 박을 확인하라는 안내만 넣음.

---

## 다음에 할 일

- 설정에 문의 버튼(`support@logstone.net` 메일 열기) 추가 — 앱 안에 연락 경로가 아직 없음
- (deferrable) 이어폰을 뽑으면 자동으로 멈추게 할지, 오디오 포커스를 받을지 검토
- 첫 박이 둘째 박보다 조금 작게 들리는 이슈 — 앱에서 조정할 레버는 소진했고, 다른 기기·헤드폰으로 재확인
