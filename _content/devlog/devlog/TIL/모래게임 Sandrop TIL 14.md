---
layout: post
title: 모래게임 Sandrop TIL 14
date: 2026-07-25
permalink: "devlog/devlog/TIL/모래게임 Sandrop TIL 14"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 모달의 스크림과 카드를 분리해 애니메이션하고, 컬러 이모지는 틴트가 안 되며, 몰입 모드는 앱 단위여야 하고, 폰트 크기도 토큰이 된다 — UI를 다듬으며 만난 Flutter·Dart 포인트들.
tags:
  - Dart
  - Flutter
  - Python
---
## Flutter 모달

### 스크림과 카드는 분리해서 애니메이션한다

모달을 "커지며 뜨고 작아지며 사라지게" 하려고 모달 전체를 scale했더니, 뒤의 어두운 배경(스크림)까지 같이 커졌다. 배경이 가운데서 뿜어져 나오는 이상한 그림이 된다.

스크림과 카드는 역할이 다르다 — 스크림은 페이드로 깔리고 사라지며, scale은 카드만 받아야 한다.

```dart
Stack(children: [
  AnimatedOpacity(opacity: shown ? 1 : 0, ...   // 스크림 — 페이드
    child: ColoredBox(color: scrim)),
  AnimatedSwitcher(                              // 카드 — scale in/out
    transitionBuilder: (child, anim) =>
      ScaleTransition(scale: anim, child: FadeTransition(opacity: anim, child: child)),
    child: currentCard),
])
```

그래서 카드 위젯(`_Overlay`)에서 스크림을 아예 걷어내고 카드만 반환하게 바꿨다. 스크림·scale은 부모가 진다.

---

### AnimatedSwitcher 하나로 등장·퇴장·전환을 다 처리한다

모달이 여러 종류(승리·게임오버·메뉴·아이템)에 게임오버는 단계까지 있다. 각각 조건부로 렌더하면 등장 애니메이션은 되지만 퇴장과 A→B 전환이 안 된다.

`AnimatedSwitcher`에 "지금 떠 있어야 할 카드 하나"를 종류·단계별 `key`로 넘기면, key가 바뀔 때 옛 카드를 내보내고(reverse) 새 카드를 들인다. 등장·퇴장 커브를 따로 준다.

```dart
AnimatedSwitcher(
  switchInCurve: Curves.easeOutBack,   // 통통 튀며 등장
  switchOutCurve: Curves.easeIn,       // 매끄럽게 퇴장
  child: activeModal ?? const SizedBox.shrink(),  // null이면 옛 카드가 축소 퇴장
)
```

게임오버 이어하기→다시도전도 key만 바뀌어 카드만 교체되고 스크림은 그대로 유지된다. 퇴장 중인 카드는 `IgnorePointer`로 탭을 막아 이중 실행을 방지한다.

---

## Flutter 시스템 UI·연출

### 몰입 모드는 화면이 아니라 앱 단위로 건다

시스템 하단 네비바를 숨기려 게임 화면 진입 때 켜고 나갈 때 껐더니, 다음 레벨에서 바가 다시 살아났다.

레벨 전환이 `pushReplacement`라 순서가 이렇다 — 새 화면 `initState`(몰입 ON) → 그다음 옛 화면 `dispose`(몰입 OFF)가 더 늦게 돈다. 그래서 새 화면이 켠 몰입을 옛 화면이 꺼버린다.

```dart
// ❌ 화면 단위 — pushReplacement에서 옛 dispose가 새 init보다 늦어 되살아남
// ✅ 앱 전역 1회
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  ...
}
```

셸의 자체 탭바는 Flutter 위젯이라 시스템 바를 숨겨도 그대로 보인다.

---

### 아이콘 흰 테두리는 그림자가 아니라 8방향 복제로

색 아이콘을 배경 위에서 또렷하게 하려고 흰 테두리를 원했다. `shadow`는 흐릿하고, 흰 아이콘을 크게 뒤에 깔면 테두리가 울퉁불퉁·두껍다.

또렷한 윤곽은 같은 아이콘을 흰색으로 8방향에 살짝씩 밀어 겹친 뒤 그 위에 색 아이콘을 얹는 것이다(텍스트 스트로크와 같은 원리).

```dart
final r = size * 0.06; // 테두리 두께
Stack(alignment: Alignment.center, children: [
  for (final d in [Offset(-1,0), Offset(1,0), Offset(0,-1), Offset(0,1),
                   Offset(-.7,-.7), Offset(.7,-.7), Offset(-.7,.7), Offset(.7,.7)])
    Transform.translate(offset: d * r, child: Icon(icon, color: Colors.white)),
  Icon(icon, color: color),
]);
```

---

### 컬러 이모지는 색을 입힐 수 없다

열쇠·자물쇠를 🔒🗝️ 이모지로 바꿀 수 있나 검토했다. 그런데 안드로이드의 컬러 이모지는 비트맵 글리프라 `color`나 `BlendMode`로 틴트가 안 된다 — `Text('🔒', color: red)` 해도 그대로 금색이다.

이 게임은 열쇠·자물쇠를 토큰 색으로 칠해 쌍을 매칭하므로, 색을 못 입히면 기능이 깨진다. 색 매칭이 필요하면 틴트 가능한 벡터(Material 아이콘)나 흰 실루엣 PNG여야 한다. 얼음처럼 색 매칭이 없는 건 컬러 asset을 그대로 써도 된다.

