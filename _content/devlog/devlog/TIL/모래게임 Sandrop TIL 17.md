---
layout: post
title: 모래게임 Sandrop TIL 17
date: 2026-07-27
permalink: "devlog/devlog/TIL/모래게임 Sandrop TIL 17"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 게임 오디오가 포커스를 안 잡게 해 효과음이 BGM을 안 끊게 하고, 효과음은 에셋별 풀로 연타를 겹치고, 붓기는 바구니별 루프 보이스+페이드로 붓는 동작에 맞춘 오디오 정리와, 진동·라이프사이클·logcat 디버깅·Kenney CC0 도안 파이프라인까지 오디오 안팎으로 나눠 정리한다.
tags:
  - Dart
  - Flutter
  - Python
---
## 오디오

게임에 배경음악(BGM)·효과음(SFX)을 넣으면서 audioplayers(플러터 오디오 재생 패키지) 하나로 오디오 계통을 정리했다. 핵심 목표는 두 가지였다 — 효과음이 나도 BGM이 안 끊기고, 붓기 소리가 화면의 붓는 그림에 맞는 것.

---

### 오디오 포커스를 아예 안 잡으면 효과음이 BGM을 안 끊는다

안드로이드는 소리를 낼 때 "오디오 포커스"라는 우선권을 요청한다. 효과음이 기본값(`AUDIOFOCUS_GAIN`)으로 포커스를 잡으면, 같은 앱의 BGM이라도 순간 밀려 끊긴다. 캐주얼 게임은 포커스를 아예 안 잡는 게 표준이라(다른 앱 음악과도 겹쳐 남), `AndroidAudioFocus.none`으로 두면 효과음이 BGM을 안 건드린다.

```dart
AudioContext(
  android: AudioContextAndroid(
    contentType: AndroidContentType.sonification,
    usageType: AndroidUsageType.game,
    audioFocus: AndroidAudioFocus.none, // 포커스를 안 잡아 BGM을 안 끊는다
  ),
)
```

---

### 전역 컨텍스트는 어떤 플레이어보다 먼저 걸어야 한다

플레이어는 만들어질 때 그 시점의 전역 오디오 컨텍스트를 물고 태어난다. 컨텍스트를 나중에 걸면, 먼저 만들어진 플레이어는 이미 기본 `GAIN` 포커스를 잡은 상태라 소용이 없다. 그래서 `AudioPlayer.global.setAudioContext(...)`를 init 맨 앞에 두고, 모든 플레이어를 그 뒤에 만든다.

```dart
await AudioPlayer.global.setAudioContext(gameCtx()); // 반드시 최우선
final bgm = AudioPlayer(playerId: 'bgm'); // 이제부터 만드는 건 none 포커스를 물고 나옴
```

---

### 오디오 백엔드는 섞지 말고 하나로

처음엔 "BGM은 just_audio(ExoPlayer), 효과음은 audioplayers"로 백엔드를 분리해 서로 안 끊게 하려 했다. 하지만 포커스만 none으로 정리하면 audioplayers 하나로도 안 끊긴다. 백엔드를 섞으면 두 네이티브 오디오 계통을 동시에 관리해야 해 복잡도만 늘어, 결국 just_audio를 걷어내고 단일 백엔드로 되돌렸다. 문제의 뿌리는 백엔드가 아니라 포커스였다. 덤으로 just_audio는 Windows 구현체가 없어 데스크톱 빌드에서 BGM이 조용히 안 나오고 있었는데(예외가 catch에 삼켜져 티도 안 났다), 단일화로 이것도 함께 해결됐다.

---

### 단발 효과음은 에셋별 AudioPool로 — 연타가 겹쳐 재생된다

플레이어 하나로 효과음을 재생하면, 새 재생이 그 플레이어의 소스를 갈아끼우며 이전 재생을 끊는다. 버튼을 빠르게 누르면 소리가 뚝뚝 잘린다. `AudioPool`은 같은 에셋에 플레이어 여러 개를 미리 만들어 돌려 쓰므로, 연타해도 서로 안 끊고 겹친다.

