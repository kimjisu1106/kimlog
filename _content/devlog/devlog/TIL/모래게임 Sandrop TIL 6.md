---
layout: post
title: 모래게임 Sandrop TIL 6
date: 2026-07-13
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: UI와 콘텐츠의 팔레트를 분리하는 채도 보정, 오프라인 전제의 폰트 번들·서브셋, 200레벨 지연 로드와 현재 노드 중앙 정렬, 하트·코인 역할을 가른 델타 원장 경제와 상태 재생성형 다시하기, 자리를 예약한 지연 등장 버튼과 Stack 기본 정렬 함정, 위젯 테스트의 에셋 I/O를 걷어내는 저장소 주입까지.
tags:
  - Dart
  - Flutter
  - Python
---
## 리스킨 — 스킨과 콘텐츠는 팔레트를 나눠 써야 한다

### 색 스냅은 UI엔 약이고 그림엔 독이다

디자인 제안은 화면 전체를 캔디 7색 팔레트로 스냅하라는 것이었다. UI(버튼·배지·아이콘)는 색 수가 적을수록 또렷해지니 맞는 처방이다. 그런데 도안(맞춰야 할 그림)까지 그 7색으로 밀면 색이 뭉개진다. 실제로 샘플을 뽑아 보니 뱀이 오리처럼 보이고 촛불은 흰 덩어리가 됐다. 도안은 스킨이 아니라 이 게임의 콘텐츠라서 훼손하면 게임 자체가 망가진다.

그래서 팔레트를 둘로 나눴다. UI는 캔디 토큰을 쓰고, 도안은 레벨 JSON의 전용 팔레트를 그대로 쓰되 렌더 직전에 채도만 올려 화면 톤에 섞이게 한다. 색상(hue)은 건드리지 않는다 — 식별성은 hue가 지고 있고, 캔디한 느낌은 채도가 만든다.

```dart
static Color candyBoost(Color c) {
  final hsl = HSLColor.fromColor(c);
  return hsl
      .withSaturation((hsl.saturation * 1.45).clamp(0.0, 1.0))
      .withLightness((hsl.lightness * 1.06).clamp(0.0, 1.0))
      .toColor();
}

/// 레벨 JSON의 ARGB 팔레트 → 렌더용 보정 팔레트. 화면 진입 시 1회만.
static List<Color> candyPalette(List<int> argb) => [
  for (final v in argb) candyBoost(Color(v)),
];
```

> 배운 것: "디자인 토큰"을 앱 전체에 통일하는 건 UI 얘기지 콘텐츠 얘기가 아니다. 콘텐츠에 스킨을 적용할 땐 무엇이 정보를 지고 있는지(여기선 hue) 먼저 찾고 그것만 보존한다.

---

### 오프라인이 전제면 폰트는 다운로드가 아니라 번들이다

`google_fonts`는 첫 실행에 폰트를 내려받는다. 이 게임은 지하철에서도 켜져야 하므로 쓸 수 없다. 폰트 파일을 앱에 넣고 `pubspec.yaml`에 선언한다.

문제는 한글이다. Gothic A1은 웨이트당 2.2MB — 웨이트 3개면 6MB가 넘는다. 실제로 UI에 쓰는 글자는 몇백 자뿐이므로 `fonttools`로 필요한 글자만 남긴다.

```python
from fontTools import subset

subset.main([
    src, f"--output-file={dst}",
    f"--text={USED_TEXT}",       # 앱 UI에 등장하는 문자 전부
    "--layout-features=*",
    "--flavor=woff2" if web else "--no-hinting",
])
```

웨이트당 2.2MB → 134KB. 대신 제약이 하나 생긴다 — UI에 새 한글 문구를 추가하면 서브셋을 다시 떠야 한다. 안 그러면 그 글자만 두부(□)로 나온다. 이건 코드가 막아줄 수 없어서 프로젝트 문서에 경고로 박아 뒀다.

---

### 아이콘 3종 때문에 SVG 라이브러리를 들이지 않는다

