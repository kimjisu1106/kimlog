---
layout: post
title: 크레센도 Phaser + TypeScript TIL 8
date: 2026-07-08
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - Phaser
  - TypeScript
  - JavaScript
---
## 렌더링

### Graphics로 폴리곤 실루엣 그리기

엔딩 함대의 비행선 placeholder를 사각형 2개 + 타원으로 조립했더니 그냥 상자로 보였다. 임의의 외곽 형태가 필요하면 `Graphics`의 path API로 폴리곤을 직접 그리면 된다. `beginPath`로 시작해 `moveTo`/`lineTo`로 꼭짓점을 찍고, `closePath` 후 `fillPath`로 채운다.

```ts
const g = this.add.graphics();
g.fillStyle(0x171026, 1);
g.beginPath();
g.moveTo(-30, 1);   // 기수(뾰족)
g.lineTo(-16, -5);
g.lineTo(12, -7);   // 상갑판
g.lineTo(24, -4);   // 후미 상단
g.lineTo(26, 2);    // 후미
g.lineTo(12, 6);
g.lineTo(0, 8);     // 하부 행어 돌출
g.lineTo(-14, 5);   // 행어 노치(패임)
g.closePath();
g.fillPath();
```

좌표는 컨테이너 원점(0,0) 기준 상대값으로 잡으면, 나중에 컨테이너를 옮기고 스케일해도 형태가 유지된다.

---

### 같은 Graphics에 fillStyle 바꿔가며 겹쳐 그리기

Graphics 객체 하나가 곧 캔버스다. `fillStyle`을 바꾸고 새 path를 시작하면 이전 도형 위에 다른 색 도형을 계속 얹을 수 있다. 선체를 그린 같은 `g`에 함교(사다리꼴)를 다른 색으로 겹쳤다.

```ts
// 선체를 그린 뒤, 같은 g에 함교를 다른 색으로
g.fillStyle(0x2a1f47, 1);
g.beginPath();
g.moveTo(2, -7);
g.lineTo(7, -12);
g.lineTo(17, -12);
g.lineTo(20, -7);
g.closePath();
g.fillPath();
```

도형마다 GameObject를 따로 만드는 것보다 draw call과 관리 대상이 줄어든다.

---

### 부분 엣지만 strokePath — 림라이트

폴리곤 전체에 테두리를 두르면 만화 외곽선이 되지만, 위쪽 엣지에만 밝은 선을 그리면 "위에서 빛을 받는" 림라이트가 된다. `strokePath`는 `closePath` 없이 열린 path도 그릴 수 있어서, 빛 받는 구간의 꼭짓점만 다시 따라가면 된다.

```ts
g.lineStyle(1, 0x8266c0, 0.75);
g.beginPath();
g.moveTo(-30, 1);   // 기수에서 시작해
g.lineTo(-16, -5);
g.lineTo(12, -7);   // 상갑판까지 위쪽 엣지만
g.strokePath();     // closePath 없이 열린 선
```

씬에 이미 "하늘에서 내려오는 빛" 연출이 있다면 림라이트 방향을 거기에 맞춰야 어색하지 않다.

---

### Graphics와 도형 GameObject를 Container에 섞어 담기

Graphics도 GameObject라서 `rectangle`/`ellipse` 같은 도형들과 함께 `Container`에 담긴다. 폴리곤 실루엣(Graphics) + 창문/엔진(rect) + 언더글로우(ellipse)를 하나로 묶으면, 컨테이너에 `setScale`/`setAlpha`/트윈을 걸었을 때 전체가 함께 움직인다.

```ts
return this.add
  .container(0, 0, [glow, g, win1, win2, win3, engine1, engine2])
  .setScale(scale);
```

배열 순서가 곧 그리기 순서라, 언더글로우를 맨 앞(가장 뒤에 그려짐)에 두고 그 위에 선체·불빛을 얹었다.

---

## 연출

### 여러 타겟을 한 트윈에 — 엔진 깜빡임

후미 엔진 글로우 2기가 같은 리듬으로 깜빡이면 되니, 트윈을 2개 만들 필요 없이 `targets`에 배열로 넘긴다. `alpha` yoyo + 무한 반복이면 추진 중인 느낌이 난다.

```ts
const engine1 = this.add.rectangle(27, -2, 5, 2, 0xb388ff, 0.95);
const engine2 = this.add.rectangle(27, 3, 5, 2, 0xb388ff, 0.8);
this.tweens.add({
  targets: [engine1, engine2], // 배열로 → 둘이 같은 리듬
  alpha: 0.35,
  duration: 260,
  yoyo: true,
  repeat: -1,
  ease: "Sine.easeInOut",
});
```

시작 알파를 서로 다르게(0.95 / 0.8) 두면 완전히 동일한 반짝임이 아니라 살짝 어긋나 보여 기계적인 느낌이 덜하다.

---

## 디자인

### 실루엣은 외곽 형태가 정보를 전달해야 한다

사각형 조합이 "비행선"으로 안 읽힌 이유는 색이나 디테일이 아니라 외곽 형태였다. 멀리서 검은 실루엣만 보여도 무엇인지 알 수 있으려면, 그 대상의 정체성을 만드는 특징 요소가 외곽선에 드러나야 한다.

- 진행 방향으로 뾰족해지는 기수 → "앞으로 나아가는 것"
- 상부 함교 → "함선"
- 하부 행어 노치 → "캐리어(수송/모함)"

디테일(창문·엔진·림라이트)은 실루엣이 읽힌 다음에 얹는 양념이다. 실루엣이 안 읽히면 디테일을 아무리 얹어도 못 살린다.

---

## 시스템

### 데이터 주도 스테이지 — 배열만 고쳐서 맵을 늘린다

S5가 다른 스테이지보다 짧아서 늘렸는데, 시스템 코드는 한 줄도 안 건드렸다. 스테이지가 `StageDef` 데이터(맵 폭·발판·잡몹 배치)로 구동되기 때문에 배열만 수정하면 끝이다.

```ts
const STAGE5: StageDef = {
  worldScreens: 8, // 5 → 8 (맵 폭 = 화면 수)
  floating: [
    [420, 185, 110],
    // ... 발판 5개 → 9개로 연장
    [3100, 185, 110],
  ],
  enemies: [380, 900, 1500, 2050, 2600, 3150], // 근접
  ranged: [640, 1200, 1800, 2350, 2900],       // 원거리
  chargers: [1050, 1650, 2250, 2850],          // 돌진형
  // ...
};
```

"멤버/스테이지 추가가 시스템 수정으로 번지면 안 된다"는 프로젝트 원칙이 이럴 때 회수된다. 초반에 데이터 주도로 깔아두면 밸런스 작업이 데이터 편집이 된다.

---

### 잡몹 배치는 아레나 진입선 앞까지만

보스 아레나는 마지막 한 화면(`worldW - width`)이고, 진입하면 좌측이 잠기고 컷신이 돌고 잔존 잡몹은 도주시킨다. 스테이지 데이터에서 잡몹 x를 아레나 안쪽에 찍으면 이 흐름과 충돌한다 — 컷신 중에 잡몹이 공격하거나, 도주 로직이 어색해진다.

```ts
// worldScreens 8 → 아레나 진입선 = 8*480 - 480 = 3360
enemies: [380, 900, 1500, 2050, 2600, 3150], // 전부 3360 앞
```

데이터가 자유로워 보여도, 시스템이 가정하는 경계(아레나 진입선)는 배치 제약으로 존중해야 한다.