```dart
final pool = await AudioPool.createFromAsset(
  path: 'audio/sfx-click.ogg', minPlayers: 2, maxPlayers: 4);
await pool.start(volume: 0.32); // 연타해도 겹쳐 재생
```

---

### ReleaseMode — 루프냐 정지냐

`ReleaseMode.loop`는 끝나면 다시 재생, `ReleaseMode.stop`은 끝나면 멈춘다. BGM과 붓기(붓는 내내 이어져야 함)는 loop, 단발 효과음은 stop으로 둔다.

---

### 붓기는 바구니별 루프 보이스로 — 동시에 붓는 수만큼 겹친다

여러 바구니가 동시에 부어질 때 소리도 여러 겹으로 두꺼워지길 원했다. 붓기 보이스 풀(플레이어 6개)을 두고, 바구니 id마다 자유 보이스 하나를 잡아 루프 재생한다. 동시 붓기 수만큼 소리가 겹치고, 풀을 넘으면 자연히 캡된다.

```dart
final Map<int, AudioPlayer> _byId = {}; // 바구니 id → 재생 중인 보이스
final Map<AudioPlayer, Timer> _fades = {};
```

---

### 엔진이 "지금 붓는 바구니"를 알려주고, 오디오는 매 틱 diff한다

소리의 켜고 끔을 게임 상태에 붙이려면, 엔진이 매 순간 "지금 붓고 있는 바구니 집합"을 줘야 한다. 엔진에 `pouringIds()`(도달 가능한 빈칸이 있는 landed 바구니 id 집합)를 만들고, 오디오는 매 틱 이 집합을 이전과 비교해 새 id는 재생 시작, 사라진 id는 정지한다.

```dart
void syncPour(Set<int> ids) {
  for (final id in ids) {
    if (!_byId.containsKey(id)) _startVoice(id); // 새로 붓기 시작
  }
  for (final id in _byId.keys.toList()) {
    if (!ids.contains(id)) _stopVoice(id); // 붓기 끝 → 페이드아웃
  }
}
```

---

### 페이드아웃은 Timer로 직접 — 소리가 그림보다 길게 안 남게

붓기가 끝나면 소리가 바로 뚝 끊기지 않고 붓는 시간에 맞춰 사라져야 자연스럽다. 다만 소리가 그림보다 오래 남으면 어색하므로 페이드는 짧게(150ms). audioplayers엔 내장 페이드가 없어 `Timer.periodic`으로 볼륨을 단계적으로 낮췄다.

```dart
const steps = 6;
var i = steps;
_fades[p] = Timer.periodic(const Duration(milliseconds: 25), (t) {
  if (--i <= 0) { t.cancel(); p.stop(); }
  else p.setVolume(vol * i / steps);
});
```

---

### 붓기 소리 트리거는 "레일 도착"이 아니라 "실제 채움" 시점

처음엔 바구니가 레일에 올라오는 순간(mountAt)에 소리를 냈는데, 화면에선 아직 모래가 안 부어지고 있어 어긋났다. 실제로 픽셀이 채워지는 `pourTick`을 기준으로 옮기니 소리와 그림이 맞았다.

---

### 볼륨은 dB로 지정하고 선형으로 환산

효과음 균형을 "−10dB", "−15dB"처럼 dB 단위로 정하고, 선형 볼륨(0~1)으로 환산했다. `linear = 10^(dB/20)`.

```dart
// -10dB ≈ 0.32,  -15dB ≈ 0.18
double dbToLinear(double db) => math.pow(10, db / 20).toDouble();
```

---

### 사운드 토글은 sqflite pref에 저장하고 기본값은 켬

배경음악·효과음·진동 on/off는 sqflite 기반 pref로 저장한다. `boolPref`의 fallback을 `true`로 둬 처음 설치 시 소리가 기본으로 켜져 있게 했다.

---

### AudioContextIOS 생성자 assert가 init 전체를 죽였다 — BGM 첫 실행 무음의 범인

