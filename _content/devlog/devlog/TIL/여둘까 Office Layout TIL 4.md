---
layout: post
title: 여둘까 Office Layout TIL 4
date: 2026-07-03
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - HTML
  - WebAPI
---
## 거리·면적 재는 중에도 도면을 옮길 수 있게 팬(화면 이동) 추가

Konva는 캔버스 위 도형들의 클릭·드래그·회전을 대신 처리해주는 라이브러리다. 여둘까에선 가구·평면도·측정선이 전부 Konva 객체이고, 마우스로 그것들을 다루는 일(가구 클릭, 측정점 찍기, 주석 그리기)을 이미 Konva가 잘 해내고 있었다.

여기에 팬(화면 이동)을 새로 얹어야 했다. 조건은 하나 — 기존 동작을 하나도 깨뜨리지 않을 것.

방법은 두 갈래였다.

1. Konva가 이벤트를 처리하는 코드를 곳곳에서 뜯어고쳐 "팬 중일 땐 무시해"를 심는다 → 잘 돌아가던 게 깨질 위험이 크고 유지보수 난이도 증가
2. Konva가 이벤트를 받기 전에, 팬 제스처만 앞단에서 낚아채고 나머지는 그대로 흘려보낸다 → 잘 돌아가는 기계는 그대로 두고 입력 앞에 필터 하나만 끼우는 방식

2번을 택했다. 기존 측정·그리기·선택 핸들러는 코드 한 줄도 안 건드렸다. 그 "필터"를 가능하게 한 게 이벤트 캡처 단계, 중간에 발목을 잡은 게 브라우저의 이중 이벤트 계열이다.

---

## 문제 — 좌클릭은 이미 자리가 찼다

거리·면적을 재는 동안 좌클릭은 "측정점 찍기"에 쓰인다. 그래서 화면 이동은 좌클릭 말고 다른 입력 — 휠클릭·우클릭·Space+드래그 — 에 얹어야 했다. 문제는, 이 제스처로 마우스를 누르는 순간 Konva의 클릭 핸들러(측정점 찍기)나 그리기 핸들러가 같이 발동하면 안 된다는 것. 팬을 하려는데 엉뚱한 점이 찍히거나 도형이 그려지면 사용자의 의도와 다르게 된다.

---

## 이벤트 전파와 캡처 단계

DOM 이벤트는 두 단계로 흐른다 — `window`에서 대상으로 내려가는 캡처(capture) 단계, 대상에서 `window`로 올라가는 버블(bubble) 단계. 대부분의 라이브러리는 버블 단계에서 듣는다. Konva도 stage 컨테이너에 버블 단계로 리스너를 건다.

여기에 같은 요소에 캡처 단계 리스너를 걸면 Konva보다 먼저 실행된다. 거기서 `stopPropagation()`을 부르면, 이벤트가 버블 단계로 못 넘어가 Konva의 리스너가 아예 이벤트를 못 받는다.

```js
const _panEl = stage.container();

function _panDown(e) {
  const b = e.button;
  if (!(b === 1 || b === 2 || (b === 0 && _spaceDown))) return; // 휠클릭·우클릭·Space+좌클릭만
  e.preventDefault();
  e.stopPropagation();   // ← 캡처 단계에서 막아 Konva가 이 down을 못 받게
  _panning = true;
  _panStart  = { x: e.clientX, y: e.clientY };
  _panOrigin = { x: stage.x(), y: stage.y() };
}

_panEl.addEventListener("mousedown", _panDown, true);   // 세 번째 인자 true = 캡처 단계
```

`addEventListener`의 세 번째 인자 `true`가 캡처 단계 등록이다. 기본값(`false`)은 버블이라, 이걸 안 주면 Konva와 같은 단계에서 실행 순서 싸움이 나고 `stopPropagation`도 늦는다. "먼저 잡아서 막는다"는 캡처 단계에서만 가능하다.

---

## `stopPropagation`과 `preventDefault`는 다른 걸 막는다

위 코드엔 `e.preventDefault()`도 같이 있다. 이름이 비슷해 헷갈리지만 겨누는 대상이 완전히 다르다.

- `stopPropagation()` — 이벤트의 여행을 끊는다. "버블(=Konva)까지 가지 마." 다른 리스너(Konva) 를 향한 차단. 이벤트를 가로채는 도구.
- `preventDefault()` — 이벤트는 계속 흐르게 두되, 브라우저가 그 입력에 대해 하려던 기본 동작만 취소한다. 브라우저 자신의 반응 을 향한 차단.

