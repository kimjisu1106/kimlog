---
layout: post
title: 여둘까 Office Layout TIL 2
date: 2026-06-23
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
## 변환

### 그룹을 거울로 뒤집으면 회전각 부호가 반전된다

그룹 반전을 구현할 때 각 도형의 위치를 거울 기준으로 뒤집는 건 직관적이다. 그런데 회전된 도형이 있으면 회전각도 같이 처리해야 한다. 선형대수적으로 거울 반사 M과 회전 R(θ)의 합성이 `M·R(θ) = R(−θ)·M`으로 정리되기 때문에, 그룹 반전 = (위치 거울반사) + (flip 토글) + (회전각 부호반전)이 된다.

```js
const Cx = (minX + maxX) / 2, Cy = (minY + maxY) / 2;   // 선택 영역 중심
nodes.forEach(n => {
  const fx = n._fx;
  if (axis === "flipX") { fx.cx = toMm(2 * Cx - toPx(fx.cx)); fx.flipX = !fx.flipX; }
  else                  { fx.cy = toMm(2 * Cy - toPx(fx.cy)); fx.flipY = !fx.flipY; }
  fx.rot = (((-(fx.rot || 0)) % 360) + 360) % 360;   // R(-θ)
});
```

---

### 점선 간격을 mm로 지정하면 줌해도 일정하게 보인다

dash 배열을 px로 고정하면 축척이 바뀔 때(줌인/아웃, 재보정) 간격이 같이 늘어나거나 줄어든다. mm 기준으로 지정하고 `toPx()`로 환산하면, 줌 레벨이 달라져도 실제 밀리미터 간격이 일정하게 유지된다.

```js
const dash = fx.dash ? [toPx(80), toPx(50)] : undefined;   // 80mm 선 / 50mm 공백
```

---

## Konva

### 그룹을 뒤집어도 라벨 글자가 거울로 보이지 않으려면

Konva 그룹에 `scaleX: -1`을 주면 자식 요소 전체가 뒤집힌다. 라벨 텍스트까지 거울처럼 반전되는 건 의도하지 않은 결과다. 라벨 자체에도 `scaleX: -1`을 주면 음수 × 음수 = 양수가 되어 글자가 다시 정방향으로 돌아온다. 이때 라벨 원점을 박스 중심에 맞춰야 제자리에서 상쇄된다.

```js
label.offsetX(wpx / 2); label.offsetY(label.height() / 2);
label.x(wpx / 2); label.y(hpx / 2);
if (fx.flipX) label.scaleX(-1);   // 그룹 -1 × 라벨 -1 = +1 → 글자 정방향
if (fx.flipY) label.scaleY(-1);
```

---

### 회전·반전된 노드의 바운딩 박스는 getClientRect()로

다중 선택 시 선택 영역 전체의 바운딩 박스가 필요하다. 회전된 도형은 도형의 크기보다 더 큰 바운딩박스가 필요하기 때문에 도형의 실제 경계를 직접 계산하려면 꼭짓점마다 회전 행렬을 적용해야 한다. Konva의 `getClientRect({ relativeTo })`가 이를 대신해준다.

```js
const r = n.getClientRect({ relativeTo: mainLayer });   // 회전/scale 반영된 좌표공간 px
```

---

## 그리기

### 1/4 원(문 열림 호)은 ctx.ellipse()의 각도로

출입문 표시에 쓰이는 1/4 원은 `ctx.ellipse()`의 start/end 각도를 0과 π/2로 지정하면 된다. 힌지를 (0, 0)에 두고 문짝선을 먼저 그린 뒤 호를 이어 닫으면 부채꼴이 완성된다. w와 h가 같으면 정확한 1/4 원, 다르면 1/4 타원이 된다.

```js
function quarterScene(ctx, shape) {
  const w = shape.width(), h = shape.height();
  ctx.beginPath();
  ctx.moveTo(0, 0);                 // 힌지
  ctx.lineTo(w, 0);                 // 문짝선
  ctx.ellipse(0, 0, w, h, 0, 0, Math.PI / 2, false);   // 90° 호
  ctx.closePath();
  ctx.fillStrokeShape(shape);
}
```

---

## 함정

### 프리셋 모양이 바뀌면 key도 같이 바꿔야 한다

localStorage에 저장된 프리셋 오버라이드(사용자가 조정한 크기/색상)는 key로 매칭된다. 출입문이 사각형에서 1/4원으로 바뀌었는데 key를 그대로 두면, 저장된 옛날 크기(900×100)가 새 기본값(1000×1000)을 덮어써서 찌그러진 도형이 나타난다. key를 새로 주면 옛 오버라이드가 매칭되지 않아 깨끗이 무시된다.

```js
{ name: "출입문", w: 1000, h: 1000, color: "#9ec5fe", quarter: true, key: "구조/출입문-호" },
```

더 근본적인 해결은 key에 짧은 고유 ID를 suffix로 붙이는 것이다. 이렇게 하면 모양이 바뀔 때마다 key를 수동으로 갱신해야 한다는 걸 기억할 필요가 없다.

```js
{ name: "출입문", key: "door-quarter-a3f9b2c1", ... }
```

사람이 읽을 수 있는 prefix + 고유 suffix — 충돌도 없고 디버깅도 된다.