첫 실행에 BGM이 안 나왔다. 원인은 iOS 오디오 설정 조합이었다. `category: ambient`에 `mixWithOthers` 옵션을 같이 주면, audioplayers의 `AudioContextIOS` 생성자가 플랫폼과 무관하게 assert로 막는다. 안드로이드에서 돌려도 Dart 생성자에서 예외가 나, init 도중 터지면서 그 뒤의 `bgm.play()`까지 실행이 안 갔다.

```text
Failed assertion: 'mixWithOthers' can only be set if category is
playAndRecord, playback, or multiRoute
```

`ambient`는 그 자체로 다른 소리와 섞이고 무음 스위치를 따르므로 옵션이 필요 없다. `mixWithOthers`를 빼니 assert가 사라졌다.

```dart
iOS: AudioContextIOS(category: AVAudioSessionCategory.ambient, options: {}),
```

---

### init는 단계별 try/catch로 — 한 단계 실패가 뒤를 굶기지 않게

위 예외처럼 초기화 한 단계가 터지면 그 뒤 전부가 실행이 안 된다. 그래서 BGM 재생을 init 맨 앞으로 당기고, 각 단계(BGM·진동·효과음 컨텍스트)를 독립 try/catch로 감쌌다. 진동 확인이 실패해도 BGM은 나온다.

---

## 오디오 아닌 것

---

### logcat으로 원인을 짚었다 — 추측 수정 대신

"첫 실행 BGM 무음"을 코드만 보고 추측하는 대신, adb logcat에서 `E/flutter` assert 스택을 잡아 파일·라인(`sound_service.dart:35`)까지 정확히 특정했다. 로그를 지우고 앱을 재시작해 깨끗한 로그만 봤다.

```text
adb logcat -c          # 로그 비우기
# 앱 재시작 후
adb logcat -d | grep -iE "flutter|ExoPlayer|audioplayers"
```

---

### 진동은 vibration 패키지로 — HapticFeedback은 시스템 설정 따라 안 울린다

플러터 기본 `HapticFeedback`은 시스템 햅틱 설정이 꺼져 있으면 아무 반응이 없어 신뢰할 수 없었다. `vibration` 패키지는 진동 모터를 직접 울리고 세기(amplitude)도 준다. 못 나가는 탭은 약하게, 승리는 중간, 실패는 길고 강하게 3단계로.

```dart
if (await Vibration.hasVibrator() == true) {
  Vibration.vibrate(duration: 60, amplitude: 180); // 승리
}
```

---

### 앱 라이프사이클 — 백그라운드로 가면 소리를 멈춘다

`WidgetsBindingObserver`로 앱이 가려지면 BGM과 붓기 루프를 멈추고, 다시 앞으로 오면 (설정이 켜져 있을 때) BGM을 재개한다. 안 그러면 루프가 백그라운드에서 계속 돈다.

```dart
void didChangeAppLifecycleState(AppLifecycleState s) {
  if (s == AppLifecycleState.paused || s == AppLifecycleState.hidden) {
    sound.onAppPaused();
  } else if (s == AppLifecycleState.resumed) {
    sound.onAppResumed();
  }
}
```

---

### Kenney CC0 도안 파이프라인 — 임의 PNG를 양자화 게이트에 통과시켜 실측

도안 풀을 늘리는 소스로 Kenney(CC0 게임 에셋)를 실측했다. 양자화기 `quantize_png`는 노토 전용이 아니라 아무 PNG나 받아 32×32로 줄이고 게이트(채움 비율·색 수·색 구분)를 통과하면 도안을 낸다. 그래서 Kenney 스프라이트도 그대로 넣어 통과율을 잴 수 있었다.

```python
r = quantize_png(path)  # 통과하면 {'grid':..., 'palette':...}, 아니면 None
# Fish Pack 물고기 28 → 25 통과(89%)
# Food Kit Previews 200 → 135 통과(67%)
```

라이선스는 페이지를 긁어 확인했다 — kenney.nl 팩 페이지 HTML에서 zip 링크와 "CC0" 문자열을 찾아, 받기 전에 퍼블릭 도메인인지 검증했다.

```python
html = urlopen(f'https://kenney.nl/assets/{slug}').read().decode()
zips = re.findall(r'href=[\'"]([^\'"]+\.zip)[\'"]', html)
is_cc0 = 'CC0' in html
```
