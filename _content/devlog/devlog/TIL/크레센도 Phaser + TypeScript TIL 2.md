---
layout: post
title: 크레센도 Phaser + TypeScript TIL 2
date: 2026-06-08
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
## Phaser 물리 / 충돌

### `setImmovable(true)` 바디는 `collideWorldBounds`가 위치를 안 잡아준다

보스를 solid하게(통과 못하게) 만들려고 `setImmovable(true)`를 설정했다. immovable은 "충돌해도 밀리지 않는다"는 뜻인데, 문제는 `setCollideWorldBounds(true)` — 맵 경계 밖으로 나가지 못하게 하는 설정 — 이 immovable 바디에는 작동하지 않는다. 그래서 하민이 보스를 치면 보스가 맵 밖으로 날아가 돌아오지 않았다.

해결: 매 프레임 update에서 위치를 직접 제한(수동 클램프).

```ts
const b = this.scene.physics.world.bounds; // 맵 경계 정보
const m = 10; // 여유 마진
if (enemy.x < b.x + m) {
  enemy.setX(b.x + m);        // 왼쪽 경계 밖으로 나가면 강제로 끌어옴
  enemy.setVelocityX(0);      // 속도도 0으로 (다시 튀어나가지 않게)
} else if (enemy.x > b.right - m) {
  enemy.setX(b.right - m);    // 오른쪽 경계도 동일
  enemy.setVelocityX(0);
}
```

---

### "밀리지 않는 solid"는 immovable + collider 조합

Phaser 충돌에는 두 종류가 있다:

- `physics.add.overlap()` — 겹쳐도 통과. 겹침 감지만 함 (히트박스 판정 등에 사용)
- `physics.add.collider()` — 통과 못 함. 서로 밀어냄

보스만 단단하게(통과·밀기 X)하고 잡몹은 통과 유지하고 싶을 때:

```ts
boss.setImmovable(true);                        // 보스는 충돌해도 안 밀림
scene.physics.add.collider(this.player, boss);  // 하민이 보스를 통과 못 함
// 잡몹은 collider를 안 걸면 그대로 통과
```

`setImmovable`만으로는 "밀리지 않는" 것이고, `collider`까지 추가해야 "통과도 못 하는" 것이 된다.

---

### "튀어나감" 버그는 대부분 경계 미처리

점프, 넉백, 밀림 등 "어디론가 날아가는" 버그를 만나면 월드 경계 또는 아레나 경계 클램프가 빠진 경우가 많다. 버그를 보면 먼저 경계 처리 여부를 의심할 것.

---

### Phaser 충돌은 "관계" 시점, UE5 충돌은 "오브젝트" 시점

UE5에서 충돌을 설정할 때는 각 오브젝트가 "나는 Pawn 채널에 Overlap으로 반응한다"고 스스로 선언한다. 새 오브젝트를 추가해도 채널만 맞으면 자동으로 반응한다.

Phaser는 반대로 바깥에서 쌍을 연결한다. `physics.add.collider(player, boss)` — "이 둘은 충돌하면 막힌다"를 직접 지정하는 것. 새 오브젝트가 생길 때마다 관계를 명시적으로 추가해야 한다.

| 구분     | 누가 선언하나         | 새 오브젝트 추가 시   |
| ------ | --------------- | ------------- |
| UE5    | 오브젝트 자신 (채널 설정) | 채널만 맞으면 자동 반응 |
| Phaser | 외부에서 쌍으로 연결     | 관계를 직접 추가해야 함 |

개념은 같다(Block = collider, Overlap = overlap, Ignore = 아무것도 안 걸기). 표현 방식만 다르다.

---

## 아키텍처 / 게임 느낌

### 개체별 동작 차이는 게터 오버라이드로 (TIL 1 복습)

TIL 1에서도 나왔지만 이번에 직접 적용하면서 다시 확인. 보스의 넉백을 잡몹보다 약하게 하고 싶을 때 Boss 클래스에서 `knockbackX`만 다르게 정의하면 된다. 나머지 로직은 Enemy에서 그대로 재사용.

