---
layout: post
title: 소리꽃 KeyBloom TIL 31
date: 2026-08-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 파티클을 결정적으로 만드는 방법 — 무작위를 시드 난수로 바꿔 같은 입력이면 같은 그림이 나오게, 그리고 나중에 터지는 불꽃까지 프레임 순서와 무관하게 재현되게 한 이야기.
tags:
  - TypeScript
---
두 화면에 똑같은 파티클을 띄우려면 파티클이 "결정적"이어야 한다. 즉 같은 연주 → 언제나 같은 파티클. 그런데 파티클은 곳곳에서 `Math.random()`을 쓴다.

---

## 무작위를 시드 난수로 바꾸면 재현된다

`Math.random()`은 매번 다른 값이라 두 번 그리면 결과가 다르다. 대신 시드로 초기화되는 난수(PRNG) 를 쓰면 같은 시드는 같은 수열을 뱉는다.

```ts
// mulberry32 — 같은 seed → 같은 난수 수열
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

파티클 시스템이 `rng`를 하나 들고, spawn(파티클이 새로 생겨나는 순간)마다 그 노트의 시드로 다시 심는다. spawn 안의 모든 무작위(위치·크기·색·움직임)를 이 `rng()`로 바꿨다.

```ts
spawn(..., seed?: number): void {
  this.rng = seed === undefined ? Math.random : mulberry32(seed);
  // 이하 Math.random() 자리를 전부 this.rng()로
}
```

seed를 안 넘기면 예전처럼 `Math.random` → 현행 그대로. 안전장치.

---

## 나중에 터지는 것은 파티클 자신의 시드로 재현한다

불꽃은 포탄이 날아가다 나중에 터져 불똥을 뿌린다. 이 폭발이 update 루프 중간에 일어나서, 그 시점의 공용 난수 상태에 의존하면 두 창이 어긋난다. 프레임 처리 순서가 미세하게 달라질 수 있어서다.

그래서 파티클마다 자기 시드를 들고, 터질 때 그 시드로 로컬 난수를 새로 만든다.

```ts
// 파티클이 seed 필드를 가지고
seed: (this.rng() * 0x100000000) >>> 0,
// 폭발 시 그 시드로 로컬 rng → 프레임 순서와 무관하게 결정적
private explode(s: Particle): void {
  const er = mulberry32(s.seed);
  const a = er() * Math.PI * 2;
  // 불똥의 모든 무작위를 er()로
}
```

이러면 언제 터지든, 몇 번째 프레임에서 처리되든, 그 포탄의 불똥은 항상 똑같이 퍼진다.

---

## 덤 — 저장 프로젝트가 재현된다

결정적으로 만드니 두 창이 일치하는 것뿐 아니라, 저장한 프로젝트를 다시 열어도 파티클이 똑같이 뜬다. 예전엔 열 때마다 미세하게 달랐다.

> 두 화면을 나란히 놓고 봐도 구별 안 될 정도면 충분하다. 관객은 출력 하나만 보니까. 남은 차이는 두 창의 화면 갱신 위상차(수 ms)뿐이라 눈에 안 보인다.

---

## 요약

- `Math.random()` 대신 시드 난수(mulberry32) 를 spawn마다 심으면 같은 입력이 같은 그림이 된다.
- 나중에 터지는 것(불꽃)은 파티클 자신의 seed로 로컬 난수를 만들어 프레임 순서와 무관하게 재현한다.
- 결정적 렌더는 두 창 일치 + 프로젝트 재현이라는 덤을 준다.
