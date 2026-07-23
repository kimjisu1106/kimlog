---
layout: post
title: 크레센도 Phaser + TypeScript TIL 4
date: 2026-06-10
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
## 시스템 / 아키텍처

### 보스 능력은 배열로 쌓는다 — 데이터로 난이도 설계

스테이지가 올라갈수록 보스가 강해져야 한다. 이걸 코드로 구현하는 방법은 두 가지가 있다. `if (stage >= 3) runBeam()` 처럼 조건을 코드에 직접 적는 방법, 그리고 스테이지 데이터에 어떤 능력을 쓸지 배열로 적어두고 코드는 그걸 읽기만 하는 방법.

배열 방식이 낫다 — S4에 새 패턴을 추가하고 싶을 때 코드를 건드리지 않고 `stages.ts`의 배열에 문자열 하나만 추가하면 된다.

```ts
// stages.ts — 스테이지 데이터에 능력 목록만 적음
boss: { abilities: ["aoe", "spikes", "blink"] }

// Boss — 배열을 읽어서 실행
tickAbilities(now, player) {
  if (this.flying) { this.updateFlight(now, player); return; }
  if (this.abilities.includes("aoe"))   this.runAoe(now, player);
  if (this.abilities.includes("blink")) this.runBlink(now, player);
  if (this.abilities.includes("beam"))  this.runBeam(now, player);
}
```

S2에 `"spikes"` 한 단어 추가하면 가시 패턴이 등장한다. 시스템 코드는 그대로고 데이터만 바꾼 것.

---

### 스탯 배율은 데이터, 계산은 코드 — 매직넘버 없이 점증

각 스테이지마다 보스 HP나 공격력을 다르게 하고 싶을 때, 코드에 숫자를 직접 적으면 나중에 밸런스를 조정할 때 파일을 여러 곳 뒤져야 한다.

대신 기준값은 `GameConfig`에 두고, 스테이지 데이터에는 "기준의 몇 배"라는 배율만 적는다. HP 배율이 올라가면 보스가 더 많이 맞아야 죽으니까, 별도 방어력 스탯 없이도 탱킹 역할을 한다. 밸런스 숫자는 전부 한 곳(`stages.ts`)에서 관리된다.

```ts
// stages.ts — 배율만 데이터로
boss: { hpMul: 2.5, dmgMul: 1.5 },
enemyHpMul: 1.75,
enemyDmgMul: 1.35,

// Boss / Enemy — 기준값 × 배율로 실제 스탯 계산
maxHp: Math.round(GameConfig.boss.maxHp * cfg.hpMul),
get contactDamage() {
  return Math.round(GameConfig.enemy.contactDamage * this.dmgMul);
}
```

---

### 상속 필드 충돌 — 자식 클래스는 재선언 말고 super로 주입

TypeScript에서 부모 클래스(`Enemy`)에 `protected readonly dmgMul`이 있는데 자식 클래스(`Boss`)에서 `private readonly dmgMul`을 다시 선언하면 `incorrectly extends` 에러가 난다. 같은 이름의 필드가 두 군데 정의되어 충돌하기 때문.

해결은 간단하다 — 필드는 부모 클래스 하나에만 두고, 자식은 생성자에서 `super()`로 값을 넘긴다. 이 에러 하나가 호출부 타입 에러까지 연쇄로 일으키는 경우가 많아서, 근본 원인인 상속 충돌을 먼저 고치면 나머지가 같이 사라진다.

```ts
// ❌ 충돌: Enemy(protected readonly dmgMul) + Boss(private readonly dmgMul)

// ✅ 해결: 필드는 Enemy에만, Boss는 super()로 값 주입
super(scene, x, y, { maxHp: ..., dmgMul: cfg.dmgMul, walk: false });
```

---

## 게임 느낌

### 예고 시점에 위치를 고정해야 피할 수 있는 패턴이 된다

보스 패턴에 "예고 → 발동" 구조가 있을 때, 발동 순간에 플레이어 위치를 다시 계산하면 예고 동안 아무리 움직여도 결국 맞는다. 반대로 예고 시작 시점의 위치를 기억해두고 그걸 노리면, 예고 동안 움직여서 피할 수 있는 패턴이 된다.

순간이동 돌격, 빔, 구슬 모두 같은 원리다.

