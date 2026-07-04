---
layout: post
title: 소리꽃 KeyBloom TIL 3
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
  - TypeScript
---
## 여러 움직임을 각각 짜지 말고, 물리값으로 환원해 하나의 로직으로

소리꽃 파티클엔 움직임 종류가 여럿이다 — 피어오름, 방사형 개화, 상승 후 흐트러짐, 나선형(토네이도), 분수, 불꽃. 처음엔 모션마다 update 로직을 따로 짤 뻔했는데, 그러면 모션이 늘 때마다 코드가 갈라지고 엉킨다. 대신 모든 모션을 같은 물리로 돌리고, 모션은 그 물리에 넣을 값만 다르게 주는 구조로 갔다.

---

## 모션 = spawn 시점의 물리값 묶음

파티클 하나가 가진 건 위치·속도(vx, vy)·중력·감쇠(drag)·좌우 흔들림(진폭/주파수/위상)·수명, 이게 전부다. 모션이란 건 파티클을 만들 때 이 값들을 어떻게 세팅하느냐의 차이일 뿐이다.

update는 모션이 뭔지 전혀 모른다. 그냥 이 값들로 물리를 한 스텝 적분한다.

```js
update(dt) {
  for (const p of particles) {
    p.age += dt;
    p.vy += p.gravity * dt;              // 중력(음수면 부력)
    const damp = 1 - p.drag * dt;         // 감쇠
    p.vx *= damp; p.vy *= damp;
    const sway = p.swayAmp * Math.sin(p.swayFreq * p.age + p.swayPhase);
    p.x += (p.vx + sway) * dt;
    p.y += p.vy * dt;
    p.life -= dt / p.lifeSec;
  }
}
```

그리고 모션별 값은 한곳에서 분기해 돌려준다.

```js
function motionPhysics(mode, speed) {
  switch (mode) {
    case "fountain": return { vy: -speed, gravity: 0.9, drag: 0, /* ... */ };   // 위로 쏘고 낙하
    case "float":    return { vy: -speed*0.1, gravity: -0.015, drag: 0.5, /* ... */ }; // 부력+감쇠로 부유
    // ...
  }
}
```

새 모션을 추가하는 건 이 switch에 케이스 하나 더 넣는 일이 됐다. update는 손 안 댄다.

---

## 토네이도 = 흔들림 진폭이 자라게

나선형(토네이도)은 좌우 흔들림 자체는 다른 모션에도 있는 sin 흔들림인데, 위로 갈수록 폭이 넓어져야 소용돌이처럼 보인다. 그래서 흔들림 진폭이 시간에 따라 커지는 값(swayGrow) 하나만 추가했다.

```js
const amp = p.swayAmp * (1 + p.swayGrow * p.age); // 나이가 들수록 진폭 증가
const sway = amp * Math.sin(p.swayFreq * p.age + p.swayPhase);
```

다른 모션은 swayGrow가 0이라 영향이 없다. 흔들림을 속도로 두고 위치에 적분하면 실제 좌우 폭은 대략 진폭/주파수라, 회전 속도(주파수)와 퍼지는 정도(진폭)를 따로 조절할 수 있다. 처음에 회전이 너무 빨라서 주파수를 낮췄더니 위로 가는 양까지 줄어 보였는데, 상승 속도(vy)는 별개라 그것만 올려 분리했다.

---

## 불꽃 = 파티클이 파티클을 낳는 2단계

대부분 모션은 노트 하나에 파티클을 한 번에 뿌린다. 불꽃만 예외다. 진짜 폭죽처럼 포탄이 솟았다가 정점에서 터져야 한다.

- 노트마다 포탄(shell) 파티클 하나를 위로 쏜다. 포탄은 "이 나이가 되면 터진다"는 시각(explodeIn)을 가진다.
- update에서 포탄이 그 나이에 도달하면 제거하면서, 그 자리에서 방사형으로 불똥(spark) 여러 개를 새로 만든다.

여기서 주의할 게, update 루프를 도는 중에 배열에 파티클을 추가하면 반복이 꼬인다. 그래서 터질 포탄을 루프 안에서 모아뒀다가, 루프가 끝난 뒤에 불똥을 방출했다.

```js
const explosions = [];
for (...) {
  // ...물리...
  if (p.explodeIn > 0 && p.age >= p.explodeIn) { explosions.push(p); continue; }
}
for (const shell of explosions) spawnSparks(shell); // 루프 밖에서 추가
```

정점에서 터지게 하려면 폭발 시각을 물리로 잡으면 된다. 위로 쏜 속도가 중력에 의해 0이 되는 때가 정점이니, 폭발 시각 = 발사속도 / 중력.

---

## 요약

- 여러 움직임을 각각 구현하는 대신, 모든 파티클을 같은 물리(속도·중력·감쇠·흔들림·수명)로 돌리고 모션은 spawn 때 그 값만 다르게 준다. update는 모션을 모른다 → 새 모션 = switch 케이스 하나.
- 토네이도는 흔들림 진폭을 시간에 따라 키우는 값(swayGrow) 하나로. 회전 속도(주파수)와 퍼짐(진폭), 상승(vy)은 서로 독립.
- 불꽃은 포탄이 정점(발사속도/중력)에서 불똥을 낳는 2단계. update 중 배열을 바꾸지 않으려면 폭발을 모았다가 루프 뒤에 방출한다.
