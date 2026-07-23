---
layout: post
title: 습관만들기 Pawbit TIL 12
date: 2026-07-12
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 지도 화면에서 위젯과 그림의 좌표계를 통일하는 법, Align이 자식 크기를 빼고 계산하는 이유, Positioned만 있는 Stack이 쪼그라드는 함정, 점선 그리기와 걷기 애니메이션을 초보자용으로 정리.
tags:
  - Flutter
  - Dart
---
## 들어가기 전 — 좌표가 두 종류다

마을 지도 화면을 만들면서 계속 헷갈렸던 게 "위치를 어떻게 표현하느냐"였다. Flutter에선 크게 두 가지를 쓴다.

- 비율 좌표(`Alignment`) — 화면 가운데가 `(0, 0)`, 왼쪽 끝이 `-1`, 오른쪽 끝이 `+1`. 위가 `-1`, 아래가 `+1`. 화면 크기가 달라져도 "화면의 어디쯤"을 그대로 가리킬 수 있다.
- 픽셀 좌표 — 화면 왼쪽 위가 `(0, 0)`이고 오른쪽·아래로 갈수록 커지는 실제 숫자.

위젯을 놓을 땐 비율이 편하고, 선을 직접 그리는 `CustomPainter`는 픽셀만 안다. 그래서 둘을 잇는 변환이 필요하다. 이 글의 사고는 거의 다 여기서 출발한다.

---

## 좌표

### 왜 좌표계를 하나로 통일해야 하나

지도 위에 표지판(위젯), 강아지(위젯), 트랙(직접 그린 선)이 같이 있다. 각자 다른 방식으로 위치를 정하면 서로 안 맞는다. 그래서 비율 → 픽셀 변환 함수 하나를 만들고 모두가 그것만 쓰게 했다.

```dart
Offset toPx(Alignment a) =>
    Offset((a.x + 1) / 2 * width, (a.y + 1) / 2 * height);
```

`(a + 1) / 2`가 하는 일 — `Alignment`는 `-1 ~ 1`인데 픽셀로 바꾸려면 `0 ~ 1` 비율이 필요하다. 그래서 `-1 → 0`, `0 → 0.5`, `1 → 1`로 옮겨준다.

> 예) 화면 폭이 400이고 `a.x = 0.5`라면 → `(0.5 + 1) / 2 = 0.75` → `0.75 × 400 = 300px`.

---

### 함정 1 — Align은 toPx와 다른 자리에 놓는다

트랙은 `toPx`로 그렸는데 표지판은 `Align`으로 놓았더니 어긋났다. 특히 오른쪽 상점만 크게 벌어지고 숲속은 멀쩡해 보여서 한참 헤맸다.

원인은 `Align`의 계산 방식이다. `Align`은 "자식의 오른쪽 끝이 화면 오른쪽 끝에 닿게" 하는 식이라, 화면 폭에서 자식 폭을 뺀 공간 안에서 위치를 정한다.

```
Align이 놓는 자식 중심 = (a.x + 1)/2 × (화면폭 − 자식폭) + 자식폭/2
toPx가 주는 점         = (a.x + 1)/2 × 화면폭
```

숫자로 보면 확실하다. 화면 폭 400, 표지판 카드 폭 128, `a.x = 0.62`(상점)일 때

```
Align  = (0.62+1)/2 × (400 − 128) + 64 = 0.81 × 272 + 64 = 284
toPx   = (0.62+1)/2 × 400              = 0.81 × 400      = 324
                                                    차이 = 40px
```

트랙은 324에 그려지는데 카드는 284에 있으니 40px 벌어진다. 차이는 공식으로도 딱 떨어진다.

```
차이 = (자식폭 / 2) × a.x = 64 × 0.62 = 40
```

여기서 숲속(`a.x = -0.1`)을 넣어보면 `64 × (-0.1) = -6px` — 거의 티가 안 난다. "숲속은 비슷한데 상점만 안 맞아" 보였던 이유가 이거였다. 어긋남이 `a.x`에 비례하니 가장자리로 갈수록 커진다.

위젯 배치(`Align`)와 직접 그리기(픽셀)를 섞으면 반드시 어긋난다.

---

### 해결 — 중심을 점에 꽂기 (FractionalTranslation)

`toPx`는 점 하나를 준다. 그 점에 위젯의 중심을 놓고 싶은데, 문제가 있다.

- `Positioned(left, top)`은 자식의 왼쪽 위 모서리를 그 점에 놓는다. 중심이 아니다.
- 중심으로 만들려면 자식 크기의 절반만큼 왼쪽·위로 밀어야 하는데, 카드 크기를 코드에서 모른다(글자 길이에 따라 높이가 달라짐).

이때 `FractionalTranslation`이 답이다. 이건 "자기 크기의 몇 %만큼 밀기"라서 크기를 몰라도 된다. `(-0.5, -0.5)`를 주면 자기 폭의 50%만큼 왼쪽, 높이의 50%만큼 위로 밀려서 중심이 정확히 그 점에 온다.

```dart
Widget at(Alignment a, Widget child) {
  final p = toPx(a); // 비율 → 픽셀 점
  return Positioned(
    left: p.dx,
    top: p.dy, // 여기에 자식의 "왼쪽 위"가 온다
    child: FractionalTranslation(
      translation: const Offset(-0.5, -0.5), // 자기 크기의 −50% → 중심이 점으로
      child: child,
    ),
  );
}
```

이제 표지판·집·강아지·트랙이 전부 `toPx` 하나만 쓰니 픽셀 단위로 정확히 겹친다.

---

