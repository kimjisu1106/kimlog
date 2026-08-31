---
layout: post
title: 모래게임 Sandrop TIL 19
date: 2026-07-29
permalink: "8siqqwwz"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: RepaintBoundary를 어디에 붙이고 어디에 안 붙이는지, 캐시를 통째로 비우면 캐시가 아니게 되는 이유, 테스트가 못 잡는 회귀를 assert로 막은 방법, 라이프사이클만으로는 못 막는 소리, 그리고 출시 전에만 바꿀 수 있는 것들까지.
tags:
  - Dart
  - Flutter
  - Python
---
## 렌더링 성능

---

### RepaintBoundary는 "안 변하는 것"에 붙인다

게임 루프가 매 프레임 `setState`를 부르면 화면 전체가 다시 그려진다. `shouldRepaint`가 `false`를 돌려줘도 소용없다 — 그건 자기 자신이 무효화를 일으킬지만 정하고, 위쪽에서 다시 그리라고 하면 어차피 그려진다.

경계를 둬야 그 안쪽이 독립적으로 캐시된다.

```dart
// 판이 끝날 때까지 안 변하는 썸네일 — 30×30dp 안에 4096개 사각형을 매 프레임 다시 그렸다
RepaintBoundary(
  child: CustomPaint(painter: LevelTargetPainter(level: level, palette: palette)),
)
```

이것만으로 게임 전체 그리기 호출의 절반이 사라졌다.

반대로 모래 캔버스에는 안 붙였다. 거긴 실제로 매 프레임 바뀌므로 경계를 둬도 래스터를 다시 떠야 한다. 경계는 공짜가 아니라 레이어를 하나 더 만드는 비용이 있다.

> 판단 기준은 "느린가"가 아니라 "안 변하는가" 다.

---

### shouldRepaint는 리스트를 내용이 아니라 정체로 비교한다

레벨 선택 화면의 썸네일이 스크롤할 때마다 새로 그려지고 있었다. 범인은 팔레트를 만드는 함수였다.

```dart
// ❌ 호출할 때마다 새 리스트 — 내용은 같아도 다른 객체다
static List<Color> candyPalette(List<int> argb) => [
  for (final v in argb) candyBoost(Color(v)),
];
```

`shouldRepaint`에서 `old.palette != palette` 로 비교하면 리스트는 정체(identity)로 비교되므로 항상 "바뀌었다"가 된다. 결과적으로 캐시가 매번 버려졌다.

```dart
// ✅ 같은 입력에는 같은 리스트를 돌려준다
static final Map<String, List<Color>> _cache = {};
static List<Color> candyPalette(List<int> argb) =>
    _cache.putIfAbsent(argb.join(','), () => [...]);
```

같은 이유로, 미리 계산해 넘기는 리스트는 새로 만들어 교체해야지 제자리에서 고치면 안 된다. 고치면 정체가 그대로라 "안 바뀌었다"가 되어 낡은 화면이 남는다.

---

### 프레임마다 변하는 것과 아닌 것을 갈라낸다

모래 알갱이의 질감은 픽셀마다 밝기를 조금씩 흔들어 만든다. 그 값이 픽셀 번호로만 정해지는데도 매 프레임 4096번 다시 계산하고 있었다.

```dart
// 이 해시는 i에만 의존한다 — 프레임이 바뀌어도 답이 같다
var h = 0x9E3779B1 * (i + 1);
h ^= h >> 15;
h = (h * 0x85EBCA6B) & 0x7FFFFFFF;
```

판에 들어올 때 한 번만 만들어 두고 인덱싱한다. 초당 수십 MB씩 생기던 쓰레기가 사라졌다.

한 가지 더 — 표면 윤곽선 색은 그릴지 판단하기도 전에 칸마다 두 개씩 만들고 있었다. 실제로 그리는 건 5%도 안 되는데.