아이템 아이콘(되돌리기·매그넷·셔플)을 위해 `flutter_svg`를 넣을 뻔했다. 도형 3개를 그리자고 의존성·파서·에셋 파이프라인을 늘리는 건 손해다. `CustomPainter`로 직접 그렸다 — 원호, 삼각형, 두 선. 코드는 몇십 줄이고 색·크기·비활성(muted) 처리를 파라미터로 받으니 오히려 유연하다.

하트·코인 심볼도 같은 방식으로 그려서, 이모지(❤️/🪙)에 의존하지 않게 됐다. 이모지는 OS마다 모양이 달라 브랜드 톤이 흔들린다.

---

### 팝업은 버튼 슬롯을 늘려 두면 규칙이 바뀌어도 버틴다

게임오버 모달이 처음엔 버튼 2개(이어하기·나가기)였는데, 경제 규칙이 바뀌며 3개(이어하기·다시하기·나가기)가 됐다. 공용 오버레이 위젯에 주 액션 / 보조 액션 / 나가기 슬롯을 두고, 각 슬롯이 아이콘·부제·색·비활성 사유까지 받게 하니 규칙 변경이 위젯 구조를 건드리지 않고 끝났다.

특히 비활성 사유(`buttonDisabledNote: '광고 준비 중'`)를 슬롯이 직접 받게 한 게 유용했다. "버튼은 있는데 왜 안 눌리지"를 화면이 스스로 설명한다.

---

## 레벨 선택 — 200개를 다루는 법

### 목록은 보이는 것만 읽는다 — 화면에 안 보이는 것까지 미리 안 불러오기

레벨 200개를 화면 진입 시 전부 JSON 디코드하면 진입이 눈에 띄게 느려진다. 저장소가 인덱스 단위로 로드하고 캐시하게 바꾸고, 목록은 `ListView.builder`로 보이는 항목만 만든다. 이미 읽은 것은 동기 조회(`cached`)로 꺼내 `FutureBuilder` 깜빡임을 없앤다.

```dart
LevelBundle? cached(int index) => _cache[index]; // 동기 — 깜빡임 방지

Future<LevelBundle> load(int index) async {
  final hit = _cache[index];
  if (hit != null) return hit;
  final files = await _levelFiles();
  final json = jsonDecode(
    await rootBundle.loadString('assets/levels/${files[index]}'),
  ) as Map<String, dynamic>;
  return _cache[index] = levelFromJson(json);
}
```

### 현재 노드는 스크롤 끝이 아니라 화면 가운데로

여정형 목록은 "지금 도전할 레벨"이 처음부터 보여야 한다. `jumpTo(maxScrollExtent)`로 끝까지 내리면 현재 노드가 화면 위쪽으로 밀려나거나 아래 여백이 부족해 어긋난다. 현재 노드에 이름표(`GlobalKey`, 특정 위젯을 나중에 다시 찾기 위한 표식)를 달고 `Scrollable.ensureVisible`(그 위젯이 화면에 보이도록 스크롤을 알아서 계산해 주는 함수)에 `alignment: 0.5`를 주면 그 위젯이 화면 한가운데 오도록 스크롤이 맞춰진다.

```dart
WidgetsBinding.instance.addPostFrameCallback((_) {
  final ctx = _currentKey.currentContext;
  if (ctx == null) return;
  Scrollable.ensureVisible(ctx, alignment: 0.5); // 0=위, 0.5=중앙, 1=아래
});
```

화면이 처음 그려지는 순간엔 그 노드가 아직 만들어지지 않아 위치를 곧바로 맞출 수 없다. 그래서 `addPostFrameCallback`으로 첫 프레임이 그려진 직후, 한 박자 뒤에 위치를 맞춘다.

### 난이도 라벨은 nullable로 — "안 붙이는 것"도 설계다

