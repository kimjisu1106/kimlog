---
layout: post
title: 크레센도 Phaser + TypeScript TIL 5
date: 2026-06-11
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
## 시스템

### 재시작은 "상태 보존"이 기본 — 리셋은 명시적으로만

`registry`는 씬을 재시작해도 값이 그대로 남는다(TIL 3 참고). 다시 말하면, 게임오버 후 다시하기 버튼을 눌러도 아무것도 안 건드리면 현재 스테이지에서 그냥 이어진다.

처음에 다시하기가 매번 1스테이지로 돌아갔던 이유는, 버튼이 의도적으로 `registry`를 초기화하고 있었기 때문이었다. "게임오버 = 현재 스테이지 재도전 / 엔딩 클리어 = 처음부터"로 나누려면, 초기화를 클리어 시에만 실행하면 된다.

```ts
// ❌ 다시하기마다 초기화 → 현재 스테이지를 못 이어함
this.registry.set("roster", []);
this.registry.set("stage", 0);

// ✅ 게임오버는 그냥 재시작, 엔딩에서만 초기화
if (clear) {
  this.registry.set("roster", []);
  this.registry.set("stage", 0);
}
this.scene.start("GameScene");
```

---

### "구간 통과" 감지는 전/후 값 비교로

보스 HP가 75%, 50%, 25%를 넘어갈 때마다 체력 포션을 드롭하려면, 매 프레임 "방금 이 경계를 지나쳤냐"를 감지해야 한다. 단순히 "현재 HP가 50% 이하냐"만 체크하면 이미 넘어간 뒤 매 프레임마다 계속 발동된다.

해결은 데미지를 받기 전/후 비율을 비교하는 것 — 전 > 임계값이고 후 <= 임계값이면 그 프레임에 경계를 통과한 것이다.

```ts
protected override applyDamage(dmg, dir) {
  const before = this.hpRatio;       // 데미지 전 비율
  super.applyDamage(dmg, dir);
  const after = this.hpRatio;        // 데미지 후 비율

  for (const t of [0.75, 0.5, 0.25])
    if (before > t && after <= t) this.heartBurst?.(this.x, this.groundY);
}
```

HP는 단조 감소라 각 경계는 정확히 한 번만 발동된다. 한 방에 여러 경계를 넘으면 그만큼 여러 번 발동된다.

---

## 아키텍처

### 오브젝트 죽음의 외부 효과는 콜백으로 분리

잡몹이 죽을 때 아이템을 드롭해야 한다. 이걸 구현하는 방법으로 Enemy 클래스 안에 `EnemyManager`를 직접 참조하는 코드를 넣는 방법이 있다. 하지만 그러면 Enemy가 EnemyManager를 알아야 하는 의존성이 생겨, 나중에 코드를 바꾸기 어려워진다.

대신 "죽을 때 이 함수를 불러줘"라는 콜백을 외부에서 주입하면, Enemy는 죽는 시점에 콜백만 호출하면 되고 드롭 로직이 뭔지는 알 필요가 없다. 보스는 콜백을 설정하지 않으면 자연스럽게 드롭이 없다.

```ts
// Enemy — 죽는 시점에 콜백 호출
killCallback?: (x: number, y: number) => void;

if (this.hp <= 0) {
  this.onDeath();
  this.killCallback?.(this.x, this.y); // 콜백이 있으면 호출, 없으면 무시
  this.startDying();
}

// EnemyManager.spawn — 콜백 주입
enemy.killCallback = (kx, ky) => this.maybeDrop(kx, ky);
// 보스는 killCallback을 설정 안 함 → 드롭 없음
```

---

## 게임 느낌

### 스턴 중엔 무적도 함께 연장해야 한다

피격 무적(iframe)이 0.45초, 스턴(헤롱거림)이 1.2초라면 — 무적이 먼저 풀리고 스턴이 남아있는 0.75초 동안 플레이어는 움직이지 못하면서 계속 맞을 수 있다. 한 번 걸리면 연쇄로 죽는 억울한 패턴이 된다.

스턴을 줄 때는 무적 시간도 스턴 길이만큼 덮어써야 한다. "움직이지 못하는 동안은 추가 피해를 막는다"는 것이 기본 원칙.

```ts
daze(now, ms) {
  this.dazeUntil = Math.max(this.dazeUntil, now + ms);
  this.hurtUntil = Math.max(this.hurtUntil, this.dazeUntil); // 스턴 길이만큼 무적 연장
}
```

---

### 공격 "경직"과 "애니 길이"를 분리해야 조작감이 산다

