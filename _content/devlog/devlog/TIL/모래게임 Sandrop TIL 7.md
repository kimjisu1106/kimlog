---
layout: post
title: 모래게임 Sandrop TIL 7
date: 2026-07-15
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
description: AdMob 보상형·전면 연동과 테스트/실제 ID 분기, 하루 광고 코인 상한, 델타 원장 설정 토글, 하단 탭 셸과 RouteAware 복귀 감지, pushReplacement의 await 조기완료 함정, GlobalKey 좌표로 코인 비행, 하트 카운트다운, 지연 렌더 목록 중앙정렬, 위젯 테스트 함정, 흰색 도안 색 보정까지.
tags:
  - Dart
  - Flutter
  - Python
---
## 광고 (AdMob)

### 광고는 붙이기 전에 "자리"를 UI로 먼저 만들어 둔다

보상형 광고 버튼("광고 보고 이어하기", "광고 보고 코인 2배")을 먼저 비활성 상태로 만들어 두고, 나중에 실제 광고 단위 ID가 생겼을 때 로직만 끼웠다. 그러니 연결이 버튼 하나에 콜백 하나 다는 수준으로 끝났다. `AdService` 싱글턴이 보상형·전면을 하나씩 미리 실어 두고(preload), 보여준 뒤 곧바로 다음 것을 싣는다.

```dart
class AdService {
  AdService._();
  static final AdService instance = AdService._();
  RewardedAd? _rewarded;

  Future<void> init() async {
    await MobileAds.instance.initialize();
    _loadRewarded();
    _loadInterstitial();
  }

  void _loadRewarded() {
    RewardedAd.load(
      adUnitId: _rewardedUnit,
      request: const AdRequest(),
      rewardedAdLoadCallback: RewardedAdLoadCallback(
        onAdLoaded: (ad) => _rewarded = ad,
        onAdFailedToLoad: (_) => _rewarded = null,
      ),
    );
  }
}
```

---

### 보상은 광고를 끝까지 본 콜백 안에서만 준다

`showRewarded`는 `onUserEarnedReward` 콜백에서만 보상을 지급한다. 광고를 중간에 닫으면 이 콜백이 안 불려서 공짜 보상이 새지 않는다.

```dart
Future<bool> showRewarded(VoidCallback onReward) async {
  final ad = _rewarded;
  if (ad == null) { _loadRewarded(); return false; } // 준비 안 됨
  _rewarded = null;
  var rewarded = false;
  await ad.show(onUserEarnedReward: (_, _) { rewarded = true; onReward(); });
  return rewarded;
}
```

준비가 안 됐으면 다음 로드만 걸고 `false`를 돌려준다. 호출부는 이때 스낵바로 "잠시 후 다시"만 안내한다 — 광고 때문에 게임 흐름이 막히면 안 된다.

---

### 개발 중에는 테스트 광고, 릴리스에서만 실제 광고

실제 광고 단위를 개발 중 클릭하면 AdMob 계정이 정지될 수 있다. 그래서 `kDebugMode`로 ID를 가른다. 실제 ID는 릴리스 빌드에만 나간다.

```dart
String get _rewardedUnit =>
    kDebugMode ? _testRewarded : GameConfig.admobRewardedAndroid;
```

광고 단위 ID 자체는 앱 바이너리에 그대로 담기는 공개 식별자라 시크릿이 아니다. 코드에 둬도 된다. AdMob 앱 ID는 `AndroidManifest.xml`의 meta-data로 넣고, `google_mobile_ads`는 minSdk를 요구하므로 그 조건도 맞춘다.

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-..."/>
```

---

### 전면 광고는 빈도를 캡으로 조인다

전면 광고가 매 레벨 뜨면 이탈한다. 새로 클리어한 세션마다 세어 N회에 한 번만 띄우고, 광고 제거(NO ADS)를 산 사람에겐 안 띄운다.

```dart
Future<void> maybeShowInterstitial({required bool noAds}) async {
  if (noAds) return;
  _clearsSinceInterstitial++;
  if (_clearsSinceInterstitial < GameConfig.interstitialEveryNClears) return;
  // ... 광고 show, 카운터 리셋 ...
}
```

---

## 수익화·메타

### 하루 N회 제한 — 로컬 자정 경계로 오늘 횟수를 센다

"광고 보고 코인 받기"를 하루 3회로 막으려면 "오늘"의 경계가 필요하다. 원장의 타임스탬프(ms)를 로컬 시간으로 바꿔 그날 자정 이후의 `ad_coin` 기록만 센다.

```dart
int _todayStartMs() {
  final now = DateTime.fromMillisecondsSinceEpoch(_now()); // 로컬 시간
  return DateTime(now.year, now.month, now.day).millisecondsSinceEpoch;
}