```ts
// 예고 시작 시점에 타겟 위치 고정
this.blinkTargetX = player.x;

// 발동 시: 고정된 위치로 이동 후 범위 안에 있으면 타격
if (Math.abs(player.x - this.x) <= BLINK_HIT_RANGE) {
  player.shove(...); // 예고 중 벗어났으면 회피 성공
}

// 구슬도 동일 — 발사 순간 방향 고정
launchOrb(orb, player.x);
```

---

### 공중↔지상 페이즈 전환 중엔 공격을 잠가야 한다

보스가 공중으로 올라가거나 내려오는 동안 패턴이 그대로 작동하면 어색하다 — 공중에 떠 있는 도중에 바닥 장판이 깔리거나, 착지하기 전에 근접 공격이 나가는 것. 전환 중엔 AI를 멈추고, 전환이 끝난 뒤에야 해당 페이즈 패턴을 실행해야 한다.

```ts
toggleFlightPhase(now) {
  this.airborne = !this.airborne;
  this.transitioning = true;
  this.castUntil = now + FLIGHT_TRANSITION_MS; // 이 시간 동안 EnemyManager가 AI 정지
  this.cancelAoe(); this.cancelBeam(); this.cancelOrbs(); // 진행 중인 패턴 취소

  const targetY = this.airborne ? this.hoverCenterY : this.groundedCenterY;
  this.scene.tweens.add({
    targets: this,
    y: targetY,
    onComplete: () => {
      this.transitioning = false;
      this.phaseUntil = now + (this.airborne ? AIR_PHASE_MS : GROUND_PHASE_MS);
    }
  });
}
```

지상 패턴(장판, 가시)은 보스 y좌표가 바닥과 일치할 때만 실행되도록 페이즈로 제한한다.

---

## 버그 패턴

### 지연 콜백은 취소되지 않는다 — 플래그로 무효화해야 한다

`delayedCall`로 예약한 콜백은 취소 명령을 따로 내리지 않으면 상태가 바뀌어도 그냥 실행된다. 구슬 8개를 순차적으로 생성하는 도중 페이즈가 바뀌어 `cancelOrbs()`를 호출해도, 이미 예약된 콜백이 남아있으면 새 구슬을 계속 만들어버린다.

해결: 플래그(`orbsBusy`)를 두고 콜백 맨 앞에서 확인한다. `cancelOrbs()`가 플래그를 끄면 이후 실행되는 콜백들이 전부 조기 종료된다.

```ts
this.scene.time.delayedCall(i * GAP, () => {
  if (!this.active || this.dying || !this.orbsBusy) return; // 취소됐으면 종료
  // ... 구슬 생성
});

cancelOrbs() {
  // ...
  this.orbsBusy = false; // 남은 콜백 전부 무력화
}
```

---

### Arcade 물리 함정 — group.add()는 중력을 다시 켠다

Phaser Arcade 물리에서 `group.add()`로 오브젝트를 그룹에 넣으면 그룹의 기본 설정이 적용되면서 중력이 다시 켜진다. 공중에 떠있어야 하는 보스를 그룹에 추가한 뒤 `allowGravity: false`를 재설정하지 않으면 갑자기 떨어진다.

`setImmovable(true)` 바디는 물리 충돌로 밀리지 않지만, 위치 자체는 직접 `setX()` / `setY()` 또는 tween으로 옮겨야 한다 — 물리 속도(`setVelocity`)가 immovable 바디를 이동시키지 않는다.

```ts
// 그룹에 추가한 뒤 반드시 재설정
group.add(boss);
boss.body.setAllowGravity(false); // 안 하면 떨어짐

// immovable 보스 이동은 직접
boss.setX(targetX); // ✅
boss.setVelocityX(speed); // ❌ immovable이라 안 움직임
```

---

## 툴링

### 프레임 수를 줄이면 fps도 같이 줄여야 한다

스프라이트 애니메이션 프레임을 145장에서 73장(2장마다 1장 추출)으로 줄였더니 애니메이션이 두 배 빠르게 재생됐다. 프레임 수가 절반이 됐으니 같은 fps로 재생하면 절반의 시간 안에 끝나기 때문. 루프 속도를 유지하려면 fps도 같이 절반으로 줄여야 한다.

```ts
// 145프레임 @ fps 24 → 73프레임 @ fps 12
scene.anims.create({ key: "idle", frames: ..., frameRate: 12, repeat: -1 });
```
