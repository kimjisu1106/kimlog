---
layout: post
title: 모래게임 Sandrop TIL 9
date: 2026-07-18
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 캔버스 가독성 3겹(가이드 선명화·표면 크러스트·다음 칸 펄스)과 스프라이트 착색 왜곡을 피하는 원색 원반, 이미지 실측으로 맞춘 타원 정렬, 링+면 이중 신호, kDebugMode 이중 게이트 디버그 토글까지.
tags:
  - Dart
  - Flutter
---
## 캔버스 3겹 — 색을 안 바꾸고 정보를 더한다

색 구분이 안 된다는 피드백의 뿌리는 "미채움 가이드가 흐려서 무슨 색을 부을지 안 보인다"였다. 팔레트는 이미 손봤으니, 이번엔 색을 더 건드리지 않고 캔버스 페인터에 세 겹의 신호를 더했다.

### 1. 가이드 선명화 — 혼합비를 상수로

미채움 픽셀은 원색을 크림색과 섞어 흐리게 깔린다. 그 혼합비가 0.80(원색 20%만 남김)이라 색이 죽어 있었다.

```dart
// 미채움 가이드 혼합비 — 원색을 이 비율만큼 남긴다(1이면 전부 원색). 낮으면 색이
// 죽어 hue 식별이 안 되고 높으면 채움과 구분이 안 된다. 튜닝 대상 — 기기에서 눈으로 조정.
static const double _guideMix = 0.5;
...
final guide = Color.lerp(full, AppColors.guideBlend, _guideMix)!;
```

0.80 → 0.5. 튜닝이 필요한 시각 수치라 매직넘버로 두지 않고 이름 있는 상수로 뺐다. 이후 모든 조정은 기기에서 이 숫자만 바꾼다.

### 2. 표면 크러스트 — 채운 데까지 스카이라인

이 게임의 캔버스는 열 단위로 아래부터 채워진다. 그래서 "여기까지 채웠어"는 수평선이 아니라 열마다 높이가 다른 스카이라인이다. 채워진 칸 중에서 위나 옆이 아직 빈 가장자리에만 얇은 어두운 선을 그어 채운 부분의 윤곽을 드러낸다.

```dart
// 표면 크러스트 — 채움 스카이라인을 따라가는 어두운 선(원색을 검정 쪽으로 누른 색).
static const double _crustThickness = 0.35; // 픽셀 높이 대비
static const double _crustDarken = 0.35; // 원색 → 검정 혼합비
...
if (state.filled[i]) {
  final crust = Color.lerp(full, Colors.black, _crustDarken)!;
  // 위가 미채움 → 상단 가로선 / 옆이 미채움 → 좌·우 세로선(단차 면)
  if (row == 0 || !state.filled[level.canvasIndex(col, row - 1)]) { /* 상단 rect */ }
  if (col > 0 && !state.filled[level.canvasIndex(col - 1, row)]) { /* 좌측 rect */ }
  if (col < level.width - 1 && !state.filled[level.canvasIndex(col + 1, row)]) { /* 우측 rect */ }
}
```

처음엔 상단 변에만 그었더니 계단의 세로 단차 면에 선이 없어 끊긴 점선처럼 보였다. 옆이 빈 노출면(좌·우)에도 같은 선을 그으니 계단 윤곽이 이어졌다. 별도 패스 없이 기존 픽셀 루프 안에서 rect 하나씩 더 그리면 된다.

### 3. 다음 받을 칸 펄스

지금 바로 모래가 앉을 칸(엔진의 도달 가능 정의와 같음: 미채움이며 맨 아랫줄이거나 아래가 채워짐)을 원색에 가깝게 은은히 깜빡인다. 그 칸들의 색 집합이 곧 "지금 부을 수 있는 색"이라, 힌트 점의 정보가 캔버스 위 정확한 위치에 나타난다.

```dart
final receivable = row == level.height - 1 ||
    state.filled[level.canvasIndex(col, row + 1)];
if (receivable) {
  final k = 0.6 + 0.4 * (0.5 + 0.5 * math.sin(now * _pulseSpeed));
  paint.color = Color.lerp(guide, full, k)!;
}
```

엔진을 호출하지 않고 페인터 로컬에서 `state.filled`와 행·열로 같은 정의를 재현했다. 게임 루프가 벨트 회전 때문에 매 프레임 repaint하므로 펄스는 별도 애니메이션 컨트롤러 없이 저절로 움직인다.

---

## 엎은 양동이 색을 모래색과 맞추기

### 스프라이트 착색은 색을 왜곡한다

못 꺼내는 양동이를 엎어 두는데, 엎은 통이 보드 모래색과 다른 색으로 보였다. 원인은 착색 방식이다.

```dart
// 밝은 크림톤 원본에 모래색을 곱해(modulate) 착색
Image.asset(asset, color: Color.lerp(tint, Colors.white, 0.22),
    colorBlendMode: BlendMode.modulate)
```

`modulate`는 원본 그림의 각 픽셀에 색을 곱해서 입히는 방식이라(원본 × 색), 크림톤 플라스틱 질감과 음영이 그대로 곱해져 순수한 원색이 나오지 않는다. 열린 양동이는 안에 순수 원색 원반(`ColoredBox`)이 보여 색이 정확한데, 엎으면 그 기준색이 사라진다.