int adCoinsToday() {
  final start = _todayStartMs();
  return _deltas.where((d) => d.kind == 'ad_coin' && d.ts >= start).length;
}

bool canWatchAdForCoins() => adCoinsToday() < GameConfig.dailyAdCoinCap;
```

서버 없이 로컬 원장만으로 판정한다. 코인 지급과 횟수 기록을 같이 남긴다.

```dart
Future<void> grantAdCoins() async {
  if (!canWatchAdForCoins()) return;
  await addCoins(GameConfig.adCoinReward);
  await _append(Delta(_now(), 'ad_coin', 1));
}
```

---

### 켜고 끄는 설정은 내역의 마지막 값만 본다

재화(코인·하트)는 쌓인 입출금 내역(델타)을 전부 더해 잔액을 읽지만, 사운드·진동 같은 켜고 끄기 설정은 더하면 안 되고 가장 최근에 바꾼 값이어야 한다. 내역은 뒤에만 덧붙고 지우지 않으므로, 맨 뒤에서부터 거슬러 올라가 그 설정을 마지막으로 바꾼 기록을 찾으면 된다.

```dart
bool boolPref(String key, {bool fallback = true}) {
  for (final d in _deltas.reversed) {
    if (d.kind == 'pref_$key') return d.value != 0;
  }
  return fallback;
}
Future<void> setBoolPref(String key, bool v) =>
    _append(Delta(_now(), 'pref_$key', v ? 1 : 0));
```

토글을 자주 안 누르니 내역이 느리게만 자란다 — 허용 범위다.

---

### 결제 없이도 상점의 절반은 먼저 출시할 수 있다

상점에 광고 코인·아이템(코인 구매)은 지금 동작하게 두고, 결제(IAP)가 필요한 NO ADS·번들만 "준비 중"으로 비활성화했다. 그러면 지금 당장 상점의 정보 구조·동선·문구를 실기기에서 검증하고, 나중에 결제만 끼우면 된다. 코인 획득을 아예 광고 중심으로 돌려서 코인팩 결제 자체를 없앤 것도 상점을 단순하게 만들었다.

참고로 스토어 IAP 가격은 앱에 금액을 박지 않는다. Google Play·App Store가 가격 티어로 각 나라 통화·심리적 가격대(₩1,500, ¥160)로 현지화해 주므로, 결선 때 스토어가 주는 `ProductDetails.price` 문자열을 그대로 표시한다.

---

## 내비게이션·셸

### 탭을 오가도 각 탭의 상태를 잃지 않게

홈(여정)·상점·설정 3탭을 아래쪽 탭바로 두고, 본문 세 화면은 `IndexedStack`으로 겹쳐 둔다. `IndexedStack`은 지금 안 보이는 탭도 화면에서 치우지 않고 뒤에 살려 두는 위젯이라, 탭을 오가도 각 화면의 스크롤 위치와 입력 상태가 그대로 남는다.

```dart
Scaffold(
  body: IndexedStack(index: _tab, children: pages),
  bottomNavigationBar: BottomNavigationBar(
    currentIndex: _tab, onTap: _select, /* ... */),
)
```

### 게임 화면은 탭바 위로 통째로 덮어 연다

탭 안에서 게임을 열 때, 탭 안쪽에 별도의 화면 전환 관리자(Navigator)를 따로 두지 않았다. 앱 전체에 화면 스택이 하나뿐이라, 탭 셸이 깔린 상태에서 그 위로 게임 화면을 얹으면(push) 새 화면이 탭바까지 통째로 덮는다 — 게임 중엔 탭바가 자연히 사라진다.

### 홈 재탭·상점 전환은 컨트롤러로 위로 알린다

탭 셸이 자식(여정 화면)에게 "현재 노드로 스크롤"을 시키려고 작은 핸들 객체를 넘긴다. 자식이 자기 메서드를 거기 등록하고, 셸은 그걸 호출한다.

```dart
class LevelSelectController { VoidCallback? _recenter; void recenter() => _recenter?.call(); }
// 자식 initState: widget.controller?._recenter = _centerCurrent;
// 셸: 홈 탭을 이미 홈에서 다시 누르면 _levelController.recenter();
```

### 뒤로가기 버튼은 pop할 게 있을 때만

상점이 탭이 되면서 뒤로가기(pop)가 위험해졌다 — 탭 루트에서 pop하면 셸이 통째로 닫힌다. `Navigator.canPop()`으로 갈랐다. 탭일 땐 false라 버튼을 숨기고, 단독으로 push된 경우(테스트 등)만 보여준다.

---

### 레벨을 넘길 때 이전 화면을 치워버려 "끝났다" 신호가 너무 일찍 온다 (오늘의 버그)

레벨을 40→41→42 연달아 하고 X로 나오면 목록이 갱신되지 않았다. 원인이 미묘했다. 목록 화면은 "게임 화면을 띄우고, 그 화면이 닫혀 돌아오면 목록을 새로고침"하는 구조였다. 그런데 다음 레벨로 넘어갈 때는 게임 화면을 새로 얹는 게 아니라 지금 화면을 새 레벨 화면으로 갈아 끼운다(pushReplacement). 문제는 이 "갈아 끼우기"가 일어나는 순간, 시스템이 치워지는 이전 화면을 향해 "이 화면은 끝났다"는 완료 신호를 곧바로 보낸다는 점이다. 그래서 40에서 41로 넘어가는 순간 목록은 "게임이 끝났구나" 하고 새로고침을 이미 해버리고, 정작 42에서 X로 진짜 목록에 돌아왔을 땐 아무도 그 복귀를 기다리고 있지 않았다.

```dart
// 이 await는 40 게임이 "교체되는" 순간(41로 넘어갈 때) 이미 반환된다
await navigator.push(MaterialPageRoute(builder: (_) => game40));
setState(() {}); _centerCurrent(); // → 여정 도중에 헛되이 실행됨
```

### 해결 — "게임이 끝나면"이 아니라 "이 목록으로 돌아오는 순간"을 감지한다

기다려야 할 대상을 바꿨다. "게임이 끝나면"이 아니라 "이 목록 화면으로 돌아오는 순간"을 직접 감지하기로 했다. 앱에 화면 전환을 지켜보는 감시자(RouteObserver)를 하나 등록하고 목록 화면을 거기 구독시켜 두면, 위에 얹혔던 화면이 닫히고 이 목록으로 돌아올 때마다 `didPopNext()`가 한 번 불린다 — 중간에 화면을 새로 얹었든 갈아 끼웠든 상관없이 항상 불린다.

```dart
// main.dart
final appRouteObserver = RouteObserver<PageRoute<void>>();
MaterialApp(navigatorObservers: [appRouteObserver], /* ... */);