티어는 다섯 단계(튜토리얼·쉬움·보통·어려움·매우 어려움)인데, 화면에는 어려움·매우 어려움만 붙인다. 평범한 레벨에까지 라벨을 달면 경고의 무게가 사라진다. 이걸 UI의 if 문으로 처리하지 않고 변환 함수 자체가 `null`을 반환하게 했다 — 호출부는 "라벨이 있으면 그린다"만 알면 된다.

```dart
({String label, Color color})? tierInfo(String tier) => switch (tier) {
  'hard' => (label: '어려움', color: AppColors.danger),
  'veryhard' => (label: '매우 어려움', color: AppColors.candyPurple),
  _ => null, // 나머지는 표기하지 않는다
};
```

### 스포일러 정책은 렌더 단계에서 잠근다

앞으로 할 레벨은 도안도 난이도도 숨긴다. 썸네일 위젯이 `hidden` 플래그를 받으면 도안 대신 물음표를 그리고, 난이도 자리는 `???`가 된다. 클리어 여부는 메타(원장)가 알고 있으므로 목록은 그걸 보고 플래그만 넘긴다. 숨김을 데이터가 아니라 렌더에서 처리하니, 클리어 직후 되돌아왔을 때 자동으로 공개된다.

---

### 진입 프리뷰는 스킵 가능해야 마찰이 안 된다

레벨에 들어가기 전 1.6초 동안 완성할 그림을 크게 보여준다. 순수 연출이라 조금이라도 답답하면 독이 되므로, 화면 아무 곳이나 탭하면 즉시 넘어간다. 진행바 컨트롤러가 끝나서 자동으로 시작하는 경로와 탭으로 시작하는 경로가 겹칠 수 있으니 한 번만 실행되게 막는다.

```dart
void _start() {
  if (_started || !mounted) return; // 자동 완료 + 탭이 겹쳐도 한 번만
  _started = true;
  widget.onStart(context);
}
```

애니메이션 컨트롤러는 두 개다 — 진행바(1회) + 그림이 위아래로 떠다니는 모션(`repeat(reverse: true)`).

---

## 경제 — 두 재화의 역할을 가르기

### 재화는 잔액이 아니라 사건으로 저장한다 (append-only 델타 원장)

코인·하트를 "현재값"으로 저장하면 갱신이 겹칠 때 값이 깨지고 이력이 사라진다. 통장을 떠올리면 쉽다 — 잔액 숫자를 덮어쓰는 게 아니라 `+50`, `-1` 같은 입출금 내역(델타)을 시간순으로 쌓아 두고, 그 내역을 전부 더한 값을 잔액으로 읽는다(이 내역 장부가 델타 원장이다). 소비는 항상 잔액 확인 → 델타 추가 순서다.

```dart
Future<bool> spendCoins(int n) async {
  if (coins < n) return false;
  await _append(Delta(_now(), 'coins', -n));
  return true;
}

/// 하트가 0일 때 코인으로 사는 번들 (5개 900코인)
Future<bool> buyHeartBundle() async {
  if (!await spendCoins(GameConfig.costHeartBundle)) return false;
  for (var i = 0; i < GameConfig.heartBundleSize; i++) {
    await addHeart(); // 최대치 초과분은 addHeart가 알아서 버린다
  }
  return true;
}
```

번들 구매를 "하트 +5"가 아니라 "addHeart 5회"로 쓴 게 포인트다. 최대치(5) 상한 규칙이 `addHeart` 한 곳에만 있으면 되고, 호출부는 상한을 몰라도 된다.

### 두 재화가 같은 일을 하면 UI가 헷갈린다

처음 규칙(v2)은 하트가 입장료이자 이어하기 값이었다. 그러니 게임오버 화면에서 하트가 두 번 등장하고, 플레이어는 "이 하트는 뭘 사는 하트지"를 매번 다시 생각해야 했다. 최종 규칙(v3)은 역할을 갈랐다.

- 코인 = 진행을 산다 → 이어하기(부어 놓은 모래를 지키고 재개), 900코인
- 하트 = 새 판에 들어간다 → 레벨 진입(승리하면 환급), 다시하기(처음부터), 1개