팬에선 브라우저 기본 동작이 오히려 방해라 셋을 껐다.

- 우클릭 → 기본은 "우클릭 메뉴 띄우기". 팬 하려는데 메뉴가 뜨면 안 되니 `contextmenu`에서 `preventDefault`.
- Space → 기본은 "페이지 아래로 스크롤". Space로 팬하려는데 화면이 튀면 안 되니 `keydown`에서 `preventDefault`.
- 휠클릭(가운데 버튼) → 기본은 "자동 스크롤 모드"(원형 커서). 이것도 `preventDefault`로 끈다.

즉 이번 팬은 두 도구를 같이 썼다 — `stopPropagation`으로 Konva에게 안 가게 하고, `preventDefault`로 브라우저 기본 반응을 끈다. 하나는 목적지(Konva)를 향한 차단, 하나는 브라우저 자신을 향한 차단이다.

---

## 브라우저는 마우스 이벤트를 두 계열로 쏜다

한쪽(`mousedown`)만 막았더니 측정점이 계속 찍혔다. 원인은 Konva가 mouse 계열(`mousedown`/`mousemove`/`mouseup`)과 pointer 계열(`pointerdown`/`pointermove`/`pointerup`)을 둘 다 듣고 있었기 때문. 마우스를 한 번 누르면 브라우저가 `pointerdown`과 `mousedown`을 둘 다 발사하고, Konva의 클릭 판정은 pointer 계열을 탄다.

그래서 두 계열을 모두 캡처에서 막아야 했다.

```js
["pointerdown", "mousedown"].forEach(t => _panEl.addEventListener(t, _panDown, true));
["pointerup",   "mouseup"  ].forEach(t => window.addEventListener(t, _panUp,   true));
```

`down`뿐 아니라 `up`도 두 계열을 다 막는 이유 — 텍스트 주석 그리기가 `mouseup`에서 발동하기 때문. down만 막고 up을 놔두면, 팬으로 끝낸 제스처의 `mouseup`이 Konva에 닿아 엉뚱한 텍스트 상자를 만든다.

---

## 한 번 누르면 이벤트가 짝으로 온다

두 계열을 다 들으니, 물리적으로 한 번 눌러도 `_panDown`이 `pointerdown`·`mousedown` 두 번 불린다. `_panning` 플래그로 중복 진입을 막았다.

```js
function _panDown(e) {
  if (_panning) { e.stopPropagation(); return; } // 짝 이벤트 — 막기만 하고 재시작 안 함
  ...
}
```

`up`도 마찬가지로 짝(`pointerup`+`mouseup`)으로 온다. 첫 up에서 `_panning`을 끄면, 뒤따르는 짝 up이 그대로 Konva로 새어 나간다. `_panEnding` 플래그로 짝 하나만 더 삼키고, `setTimeout(0)`으로 곧 해제해 플래그가 고아로 남지 않게 했다.

```js
function _panUp(e) {
  if (_panning) {
    e.stopPropagation();
    _panning = false; _panEnding = true;
    setTimeout(() => { _panEnding = false; }, 0); // 짝 up만 삼키고 다음 틱에 해제
  } else if (_panEnding) {
    e.stopPropagation(); // pointerup 직후 따라오는 mouseup(또는 반대) 소비
  }
}
```

---

## world 좌표라 측정이 안 깨진다

팬 중엔 `stage.position`만 바꾼다. 가구·측정점은 화면 픽셀이 아니라 world 좌표(이미지 픽셀) 로 저장돼 있어서, 카메라(stage)를 아무리 움직여도 데이터는 그대로다. 그래서 첫 점을 찍고 → 팬으로 화면을 옮기고 → 두 번째 점을 찍어도 두 점이 같은 좌표계 위에 있다.

---

## 요약

-  Konva의 이벤트 핸들러를 안 건드리고 특정 제스처만 가로채려면 → 같은 요소에 캡처 단계 리스너 + `stopPropagation`
- 마우스 입력은 pointer 계열과 mouse 계열이 짝으로 온다 — 하나만 막으면 새어 나갈 수 있다. 라이브러리가 어느 계열을 듣는지 모르면 둘 다 막아야 한다.
- 짝 이벤트 중복은 진입 플래그로, 짝 잔여는 종료 플래그 + `setTimeout(0)`으로 처리
- 좌클릭이 이미 점유된 도구에서 팬은 휠클릭·우클릭·Space+드래그에 얹는 게 관례 (CAD·Figma)