// 목록 화면
class _LevelSelectScreenState extends State<...> with RouteAware {
  @override void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route is PageRoute) appRouteObserver.subscribe(this, route);
  }
  @override void dispose() { appRouteObserver.unsubscribe(this); /* ... */ }

  @override void didPopNext() { // 게임에서 돌아온 순간
    setState(() {}); _centerCurrent();
    if (meta.clearedLevels.length > _clearedBefore) showInterstitial();
  }
}
```

---

## 승리 화면 연출

### 출발점과 도착점의 실제 위치를 재서 그 사이로 코인을 날린다

승리 보상 코인을 우상단 코인 카운터로 날려 보내려면, 출발점(보상 배지)과 도착점(코인 카운터)이 지금 화면의 어디에 있는지 실제 위치를 알아야 한다. 두 위젯에 각각 이름표(GlobalKey)를 달아 두면 나중에 그 위젯을 찾아 화면상 좌표를 잴 수 있다. 그렇게 잰 화면 전체 기준 좌표를, 코인 애니메이션을 얹을 판(Stack) 기준 좌표로 다시 환산한다.

```dart
bool _computeFlyPoints() {
  final stack = _stackKey.currentContext?.findRenderObject() as RenderBox?;
  final from = _rewardBadgeKey.currentContext?.findRenderObject() as RenderBox?;
  final to = _coinCounterKey.currentContext?.findRenderObject() as RenderBox?;
  if (stack == null || from == null || to == null) return false;
  Offset centerOf(RenderBox b) =>
      stack.globalToLocal(b.localToGlobal(b.size.center(Offset.zero)));
  _flyFrom = centerOf(from); _flyTo = centerOf(to);
  return true;
}
```

### 곡선으로 날리고 줄이고 흐린다 (2차 베지어)

직선으로 가면 심심하다. 출발점과 도착점 사이, 중간보다 살짝 위에 당김점(제어점)을 하나 두고 그 점 쪽으로 휘어지는 곡선(2차 베지어)으로 아치를 그리며, 날아가는 동안 코인을 점점 작게·흐리게 만든다.

```dart
Offset _quadBezier(Offset a, Offset b, Offset c, double t) {
  final u = 1 - t;
  return a * (u * u) + b * (2 * u * t) + c * (t * t);
}
// mid = Offset((from.dx+to.dx)/2, min(from.dy, to.dy) - 48); // 살짝 솟은 제어점
```

### "쌓이는" 인상은 표시를 잠깐 늦춰서 만든다

코인은 이미 클리어 시점에 지급됐다(원장엔 +50이 들어 있다). 그런데 카운터가 처음부터 늘어난 값을 보여주면 "날아와 쌓이는" 느낌이 안 난다. 그래서 도착 전엔 보상만큼 뺀 값을 보여주고, 코인이 도착하면 그때 진짜 값으로 올린다.

```dart
final withhold = _coinRewardPending && !_coinFlew ? GameConfig.clearReward : 0;
Text('${meta.coins - withhold}'); // 도착 후 _coinFlew=true → 실제 값
```

### 애니메이션이 둘로 늘면 박동기도 여러 개짜리로 바꾼다

애니메이션은 매 프레임 박자를 찍어 주는 심장박동기(Ticker) 하나에 물려 돌아간다. 게임 루프용 박동기 하나만 있던 화면에 코인 비행 애니메이션을 하나 더 얹으니 박동기가 둘 필요해졌다. 하나만 내주는 방식(`SingleTickerProviderStateMixin`)으로는 부족해서, 여러 개를 내줄 수 있는 방식(`TickerProviderStateMixin`)으로 바꿨다.

### 하트 카운트다운은 1초 타이머로 갱신하고 dispose에서 정리

하트 개수 옆에 다음 충전까지 남은 시간을 `MM:SS`로, 꽉 차면 `FULL`로 보여준다. 값 자체는 `msToNextHeart()`가 주지만, 화면이 매초 다시 그려져야 초가 준다. `Timer.periodic(1s)`로 setState하고, 반드시 dispose에서 cancel한다(안 하면 위젯이 사라진 뒤에도 타이머가 남는다).

```dart
_heartTimer ??= Timer.periodic(const Duration(seconds: 1), (_) {
  if (mounted) setState(() {});
});
// dispose: _heartTimer?.cancel();
```

### Stack의 기본 정렬은 가운데가 아니라 좌상단이다

우상단 X를 얹으려고 카드 내용을 `Stack`으로 감쌌더니 제목·버튼이 왼쪽에 붙었다. `Stack`은 위치 지정 안 한 자식을 `alignment`(기본 `topStart`)에 놓는다. 카드 폭이 화면따라 늘던 때는 안 보였는데 폭을 고정하자 드러났다. `alignment: Alignment.topCenter`로 해결.

### 버튼 폭을 카드 폭에 맞추기 — expand 플래그

승리 팝업의 광고 버튼과 다음 레벨 버튼 폭을 맞추려고, 공용 버튼에 `expand`를 더했다. 켜면 내부 Row가 `MainAxisSize.max`가 돼 부모(카드) 폭을 꽉 채운다. 기본은 false라 다른 호출부는 그대로다.

```dart
Row(mainAxisSize: widget.expand ? MainAxisSize.max : MainAxisSize.min, ...)
```

---

## 목록

### 지연 렌더 목록에서 특정 항목을 가운데로 — 먼저 만들게 한 뒤 맞춘다

목록은 화면에 보이는 것만 그때그때 그린다(`ListView.builder`). 현재 도전 노드가 아래쪽이면 첫 프레임엔 아직 안 만들어져서, `ensureVisible`이 대상 위젯을 못 찾고 빈손으로 끝난다. 그래서 먼저 목록 끝으로 점프해 그 노드를 만들게 한 뒤, 다음 프레임에 가운데로 맞춘다.

```dart
WidgetsBinding.instance.addPostFrameCallback((_) {
  _scroll.jumpTo(_scroll.position.maxScrollExtent); // 끝으로 → 현재 노드 빌드됨
  WidgetsBinding.instance.addPostFrameCallback((_) {
    final ctx = _currentKey.currentContext;
    if (ctx != null) Scrollable.ensureVisible(ctx, alignment: 0.5); // 가운데
  });
});
```

### 재플레이 금지는 탭 조건 한 줄

지나간 레벨을 못 누르게 하는 건 노드의 탭 콜백 조건을 좁히는 것뿐이다.

```dart
onTap: i == current ? () => _open(i) : null, // 이전엔 i <= current
```

---

## 테스트

### 콜백이 null인지로 "못 누른다"를 검증한다

재플레이 금지를 위젯 테스트로 확인할 때, 탭해서 "아무 일 안 일어남"을 보긴 어렵다. 대신 과거 노드의 `GestureDetector.onTap`이 null인지 직접 단언했다.

```dart
final gd = find.ancestor(of: clearedThumb, matching: find.byType(GestureDetector)).first;
expect(tester.widget<GestureDetector>(gd).onTap, isNull);
```

### Switch는 Material 조상이 필요하다

설정 화면을 테스트에서 `MaterialApp(home: SettingsScreen)`로 띄웠더니 `Switch`가 "No Material widget found"로 터졌다. 실제 앱에선 셸의 Scaffold가 Material을 주지만 테스트엔 없었다. `Scaffold`로 감싸 해결.

### 하루 상한은 순수 단위 테스트로

광고 코인 상한은 UI 없이 메타만으로 확인했다. cap만큼 지급한 뒤 4번째는 코인이 안 늘어야 한다.

```dart
for (var i = 0; i < cap; i++) await meta.grantAdCoins();
expect(meta.canWatchAdForCoins(), isFalse);
final before = meta.coins; await meta.grantAdCoins();
expect(meta.coins, before); // 상한 초과 — 무시
```

---

## 파이프라인 — 흰색 계열 도안 색 보정

초밥 도안에서 밥·윤기가 회색이고 배경이 거의 흰색이라 어색했다. 원인은 양자화(사진의 수많은 색을 몇 개의 대표색으로 줄이는 작업)가 배경을 주조색(초밥은 연어색)의 옅은 틴트로 만들어 흰색에 가깝게 잡고, 밥은 원래 회색 계열이라 그대로 남기는 것이었다.

해결은 "흰색이 도안의 실제 요소인가"를 판정하는 분기다. 주조색이 흰색에 가깝거나 흰색 계열 전경의 면적 비중이 일정 이상이면, 그 전경을 흰색으로 끌어올리고 배경을 채도 있는 보조색 파스텔로 잡는다. 작은 하이라이트만 있으면 기존 동작을 유지해 다른 도안은 안 건드린다.

```python
def _is_near_white(c):  # HLS: 밝고 채도 낮으면 흰색 계열
    _, lum, sat = colorsys.rgb_to_hls(*(v/255 for v in c))
    return lum > 0.70 and sat < 0.35