한 재화 = 한 의미가 되니 모달이 저절로 정리됐다. 주 버튼은 코인, 보조 버튼은 하트, 하트가 없으면 그 자리가 "하트 5개 구입(코인)"으로 바뀐다.

### 이어하기와 다시하기는 완전히 다른 연산이다

같은 "게임오버 극복"이지만 상태를 다루는 방식이 정반대다.

이어하기는 진행을 유지한다. 벨트만 비워 다시 놓을 자리를 만들 뿐, 캔버스에 부은 모래는 그대로 둔다. 여기서 조심할 것은 이동 중(엘리베이터를 타는 중)인 바스켓이다. "벨트를 비운다"를 이동 중까지 싹 지우는 것으로 구현하면 그 모래가 증발한다.

다시하기는 처음부터다. 엔진 상태를 새로 만들되, 화면의 연출 상태를 같이 초기화하지 않으면 이전 판의 걷던 바스켓·잔상·기울기가 새 판에 남아 유령처럼 떠다닌다.

```dart
Future<void> _useRetry() async {
  if (!await widget.meta.spendHeart()) return;
  setState(() {
    _state = GameState.start(_bundle.level);
    // 연출 상태도 전부 초기화 — 이전 판의 잔상이 새 판에 섞이면 안 된다.
    _walkers.clear();
    _risers.clear();
    _vanish.clear();
    _trails.clear();
    _fillBorn.clear();
    _tipFrac.clear();
    _exitDeadlock();
  });
}
```

> 규칙이 바뀔 때마다 확인하게 된 것: 엔진 상태만 리셋하면 절반만 리셋한 것이다. 렌더가 들고 있는 파생 상태(진행 중 애니메이션) 목록을 한곳에 모아 두면 이런 실수가 준다.

### 수치는 코드에 흩지 않고 한 파일에 모은다

이어하기 900, 하트 번들 900, 아이템 150/350/500 같은 값이 화면 곳곳에 박히면 밸런싱이 불가능해진다. `GameConfig` 한 곳에 상수로 두고 UI·메타·테스트가 전부 그걸 참조한다. 결제 상품 id도 같이 둔다 — 나중에 스토어 콘솔에 등록할 때 이 파일만 보면 된다.

```dart
static const int costContinue = 900;    // 이어하기 (진행 유지)
static const int heartCostPerRetry = 1; // 다시하기 (처음부터)
static const int heartBundleSize = 5;
static const int costHeartBundle = 900;

static const String iapNoAds = 'no_ads';
static const String iapStarterBundle = 'starter_bundle';
```

테스트가 `900` 대신 `GameConfig.costContinue`를 단언하니, 값을 바꿔도 테스트가 따라온다.

### 상점은 결제 없이도 절반은 출시할 수 있다

상점 화면에 스타터 번들·NO ADS·코인팩·아이템을 다 그렸지만, 결제 SDK는 아직 붙이지 않았다. IAP 카드는 가격만 보여 주고 "준비 중"으로 비활성, 아이템의 코인 구매만 실제로 동작한다. 이렇게 나눠 두니 지금 당장 상점의 정보 구조·동선·문구를 검증할 수 있고, 나중에 결제만 끼워 넣으면 된다.

---

## 팝업 — 순서와 크기가 곧 UX다

### 버튼을 늦게 띄우되 자리는 처음부터 잡아 둔다

승리 팝업에서 "광고 보고 코인 2배"를 먼저 읽히게 하고 싶었다. 다음 레벨 버튼이 같이 뜨면 그걸 바로 눌러 넘어가기 때문이다. 그래서 다음 레벨은 1초 뒤에 등장시킨다.

여기서 조심할 게 하나 있다. 버튼을 나중에 트리에 추가하면 그 순간 레이아웃이 밀려 올라간다 — 마침 그 자리를 누르려던 손가락이 엉뚱한 버튼을 누른다. 그래서 위젯은 처음부터 두고 투명도만 0에서 1로 바꾸고, 보이지 않는 동안은 탭이 통과하도록 막는다.

