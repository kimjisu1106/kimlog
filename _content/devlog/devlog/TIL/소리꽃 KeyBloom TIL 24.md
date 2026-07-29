---
layout: post
title: 소리꽃 KeyBloom TIL 24
date: 2026-07-26
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 파티클을 발광 영역 상자 안에 가두는데 하드 클램프가 벽에 붙어 멈칫대서, 사인 진동·tanh·진폭 분산까지 거치며 배운 트레이드오프.
tags:
  - TypeScript
---
파티클을 발광 영역(건반 열 폭 × 발광 길이) 상자 안에 가두는 옵션을 넣었다. 벽에 부딪히는 파티클을 어떻게 처리하느냐에 따라 느낌이 크게 달라져, 여러 방식을 거쳤다.

---

## 경계는 spawn 시점에 고정

가둠 경계(천장 `ceilY`, 좌우 `bx0`/`bx1`)를 파티클마다 spawn(파티클이 새로 생겨나는 순간) 때 정해 박아둔다. 큐 설정이 바뀌어도 이미 뜬 파티클은 자기 상자를 유지한다.

```ts
const ceilY = params.partBound ? topFrac - params.keyGlowLen : -Infinity;
const bx0 = params.partBound ? centerX - keyWidth / 2 : -Infinity;
```

`-Infinity`를 센티넬("값 없음"을 나타내는 표식 값)로 두면 update(매 프레임 갱신 함수)에서 별도 플래그 없이 `p.y < p.ceilY` 비교가 항상 false(가둠 없음)라 그냥 통과한다.

---

## 하드 클램프 — 벽에 붙어 멈칫

처음엔 벽을 넘으면 위치를 벽에 고정하고 그 방향 속도를 0으로 했다.

```ts
if (p.x > p.bx1) { p.x = p.bx1; if (p.vx > 0) p.vx = 0; }
```

그런데 좌우 흔들림(sway)이 바깥으로 미는 반주기 동안 파티클이 벽에 딱 붙어 정지 → 붙었다 떨어졌다 멈칫거렸다. 진동하는 입력에 하드 클램프를 걸면 절반은 벽에 눌러붙는다.

---

## 고정 진폭 사인 — 끝에서 느려짐

가둠 파티클의 x를 상자 폭에 맞춘 사인으로 대체했다. 벽에 안 부딪히지만, 사인은 양 끝(벽)에서 속도가 0이라 다 같이 끝에서 느려져 여전히 버벅여 보였다.

---

## 큰 값을 부드럽게 눌러 포화시키기 — 벽에 정체

자연 위치(nx)를 tanh(큰 값을 부드럽게 눌러 포화시키는 S자 곡선)로 상자에 눌러 담아봤다. 진폭이 커지면 tanh가 ±1로 포화돼, 벽에 붙어 "멈췄다 가운데서만 움직임"이 됐다.

```ts
p.x = cx + half * Math.tanh((p.nx - cx) / half); // 커지면 포화 → 벽에 정체
```

---

## 진폭 분산 사인 — 매끈

결국 파티클마다 진폭(bAmp)을 다르게 줬다. 벽에 닿는 시점이 분산돼, 어떤 파티클은 가운데를 빠르게 지나는 중이라 전체적으로는 매끈하게 도는 기둥으로 보인다.

```ts
const bAmp = params.partBound ? (keyWidth / 2) * (0.4 + 0.6 * Math.random()) : 0;
// update: p.x = cx + p.bAmp * Math.sin(p.swayFreq * p.age + p.swayPhase);
```

> 나중에 나선은 공간 회전(TIL 23)으로 따로 가고, 이 진폭 분산 사인은 비-나선 가둠에 남았다.

---

## 요약

- 가둠 경계는 spawn 시 파티클별로 고정, `±Infinity` 센티넬로 플래그 없이 클램프.
- 하드 클램프는 진동하는 입력에 걸면 벽에 붙어 멈칫.
- 고정 진폭 사인은 사인 특성상 끝(벽)에서 느려짐.
- tanh는 진폭이 크면 포화돼 벽에 정체.
- 파티클마다 진폭을 분산시키면 벽 도달 시점이 흩어져 매끈하게 보인다.