## 레이아웃

### 함정 2 — 자식이 전부 Positioned면 Stack이 쪼그라든다

위 수정을 하고 나니 이번엔 화면이 하얗게 텅 비었다. 코드는 멀쩡해 보이는데 아무것도 안 나왔다.

`Stack`이 자기 크기를 정하는 규칙을 몰랐던 게 원인이다.

- `Stack`은 Positioned가 아닌 자식(그냥 얹은 위젯)들을 보고 "가장 큰 애만큼" 커진다.
- `Positioned` 자식은 크기 계산에 안 들어간다. 이미 위치가 정해진 애들이라 무시한다.

원래는 표지판들이 `Align`(= non-positioned)이라 Stack이 화면만큼 컸다. 그런데 전부 `Positioned`로 바꾸니 non-positioned 자식이 상단 잔고 칩 하나만 남았다. → Stack이 칩 높이(약 50px)로 쪼그라들고, 그 바깥에 놓인 표지판·강아지·트랙이 전부 잘려나가(clip) 안 보인 것이다.

```dart
// ❌ 전부 Positioned → Stack이 작아져서 다 잘림
Stack(children: [Positioned(...), Positioned(...)])

// ✅ 부모가 크기를 정해줘서 화면 전체를 차지
SizedBox.expand(
  child: Stack(children: [...]),
)
```

`Stack(fit: StackFit.expand)`도 같은 효과다.

한 줄 요약 — `Positioned`만 있는 Stack은 스스로 크기를 못 정한다. 부모가 정해줘야 한다.

> 이런 구조 변경은 hot reload로 제대로 안 붙는다. 고쳤는데도 계속 흰 화면이라 멀쩡한 코드를 한참 의심했는데, 새로 빌드하니 정상이었다. 화면이 이상하면 hot restart(또는 재빌드)부터 해볼 것.

---

## 그리기

### 점선 트랙 — 선을 잘라서 그린다

Flutter엔 "점선 그리기" 기본 기능이 없다. 그래서 선을 짧은 조각으로 잘라 그리는 방식을 쓴다.

- `Path` — 선이나 도형의 "경로". 여기선 집→표지판 직선.
- `PathMetric` — 그 경로의 길이를 재고, "몇 px 지점부터 몇 px 지점까지"만 잘라낼 수 있게 해주는 도구.

그래서 `6px 그리고 → 5px 건너뛰고`를 반복하면 점선이 된다.

```dart
for (final target in targets) {
  final path = Path()
    ..moveTo(home.dx, home.dy)      // 집에서 시작해서
    ..lineTo(target.dx, target.dy); // 표지판까지 직선

  for (final m in path.computeMetrics()) { // 경로 측정 도구
    var d = 0.0;
    while (d < m.length) {
      final next = (d + dash).clamp(0.0, m.length); // 6px 뒤 지점
      canvas.drawPath(m.extractPath(d, next), paint); // 그 구간만 그림
      d += dash + gap; // 6px 그렸으니 5px 건너뛰고 다음으로
    }
  }
}
```

같은 기법으로 습관 추가 타일의 점선 테두리도 그렸다. 경로가 직선 대신 둥근 사각형(`RRect`)일 뿐 자르는 방식은 똑같다.

---

## 애니메이션

### 걷고 나서 화면 열기

`AnimatedPositioned`는 "`left`/`top` 값이 바뀌면 알아서 스르륵 움직여주는" 위젯이다. 프레임을 직접 그릴 필요 없이 목표 좌표만 바꾸면 된다.

흐름은 이렇다.

1. 표지판 탭 → 강아지 목표 좌표(`_dogAlign`)를 그 표지판 앞으로 바꾼다
2. `AnimatedPositioned`가 800ms 동안 트랙 위를 걸어간다
3. 800ms 기다렸다가 화면을 연다 (= 도착하는 순간)
4. 돌아오면 좌표를 집으로 되돌린다 → 강아지가 집으로 걸어온다

```dart
Future<void> _goTo(Alignment target, Widget Function() dest) async {
  if (_walking) return; // 걷는 중엔 재탭 무시 (중복 이동 방지)

  setState(() {
    _walking = true;
    _dogAlign = target; // ← 이 한 줄이면 AnimatedPositioned가 알아서 움직인다
  });

  await Future.delayed(const Duration(milliseconds: 800)); // 애니 duration과 동일
  if (!mounted) return; // 그 사이 화면이 사라졌으면 중단

  await Navigator.push(context, MaterialPageRoute(builder: (_) => dest()));
  if (!mounted) return;

  setState(() {
    _walking = false;
    _dogAlign = _homeDog; // 집으로 복귀 (역시 걸어서)
  });
}
```

포인트는 `Future.delayed`를 애니메이션 duration과 똑같이 맞추는 것. 그래야 강아지가 도착하자마자 화면이 열려서 자연스럽다.

---

## 요약

- 화면 위 요소들의 위치 정하는 방법을 하나로 통일할 것. 위젯은 `Align`, 그림은 픽셀 — 이렇게 섞으면 반드시 어긋난다.
- `Align`은 자식 크기를 빼고 계산한다. 어긋나는 양은 `(자식폭/2) × a.x` — 가장자리로 갈수록 커진다.
- 중심에 꽂고 싶은데 자식 크기를 모르면 `FractionalTranslation(-0.5, -0.5)`.
- `Stack`은 non-positioned 자식으로 크기를 정한다. 전부 `Positioned`면 `SizedBox.expand`로 감싼다.
- 구조를 바꿨는데 화면이 이상하면 hot restart부터 해볼 것.