```dart
AnimatedOpacity(
  opacity: _extraShown ? 1 : 0,
  duration: const Duration(milliseconds: 220),
  child: IgnorePointer(
    ignoring: !_extraShown, // 안 보이는 버튼이 눌리면 안 된다
    child: CandyButton(label: '다음 레벨 ▸', onTap: widget.onExtra),
  ),
)
```

투명도가 0이어도 위젯은 트리에 있으니 탭 히트 테스트는 여전히 통과한다. `IgnorePointer`가 없으면 "안 보이는데 눌리는" 버튼이 된다.

### Stack의 기본 정렬은 가운데가 아니라 좌상단이다

팝업 우상단에 X를 붙이려고 카드 내용을 `Stack`으로 감쌌더니 제목·썸네일·버튼이 전부 왼쪽으로 붙었다. `Stack`은 위치를 지정하지 않은 자식을 `alignment`(기본 `topStart`)에 맞춰 놓는다. 카드 폭이 화면에 따라 늘어나던 때는 자식이 폭을 다 써서 티가 안 났는데, 폭을 고정하자 드러났다.

```dart
Stack(
  alignment: Alignment.topCenter, // 기본값(topStart)이면 내용이 왼쪽에 붙는다
  children: [ Column(...), Positioned(top: -8, right: -8, child: 닫기X) ],
)
```

### "1.5배"는 화면 폭을 넘을 수 있으니 상한과 함께 쓴다

카드를 지금의 1.5배로 키워 달라는 요구를 그대로 곱하면 폰에서는 화면 밖으로 나간다. 곱한 값과 "화면에서 최소 여백만 남긴 값" 중 작은 쪽을 쓴다.

```dart
final w = MediaQuery.of(context).size.width;
final cardWidth = math.min((w - 68) * 1.5, w - 24); // 여백 12px에서 멈춘다
```

### 버튼 크기는 스타일이 아니라 배율 파라미터로 연다

여정 화면의 PLAY만 크게 하고 싶었다. 공용 버튼에 큰 버전을 따로 만들면 색·눌림 연출이 두 벌이 된다. 대신 `scale` 하나를 받아 여백·글자·모서리에 곱한다. 기본값 1.0이라 다른 호출부는 그대로다.

```dart
CandyButton(label: 'PLAY', onTap: onTap, scale: 1.35);
// padding: EdgeInsets.symmetric(horizontal: 22 * scale, vertical: 12 * scale)
// fontSize: 14 * scale, borderRadius: 14 * scale
```

---

## 테스트

### 위젯 테스트에서 에셋 I/O는 걷어낸다

레벨 선택 화면 테스트가 끝나지 않고 멈췄다. 원인은 `rootBundle`로 레벨 JSON을 읽는 것 — `testWidgets`의 가짜 시계에서는 이 비동기 파일 읽기가 안정적으로 완료되지 않는다(두 번째 테스트에서 행이 걸렸다).

해결은 화면이 저장소를 직접 만들지 않고 바깥에서 건네받게(주입) 하는 것이다. 그러면 테스트에서는 진짜 파일 대신 메모리 안에서 레벨을 만들어 주는 가짜 저장소를 끼워 넣을 수 있다. 테스트가 진짜 파일을 읽으려다 멈추던 원인이 사라지니 결과가 매번 일정해지고, 200개를 진짜로 읽지 않으니 빨라진다.

```dart
class _FakeRepo implements LevelRepository {
  @override Future<int> count() async => n;
  @override LevelBundle? cached(int i) => _cache[i];
  @override Future<LevelBundle> load(int i) async => _cache[i] ??= _make(i);
}

// 화면은 저장소를 주입받는다 — 프로덕션은 진짜, 테스트는 가짜
LevelSelectScreen(meta: meta, repo: _FakeRepo(200));
```

> 테스트가 "느리다"가 아니라 "안 끝난다"면 대개 시간이 아니라 I/O 문제다.