```dart
// ❌ 4096칸마다 두 개씩 만들고 대부분 버림
paint.color = Color.lerp(full, Colors.black, 0.35)!.withValues(alpha: crustAlpha);
if (노출면인가) { ... }

// ✅ 팔레트 크기(≈8)만큼만 만들어 두고 인덱싱
final crust = [for (final c in crustByIndex) c.withValues(alpha: crustAlpha)];
```

"계산이 무거운가"보다 "몇 번 하는가"를 먼저 본다.

---

## 캐시

---

### 통째로 비우는 캐시는 캐시가 아니다

모래가 어느 칸에 찰지 찾는 계산에 캐시를 뒀는데, 알갱이 하나를 채울 때마다 통째로 비우고 있었다.

```dart
filled[i] = true;
_lowestCache.clear();   // ← 다음 알갱이에서 전부 다시 계산
```

초당 360알갱이가 떨어지므로 캐시는 사실상 없는 것과 같았다. 특히 다 쓴 색은 항상 최악이다 — 4096칸을 전부 훑고 "없음"을 돌려주는데, 그 "없음"조차 다음 알갱이에서 버려진다.

무효화 범위를 따져 보니 훨씬 좁았다. 도달 가능 여부를 판정하는 함수가 자기 칸과 바로 아래 칸만 읽으므로, 한 칸을 채워서 답이 바뀌는 건 두 칸뿐이다.

```dart
void _invalidateAround(int i) {
  _lowestCache.remove(target[i]);                         // 방금 채워 소진된 색
  if (i >= width) _lowestCache.remove(target[i - width]); // 이제 받을 수 있게 된 위 칸
}
```

무효화 범위는 "무엇이 바뀌었나"가 아니라 "무엇을 읽었나"로 정한다.

---

### 테스트가 못 잡는 회귀는 assert로 막는다

위 최적화는 게임 규칙의 핵심이라 잘못되면 그림이 다르게 채워진다. 그런데 테스트를 보니 이 회귀를 못 잡는다.

- 파이썬 엔진과의 대조 테스트: 채운 칸의 개수만 비교
- 500레벨 봇 테스트: 클리어했는지만 확인

모래가 엉뚱한 칸에 차도 둘 다 통과한다.

그래서 옛 방식을 지우지 않고 남겨 두고, 답이 같은지 매번 확인하게 했다.

```dart
int _lowestReachableOf(int color) {
  final v = _lowestCache[color] ??= _scanLowestOf(color);
  assert(v == _scanLowestOf(color), '캐시가 전면 스캔과 다른 답을 냈다');
  return v;
}
```

`flutter test`는 assert가 켜진 채로 돌기 때문에, 이걸 넣는 순간 기존 테스트 585개가 비로소 칸 위치까지 검증하게 된다. 500레벨 봇 플레이 전체에서 한 번도 안 걸렸다.

> 테스트를 새로 짜는 것보다, 기존 테스트가 지나가는 길목에 검사를 놓는 게 쌌다.

---

## 상태와 생명주기

---

### 라이프사이클 신호만으로는 소리를 못 멈춘다

붓는 소리가 안 멈추는 버그를 두 번 고쳤는데 또 나왔다. 세 번째 원인은 이랬다.

앱이 가려질 때 소리를 끄게 해 뒀는데, 최근 앱 목록 화면에서는 앱이 계속 그려진다. 즉 게임 루프가 안 멈춘다.

```text
onAppPaused() → 소리 끔
   ↓ (다음 프레임, 루프는 여전히 돌고 있음)
게임 루프 → "지금 붓는 중이니 소리 켜" → 원상복구
```

라이프사이클 쪽에서 아무리 꺼도 상태 동기화 코드가 도로 켠다. 그래서 소리 쪽에 빗장을 걸었다.

```dart
void syncPour(Set<int> pouringIds) {
  if (!_sfxOn || !_appActive) {   // 앱이 앞에 없으면 아예 안 켠다
    if (_playing.isNotEmpty) stopAll();
    return;
  }
  ...
}
```