```ts
// Enemy (부모)
protected get knockbackX() { return GameConfig.enemy.hitKnockbackX; }

// Boss (자식)
protected override get knockbackX() { return GameConfig.boss.hitKnockbackX; } // 약하게
```

---

### 보스 패턴은 "거리"가 아니라 "교전 상태(flag)"로 켠다

처음엔 보스와 하민의 거리가 560px 이내일 때 바닥 장판을 발동시켰다. 문제는 보스 아레나에 진입하기 전에 가까이만 가도 장판이 깔리는 것. 거리는 "아레나에 진입했냐"를 보장하지 못한다.

해결: 아레나 진입 이벤트에서 플래그를 켜고, 패턴은 플래그 기준으로만 작동하게.

```ts
// EnemyManager
setBossActive(v: boolean) { this.bossActive = v; }

// update 안에서
if (this.bossActive) boss.tickAoe(...); // 플래그가 켜져야만 장판 발동

// GameScene — 아레나 진입 컷신 끝난 직후에만 활성화
engageArena() {
  // 컷신 연출...
  this.enemies.setBossActive(true);
}
```

"언제 켜야 하는가"를 거리가 아니라 게임 이벤트(아레나 진입)로 정의한 것.

---

### "확정 공격(commit)"은 공격 중 이동을 막아 만든다

공격 버튼을 누른 채로 이동하면 스케이트 타듯 미끄러지면서 공격 범위를 지나쳐 버려 타격이 안 들어갔다. 공격 모션이 재생되는 동안에는 수평 이동을 막으면 제자리에서 휘두르는 느낌이 된다.

```ts
if (attacking) {
  this.setVelocityX(0);    // 방향키를 눌러도 제자리
} else {
  // 평소 이동 로직
}
// 공격 시작 프레임에 누른 방향으로 facing을 고정해두면
// 공격하는 방향이 흔들리지 않음
```

---

### 도주(flee) = AI 끄고 속도만 주고 타이머로 소멸

보스 아레나 진입 시 잡몹이 화면 밖으로 퇴장해야 한다. 기존 AI(추격·순찰)를 끄고 특정 방향으로 속도를 주면, 잡몹이 직선으로 달려나가 화면 밖에서 destroy된다.

문제: 하민이 왼쪽에서 오므로 부딪힌 잡몹이 우측으로 튕기며 보스 방향으로 도망갈 수 있었다. 보스와 아레나가 우측에 있으므로 항상 왼쪽(-1)으로 도망가도록 방향을 명시적으로 지정해야 한다.

```ts
// Enemy
private fleeing = false;

flee(dir: 1 | -1) {
  this.fleeing = true;
  this.attackUntil = 0;              // 공격 중이면 중단
  this.setVelocityX(dir * speed * 1.6); // 평소보다 빠르게 도주
  this.fleeEndAt = now + 2500;       // 2.5초 후 destroy
}

chase() {
  if (this.fleeing) return;          // 도주 중엔 AI 정지
  // 평소 추격 로직...
}

// EnemyManager
fleeAll(awayFromX: number) {
  for (const e of enemies) {
    if (e instanceof Boss || !e.active) continue;
    e.flee(e.x < awayFromX ? -1 : 1); // 하민 반대 방향으로
  }
}

// GameScene.engageArena() 끝에
this.enemies.fleeAll(this.player.x);
```

---

### 충돌 판정과 비주얼은 독립

히트박스(충돌 판정)는 항상 그 자리에 있지만, 비주얼(스프라이트)이 안 보여도 충돌은 그대로 작동한다. `setVisible(false)`로 숨겨도 `getBounds()`나 충돌 계산은 유지된다. 타격 이펙트(FX)를 나중에 붙일 자리를 미리 판정 박스 기준으로 잡아두면 된다.