### 분기가 있는 화면은 상태를 만들어 놓고 단언한다

게임오버 모달은 코인·하트 보유 상태에 따라 버튼이 달라진다. 그래서 테스트마다 원장을 원하는 상태로 만들어 놓고 들어간다 — 코인 900을 넣으면 "이어하기"가 뜨고, 하트를 다 쓰면 "하트 5개 구입"이 뜬다. 상점도 같은 식으로 코인 부족/충분 두 갈래를 확인한다.

```dart
await meta.addCoins(GameConfig.costContinue);
// ... 데드락 유발 ...
await tester.tap(find.text('이어하기'));
expect(meta.coins, 0);
expect(meta.hearts, GameConfig.maxHearts - 1); // 하트는 건드리지 않는다
```

단언에 "무엇이 변했는가"뿐 아니라 "무엇이 변하지 않았는가"를 같이 넣는 게 중요했다. 이어하기가 실수로 하트까지 깎는 회귀는 후자로만 잡힌다.

### 지연 등장은 "그 프레임에서 멈춰서" 확인한다

"다음 레벨 버튼이 1초 뒤에 나온다"를 검증하려면 팝업이 뜬 직후에 멈춰야 한다. 넉넉하게 4초를 흘려 보내면 이미 다 나타난 뒤라 아무것도 확인할 수 없다. 조건이 만족될 때까지만 프레임을 굴린 뒤, 투명도를 직접 읽는다.

```dart
for (var i = 0; i < 40 && find.text('완성!').evaluate().isEmpty; i++) {
  await tester.pump(const Duration(milliseconds: 100));
}
double nextOpacity() => tester
    .widget<AnimatedOpacity>(find.ancestor(
      of: find.text('목록'), matching: find.byType(AnimatedOpacity)))
    .opacity;

expect(nextOpacity(), 0);                                  // 아직 안 보임
await tester.pump(const Duration(milliseconds: 1100));
await tester.pump(const Duration(milliseconds: 300));      // 페이드 완료
expect(nextOpacity(), 1);
```

버튼이 트리에 없는 게 아니라 투명한 것이므로 `findsNothing`으로는 못 잡는다. 무엇으로 구현했는지가 무엇을 단언할 수 있는지를 정한다.

---

## HUD — 엔진이 아는 것을 화면으로 끌어올리기

플레이어가 "지금 뭘 부을 수 있는지"를 눈으로 알 수 없었다. 엔진은 이미 알고 있다 — 캔버스의 다음 목표 칸과 색이 정해져 있으니 부을 수 있는 색도 결정된다. 그 계산 결과를 HUD의 색 점으로 노출하고, 상단에 완성 목표 도안 썸네일을 함께 뒀다.

새 기능을 만든 게 아니라 이미 있는 정보를 보여준 것뿐인데 게임이 훨씬 읽혔다. 규칙을 화면이 숨기고 있으면 플레이어는 그것을 "운"으로 느낀다.

---

## 요약

- 스킨은 UI에만 강제하고 콘텐츠(도안)는 정보를 지고 있는 축(hue)을 보존한다 — 채도만 올린다
- 오프라인 전제면 폰트는 번들 + 서브셋. 대신 "새 문구 = 서브셋 재생성" 제약을 문서로 못 박는다
- 긴 목록은 보이는 것만 읽고, 현재 위치는 `ensureVisible(alignment: 0.5)`로 가운데에
- 재화는 잔액이 아니라 델타로 쌓고, 한 재화에 한 의미만 준다 — 그래야 화면이 저절로 정리된다
- 상태를 되돌리는 기능은 엔진과 연출을 같이 되돌려야 절반짜리가 아니다
- 테스트가 안 끝나면 시간이 아니라 I/O를 의심하고, 주입으로 걷어낸다
- 늦게 등장하는 버튼은 자리를 미리 잡아 두고 투명도만 바꾼다 — 레이아웃이 밀리면 오조작이 난다
- Stack의 기본 정렬은 좌상단이다. 폭을 고정하는 순간 드러난다