"끄는 쪽"만 고치면 "켜는 쪽"이 되돌린다. 상태를 되돌릴 수 있는 경로가 있으면 거기도 막아야 한다.

---

### 비동기 시작은 취소 신호를 못 받는다

같은 버그의 다른 원인. 소리를 켜는 코드가 비동기였다.

```dart
// ❌ 이 사이에 "전부 꺼" 명령이 들어오면?
await player.setVolume(volume);
await player.play(source);   // ← 꺼진 뒤에 시작된다. 아무도 관리하지 않는 소리가 남는다
```

정지 명령이 먼저 처리되고 재생이 나중에 완료되면, 그 소리는 어느 목록에도 없어 다시 끌 방법이 없다. 세대 번호로 막았다.

```dart
Future<void> _play(AudioPlayer p, int gen) async {
  await p.setVolume(volume);
  if (gen != _generation) return;        // 그 사이 전체 정지 → 시작하지 않는다
  await p.play(source);
  if (gen != _generation) await p.stop(); // 재생 직후 정지였다면 되돌린다
}
```

`stopAll()`이 `_generation++`을 한다. 비동기 작업은 시작할 때의 세대를 기억했다가, 끝날 때 아직 유효한지 확인해야 한다.

---

### 광고 API의 "보여줬다"는 "닫혔다"가 아니다

레벨을 깨고 넘어갈 때 다음 레벨이 먼저 뜨고 그 위를 광고가 덮었다.

```dart
await ad.show();   // 광고가 *뜨는* 순간 끝난다. 닫힘이 아니다
go();              // 그래서 곧바로 다음 화면으로 넘어간다
```

닫힘은 콜백으로만 온다. `Completer`로 이어 붙여 기다리게 했다.

```dart
final closed = Completer<void>();
ad.fullScreenContentCallback = FullScreenContentCallback(
  onAdDismissedFullScreenContent: (ad) { ad.dispose(); closed.complete(); },
  onAdFailedToShowFullScreenContent: (ad, _) { ad.dispose(); closed.complete(); },
);
await ad.show();
await closed.future.timeout(const Duration(seconds: 30), onTimeout: () {});
```

콜백이 영영 안 오면 게임이 멈추므로 상한을 둔다. 외부 SDK를 기다릴 때는 늘.

---

## 코드 구조

---

### 파일을 나눌 때 이름을 공개로 바꾸지 않는 법

한 파일이 3483줄이 됐다. 나누고 싶은데 `_Walker`·`_Geo` 같은 private 이름이 많아, 별도 라이브러리로 옮기면 전부 공개로 바꿔야 한다. 그러면 캡슐화가 풀리고 호출부가 전부 바뀌어, 순수 이동이어야 할 작업이 위험해진다.

`part`를 쓰면 이름을 그대로 두고 파일만 나눌 수 있다.

```dart
// game_page.dart
part 'game_scene.dart';
part 'game_painters.dart';

// game_painters.dart
part of 'game_page.dart';
class _CanvasPainter extends CustomPainter { ... }   // private 그대로
```

3483 → 2278줄이 됐고 코드는 한 줄도 안 고쳤다. 상태에 얽힌 것(틱 루프·모달·튜토리얼)은 손대지 않았다 — 위험 대비 이득이 낮다.

---

## 출시 준비

---

### 패키지 이름은 올리면 영영 못 바꾼다

`flutter create sandart`로 시작한 흔적이 그대로 남아 있었다. 폰 홈화면에도 `sandart`로 떴고, 패키지 이름은 스토어 주소에 박힌다.

```text
play.google.com/store/apps/details?id=com.kimlog0415.sandart
```

출시하면 절대 못 바꾼다. 이름을 정했다면 첫 업로드 전에 정리해야 한다. 고칠 곳은 다섯 군데였다 — Gradle의 `applicationId`·`namespace`, Kotlin 소스 디렉터리와 패키지 선언, 매니페스트의 표시 이름, pubspec 이름, 그리고 `package:` import 전부.