if _is_near_white(dom) or near_white_frac >= 0.20:
    for ci in near_white_keep:              # 밥·몸통을 오프화이트로
        reps[ci] = tuple(min(255, int(v + (250-v)*0.82)) for v in reps[ci])
    base = reps[max(colored, key=lambda ci: _sat_lum(reps[ci])[0])]
    bg = tuple(min(255, int(c + (250-c)*0.55)) for c in base)  # 채도 있는 파스텔
```

생성이 결정적이라(레벨마다 고정 시드) 재생성해도 그림 모양·난이도는 그대로고 팔레트 색만 바뀐다 — 200레벨 중 흰색 계열 35개만 바뀌고 봇 클리어·규칙엔 영향이 없음을 확인했다.

---

## 요약

- 광고는 자리를 UI로 먼저 만들어 두면 연결이 콜백 하나로 끝난다. 보상은 완주 콜백 안에서만
- 개발 중엔 테스트 광고, 실제 ID는 릴리스에서만 — 개발 중 실클릭은 계정 정지
- 하루 N회 제한은 로컬 자정 경계로 당일 기록을 세면 서버 없이 된다
- 화면 복귀를 감지하려면 await가 아니라 `RouteAware.didPopNext` — pushReplacement가 await를 조기 완료시키기 때문
- 두 위젯 사이로 뭔가 날리려면 GlobalKey+RenderBox로 좌표를 구해 공통 조상 기준으로 변환한다
- 지연 렌더 목록은 원하는 항목을 먼저 만들게 한 뒤 위치를 잡는다
- 콘텐츠에 스킨을 입힐 땐 무엇이 정보를 지고 있는지(여기선 흰색이 그림의 요소인지)부터 판정한다