공격 애니메이션이 700ms라고 해서 700ms 내내 이동을 막으면 조작감이 무겁다. 실제로 타격 판정이 들어가는 구간(약 400ms)만 이동을 잠그고, 그 이후엔 방향키를 누르면 공격을 캔슬하고 이동할 수 있게 하면 반응성이 살아난다.

```ts
// 타격 판정 구간 동안만 경직
const rooted = attacking && now - this.lastAttackAt < cfg.attackRootMs;

if (rooted) {
  this.setVelocityX(0); // 방향키 눌러도 제자리
} else {
  // 이동 로직
  if (input.moveX !== 0 && attacking) {
    this.attackUntil = now; // 이동 입력 시 공격 캔슬
  }
}
```

---

## 렌더링

### 저해상도 게임에서 글씨만 또렷하게 — DOM 레이어

DOM은 브라우저가 HTML 요소(`<div>`, `<p>` 등)를 다루는 방식이다. 브라우저는 이 요소들을 벡터 기반으로 렌더링하기 때문에 어떤 크기로 확대해도 선명하게 나온다.

Phaser 게임은 기본적으로 `<canvas>` 하나에 모든 걸 그린다 — 캐릭터, 배경, 글씨 전부. 그래서 캔버스를 확대하면 글씨도 같이 뭉개진다. `dom.createContainer: true`를 켜면 Phaser가 캔버스 위에 투명한 HTML 레이어를 올려주고, 거기에 HTML 요소를 얹을 수 있다. 텍스트를 이 DOM 레이어에 두면 캔버스와 독립적으로 브라우저가 직접 렌더링해서 선명하게 나온다.

픽셀아트 게임은 보통 낮은 해상도(예: 480×270)로 렌더링하고 화면 크기에 맞게 확대한다. 도트 캐릭터는 이 방식이 잘 맞지만, 텍스트는 함께 확대되면서 뭉개진다.

텍스트 해상도를 올리는 API(`setResolution()`)도 있지만, 텍스트가 낮은 해상도 버퍼의 작은 영역만 차지하는 구조라 실제로 해봐도 여전히 뭉개졌다. 한글은 글자 수가 많아 비트맵 폰트로 미리 굽는 것도 비현실적이다.

해결: 텍스트만 브라우저 DOM으로 분리한다. Phaser에서 `dom.createContainer: true`를 설정하면 `scene.add.dom()`으로 HTML 요소를 캔버스 위에 올릴 수 있다. DOM 텍스트는 벡터 폰트라 어떤 배율에도 선명하게 렌더링된다.

```ts
// main.ts — DOM 컨테이너 활성화
dom: { createContainer: true }

// 텍스트 생성
scene.add.dom(x, y, "div", `font-family:${FONT};font-size:${size}px;white-space:pre`, text)

// 동적 갱신
(el.node as HTMLElement).innerText = "새 텍스트";

// 트윈도 그대로 작동
this.tweens.add({ targets: el, scale: 1.1, alpha: 0 });
```

---

### 머리 위 체력바는 매 프레임 위치를 직접 따라가게

체력바를 캐릭터 머리 위에 고정하려면 매 프레임 `update()`에서 캐릭터의 현재 y 위치를 읽어 체력바 위치를 갱신해야 한다. Phaser의 `Rectangle`(또는 Graphics)으로 만든 체력바는 물리 바디가 없어서 자동으로 따라가지 않기 때문이다.

잔량에 따라 색도 바꾸면 시각적으로 상태를 바로 읽을 수 있다.

```ts
// update() 안에서 매 프레임 갱신
hpBar.setPosition(player.x, player.y - HP_BAR_OFFSET_Y);

// 잔량별 색
const ratio = this.hp / this.maxHp;
const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xffaa00 : 0xff3333;
hpBar.fillStyle(color).fillRect(...);
```

---

## 함정

### DOM 텍스트는 항상 캔버스 위, 폰트 파일은 public/에

DOM으로 만든 텍스트 요소는 Phaser의 `depth` 설정과 무관하게 항상 캔버스 위 레이어에 그려진다. HUD처럼 항상 최상단에 있어야 하는 UI에는 딱 맞지만, 월드 오브젝트 뒤에 숨어야 하는 텍스트에는 쓸 수 없다.

커스텀 폰트(`@font-face`)는 Vite 기준으로 `public/` 폴더에 있어야 서빙된다. `assets/` 폴더에 두면 404가 나고 브라우저 기본 폰트(monospace)로 폴백된다.