---

### 셀 크기 오버레이는 스프라이트 여백만큼 좁혀야 한다

바스켓을 칸보다 크게(1.14배) 그리자, 잠긴 바스켓의 어두운 막·얼음 막이 이웃 칸까지 삐져나왔다.

원인은 오버레이가 `Positioned.fill`로 바스켓 상자 전체를 덮는데, 양동이 스프라이트는 투명 여백이 있어 실제 그림은 상자보다 작다는 것. 그래서 오버레이가 보이는 양동이보다 크다.

```dart
// ❌ 상자 전체 — 스프라이트 투명 여백까지 덮어 칸을 넘는다
Positioned.fill(child: DecoratedBox(...))
// ✅ 양동이 몸통 크기로 좁혀서
Center(child: SizedBox.square(dimension: size * 0.86, child: DecoratedBox(...)))
```

---

## Flutter 디자인 시스템·레이아웃

### 폰트 크기도 토큰이다

색·간격은 토큰으로 묶으면서 폰트 크기는 각 위젯에 숫자로 흩뿌려 두고 있었다 — 세다 보니 9~24px에 16종이었다. 5단계 토큰으로 통일했다.

```dart
static const double fsXs = 11, fsSm = 13, fsBase = 15, fsLg = 19, fsXl = 24;
```

일괄 매핑은 스크립트(정규식)로 했는데, `CandyTheme.num(isCurrent ? 22 : 18)`처럼 삼항 안에 있는 값은 첫 글자가 숫자가 아니라 정규식에 안 걸려 잔재로 남았다. 이런 게 딱 크기가 안 맞아 보이던 곳이었다.

---

### num()과 기본 TextStyle은 서체가 다르다

레벨 번호가 화면마다 폰트가 다르게 보였다. 원인은 숫자 스타일 함수 `num()`은 디스플레이 서체(Baloo2)인데, 어떤 곳은 그냥 `TextStyle(...)`이라 기본 본문 서체(Gothic A1)로 렌더된 것.

```dart
Text('Lv $id', style: TextStyle(fontWeight: w700))   // ❌ 기본 = Gothic A1
Text('Lv $id', style: CandyTheme.num(fsBase))        // ✅ Baloo2
```

같은 정보(레벨 번호)는 어디서나 같은 서체여야 한다 — `num()`으로 통일했다.

---

### 화면 제목은 공용 헤더 위젯이 위치를 잡는다

홈·상점·설정 제목이 각자 다른 padding으로 위치가 어긋나 있었다. 화면마다 하드코딩하는 대신 공용 헤더 위젯이 위치를 잡게 했다.

```dart
class CandyScreenHeader extends StatelessWidget {
  static const kPad = EdgeInsets.fromLTRB(20, 12, 16, 8);
  Widget build(_) => Padding(padding: kPad, child: Row(children: [
    ?leading, title, const Spacer(), ?trailing,   // null-aware 요소로 있을 때만
  ]));
}
```

`?leading`은 Dart 3의 null-aware 컬렉션 요소 — null이면 리스트에서 빠진다. `if (x != null) x!`보다 깔끔하다.

---

## Dart 함정

### factory 생성자는 인스턴스 메서드를 못 쓴다

이웃 순회를 헬퍼로 묶어 여러 곳을 정리했는데, 그중 한 곳이 `factory` 생성자 안이라 인스턴스 메서드 `_neighbors`를 못 불렀다(factory는 인스턴스가 아직 없다). 그래서 헬퍼를 `static`으로 두고 `w, h`를 인자로 받게 했다.

```dart
static Iterable<(int, int)> _neighbors(int col, int row, int w, int h) sync* { ... }
```

---

### List.sort는 불안정 정렬이라 타이브레이크를 명시해야 한다

이 게임은 규칙 엔진을 Dart(앱)와 Python(레벨 검증 봇)에 미러링한다. 색 비율을 픽셀 수로 나눌 때 최대잉여(largest remainder)로 배분하는데, 소수부가 같은(동점) 바스켓의 처리가 두 언어에서 갈렸다.

Dart `List.sort`는 불안정(동점 순서 보장 안 함), Python `sorted`는 안정이다. 그래서 남는 픽셀 하나가 앱과 봇에서 다른 바스켓에 붙어, 봇이 검증한 판과 실제 화면이 미세하게 달라질 수 있었다.

```dart
// ❌ 동점이면 순서 미정 (불안정)
..sort((a, b) => rem[b].compareTo(rem[a]))
// ✅ 동점이면 인덱스 오름차순으로 고정 — Python(안정)과 일치
..sort((a, b) { final c = rem[b].compareTo(rem[a]); return c != 0 ? c : a.compareTo(b); })
```

"정렬은 그냥 정렬"이 아니라 안정성이 언어마다 다르다는 걸, 두 엔진을 맞추다 처음 체감했다.

---

## 요약

UI를 다듬는 하루였지만 걸린 건 대부분 "당연해 보이는 것"이었다. 모달을 통째로 키우면 배경까지 커지고, 이모지는 색이 안 입혀지고, 몰입 모드는 화면 단위로 걸면 다음 화면에서 풀리고, 정렬은 언어마다 안정성이 다르다. 눈에 보이는 증상 뒤에 항상 "그게 왜 그런가"가 하나씩 있었다.