바뀐 걸 확인하려면 빌드된 APK를 직접 뜯어 보는 게 확실하다.

```bash
aapt2 dump badging app-debug.apk | grep -E "^package:|application-label:"
```

---

### 설정 파일이 시크릿인지 아닌지 구분하기

분석 도구를 붙이며 받은 설정 파일이 기본적으로 커밋 제외 목록에 있었다. 그런데 이 파일은 APK 안에 그대로 들어간다 — 앱을 뜯으면 30초면 나온다. 숨길 수 있는 물건이 아니다.

- 안에 개인키가 없고, 키처럼 보이는 값은 클라이언트 식별자다
- 접근 제어는 키가 아니라 서버 쪽 규칙이 한다
- 반대로 제외해 두면 새로 클론했을 때 분석이 조용히 꺼진 채로 빌드된다 — 앱은 정상 동작해서 눈치채기 어렵다

그래서 커밋하기로 했다. 대신 서명 키는 전혀 다른 이야기다 — 유출되면 남이 내 앱인 척 업데이트를 올릴 수 있다. 그건 계속 막는다.

판단 기준은 "비밀스러워 보이는가"가 아니라 "이걸 가진 사람이 무엇을 할 수 있는가" 다.

---

## 기능 설계

---

### 선택의 재미는 배정 시점과 무관하다

일일 접속 보상으로 상자 아홉 개 중 하나를 고르게 했다. 구현할 때 두 가지 방법이 있다.

1. 상자마다 미리 보상을 배정해 두고, 고른 것을 준다
2. 고른 뒤에 뽑는다

1번은 뒤로가기나 앱 재시작으로 다시 뽑는 걸 막아야 한다. 2번은 그 문제가 없다. 그리고 플레이어 입장에서 둘은 구분되지 않는다 — 고르는 재미는 "내가 골랐다"는 감각에서 오지 실제 배정 시점에서 오지 않는다.

확률 가중도 확률표 대신 중복 등록으로 줬다.

```dart
static const List<DailyReward> dailyRewards = [
  DailyReward.coins(50),   // 흔한 것은 여러 번 넣는다
  DailyReward.coins(50),
  DailyReward.coins(100),
  ...
];
```

확률표를 따로 두면 합이 1인지 사람이 검산해야 하고, 항목을 지웠을 때 조용히 어긋난다.

---

### 새 상태를 줄 때는 눈에 보이게

보상 중 하나가 "하트 무제한 30분"이었다. 그 시간 동안 레벨에 들어가도 하트를 안 쓴다.

여기서 놓치기 쉬운 것 — 화면에 안 보여주면 받은 줄 모른다. 무제한인데도 하트를 아끼며 안 하게 된다. HUD의 하트 숫자를 `∞`와 남은 시간으로 바꾸고 강조색을 줬다.

그리고 이미 남아 있는데 또 받으면 뒤에 이어 붙인다.

```dart
final base = untilMs > now ? untilMs : now;   // 덮어쓰면 30분짜리가 10분으로 줄어든다
await append(Delta(now, 'unlimited', (base + minutes * 60000) ~/ 60000));
```

---

### 시간에 의존하는 기능은 시계를 주입받는다

무제한 하트는 "지금이 끝나는 시각 전인가"로 판정한다. `DateTime.now()`를 직접 쓰면 테스트를 못 짠다 — 30분을 실제로 기다릴 수는 없다.

다행히 이 프로젝트는 이미 시계를 주입받고 있었다.

```dart
MetaService(this.ledger, {int Function()? now})
  : _now = now ?? (() => DateTime.now().millisecondsSinceEpoch);
```

처음엔 무심코 `DateTime.now()`를 썼다가, 테스트를 짜려는 순간 막혀서 고쳤다. 덕분에 "시간이 지나면 원래대로 돌아오는가"를 검증할 수 있었다.

```dart
now += 11 * minute;
expect(m.hasUnlimitedHearts, isFalse);
```