해법은 엎은 통 뚜껑에도 같은 색 소스의 원반을 얹는 것이다.

```dart
// 엎은 통 바닥의 원색 원반 — modulate 착색 왜곡 없이 모래 원반과 동일한 색 소스로 색 일치.
ClipOval(child: ColoredBox(color: tint))  // 모래 원반과 똑같은 tint
```

### 위치는 이미지를 실측해서 맞춘다

원반을 타일 정중앙에 정원으로 놓으니 떠 보였다. 스프라이트 이미지를 직접 열어 보니 바닥면은 정중앙이 아니라 세로 27% 지점의 가로로 넓적한 타원이었다. Flutter는 세로 위치를 -1(맨 위)에서 1(맨 아래) 사이 숫자로 나타내는데, 위에서 27%면 -0.46쯤이다.

```dart
static const double _flipLidAlignY = -0.46; // 세로 27% ≈ 2×0.27−1
static const double _flipLidW = 0.48;
static const double _flipLidH = 0.26; // 폭≠높이 → ClipOval이 타원이 된다
...
Align(
  alignment: Alignment(0, _flipLidAlignY),
  child: FractionallySizedBox(
    widthFactor: _flipLidW, heightFactor: _flipLidH,
    child: ClipOval(child: ColoredBox(color: tint)),
  ),
)
```

"대충 가운데"가 아니라 에셋의 실제 형태를 재서 맞추니 원반이 뚜껑에 앉았다. 위치·크기 셋 다 상수라 기기에서 눈으로 미세 조정한다.

---

## 상태를 색이 아니라 밝기·방향으로

색 구분 피드백이 반복된 근본 이유는, 상태(못 꺼냄·비활성)를 색으로 표현하고 있었기 때문이다. 색이 정보를 지고 있는 화면에서 상태를 색으로 나타내면 상태를 얻는 대신 색 정보를 잃는다. 그래서 상태를 다른 축으로 옮겼다.

- 비활성 = 색을 어둡게 → 엎어놓기(방향)
- 내보낼 수 있음 = 링·글로우(선) + 바닥 면 밝히기(면)

특히 바닥은 링만으로는 약하다는 피드백이 있어, 지금 꺼낼 수 있는 칸은 바닥 면 자체를 흰색 쪽으로 밝혔다. 선(테두리)보다 면이 강한 신호다.

```dart
static const double _walkableFloorLift = 0.35; // 값이 클수록 밝다. 튜닝 대상.
...
final gradientColors = glow
    ? [ Color.lerp(AppColors.passageShadow, Colors.white, _walkableFloorLift)!,
        Color.lerp(AppColors.passage, Colors.white, _walkableFloorLift)! ]
    : const [AppColors.passageShadow, AppColors.passage];
```

---

## 디버그 토글 — 릴리스에서 원천 차단

지나간 레벨을 다시 플레이하는 디버그 기능은 출시 때 반드시 빠져야 한다. 잊어도 새어 나가지 않게 이중으로 막았다 — 출시 빌드에는 화면에서 아예 숨기고, 실제 실행 경로에서도 한 번 더 차단한다.

```dart
// 설정 섹션 자체를 디버그 빌드에만 렌더
if (kDebugMode) ...[ _Section(title: '디버그', child: _ToggleRow(
  label: '지나간 레벨 재플레이',
  // 함정: boolPref 기본 fallback이 true라 명시 안 하면 디버그가 켜진 채로 읽힌다
  value: widget.meta.boolPref('debug', fallback: false),
  ...)) ],

// 게이트도 kDebugMode를 AND — 릴리스에선 저장된 pref와 무관하게 항상 false
final debugReplay = kDebugMode && widget.meta.boolPref('debug', fallback: false);
final onTap = (i == current || (debugReplay && i < current)) ? () => _open(i) : null;
```

두 함정이 있었다. 하나는 `boolPref`의 기본 fallback이 `true`라, `fallback: false`를 명시하지 않으면 디버그가 켜진 채로 읽힌다. 다른 하나는 UI만 숨기고 게이트를 안 막으면 저장된 값이 릴리스에서 살아난다는 것. `kDebugMode`를 게이트에도 AND로 걸어 릴리스에선 코드 경로가 아예 죽게 했다.

위젯 테스트는 `kDebugMode`가 true라, 디버그 pref를 켜면 과거 노드의 `onTap`이 살아 있음을 단언할 수 있다 — 이 이중 게이트가 개발/릴리스에서 각각 의도대로 동작하는지 검증한다.

---

## 요약

- 색이 정보를 지고 있으면 상태를 색이 아니라 밝기·방향·모양으로 옮긴다
- 튜닝이 필요한 시각 수치는 전부 이름 있는 상수로 빼서 기기에서 숫자만 조정
- 에셋에 무언가를 맞출 땐 "대충 가운데"가 아니라 이미지를 실측해서 위치·형태를 잰다
- 스프라이트 `modulate` 착색은 원색을 왜곡한다 — 정확한 색이 필요하면 순수 색 소스를 따로 얹는다
- 디버그 기능은 `kDebugMode` 이중 게이트(UI 숨김 + 게이트 AND)로 릴리스에서 원천 차단
