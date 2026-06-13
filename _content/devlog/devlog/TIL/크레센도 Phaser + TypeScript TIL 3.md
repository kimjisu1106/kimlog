---
layout: post
title: 크레센도 Phaser + TypeScript TIL 3
date: 2026-06-09
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

### 씬 하나를 데이터로 여러 스테이지로

Phaser에서 씬(Scene)은 게임의 화면 단위다 — 타이틀 화면, 게임 화면, 결과 화면이 각각 하나의 씬이다. UE5의 레벨과 같은 개념으로, 씬이 전환되면 기존 오브젝트가 전부 날아가고 새로 초기화된다.

스테이지는 게임 내 진행 단계 개념으로, 씬과는 다르다. S1, S2, S3은 같은 "게임 화면(씬)"이지만 적 구성과 맵이 다른 것이다. 스테이지마다 씬을 따로 만들면 파일이 계속 늘어나기 때문에, 씬은 하나만 두고 현재 스테이지 번호를 데이터로 넘겨 씬이 그걸 읽어 구성하는 방식을 택했다.

씬 전환 시 상태가 사라지기 때문에, 스테이지 진행도나 합류한 컴패니언처럼 씬을 넘어서도 유지돼야 하는 데이터는 `registry`에 저장한다. UE5의 Game Instance와 같은 역할이다.

```ts
// stages.ts — 스테이지 = 순수 데이터
export interface StageDef {
  worldScreens: number;
  enemies: number[];
  ranged?: number[];
  chargers?: number[];
  rescue: string; // 이 스테이지 클리어 시 합류하는 컴패니언
}

// GameScene.create
this.stageIndex = this.registry.get("stage") ?? 0;
const stage = STAGES[this.stageIndex];

// 클리어 시: 다음 스테이지로 or 최종 결과
const next = this.stageIndex + 1;
next < STAGES.length
  ? (this.registry.set("stage", next), this.scene.start("GameScene"))
  : this.scene.start("ResultScene", { result: "clear" });
```

---

## 전투 / 입력

### 동시 입력 콤보는 버퍼링 없이 — 누른 순간 Space 상태만 본다

2인 협동 공격은 Space(하민 공격) + A(노아 스킬)를 동시에 눌렀을 때 발동된다. "연속으로 누르는 콤보"가 아니라 "같이 눌린 상태"를 보는 것이라, 복잡한 버퍼링 없이 단순하게 구현할 수 있다.

A를 누르는 순간 Space가 눌려있으면(또는 직전에 눌렸으면) 협동 공격 발동. Space를 약간 먼저 눌렀더라도 짧은 윈도우 안이면 인정해준다.

```ts
// InputController.sample(now)
if (attack) this.lastSpaceAt = now;

const comboHeld =
  this.cursors.space.isDown ||
  now - this.lastSpaceAt <= GameConfig.combat.comboWindowMs;

// GameScene: 스킬 누름 + comboHeld → 협동 공격 발동
```

Space를 버퍼링하지 않기 때문에 일반 공격은 지연 없이 즉각 반응한다.

---

### 다단계 협동 공격 텍스트는 디바운스 — 마지막 단계만 표시

2인, 3인, 4인 협동 공격을 빠르게 누르면 DOUBLE → TRIPLE → QUAD 텍스트가 연달아 떴다. 마지막 단계 텍스트만 보여야 하는데 중간 단계까지 다 표시된 것.

디바운스로 해결 — 입력이 들어올 때마다 표시 시점을 살짝 뒤로 미루고, 더 이상 입력이 없으면 그때 한 번만 표시한다. 타이핑할 때 검색어를 매 글자마다 검색하지 않고 입력이 멈추면 검색하는 것과 같은 원리다.

```ts
// 입력마다 표시 시점을 200ms 뒤로 미룸
this.comboDisplayAt = time + 200;

// update: 잠잠해지면 1회 표시
if (this.comboDisplayAt && time >= this.comboDisplayAt) {
  this.showComboText(this.comboIdxs.size + 1);
  this.comboDisplayAt = 0;
}
```

---

### 컷인 = 히트스톱 + 줌 + 흔들림 (흰 플래시는 텍스트를 덮는다)

트리플 이상 협동 공격 시 연출을 넣었다. 히트스톱(물리 일시정지) + 카메라 줌 + 화면 흔들림 조합.

처음엔 흰 플래시(`cam.flash`)도 넣었는데, 플래시가 화면 전체를 하얗게 덮어버려서 동시에 표시되는 텍스트와 이펙트가 전부 안 보였다. 흔들림으로 대체.

`physics.world.pause()`로 물리를 멈춰도 `scene.time.delayedCall`은 계속 작동한다 — 타이머는 물리 엔진과 별개로 돌기 때문. 그래서 일정 시간 후 물리를 다시 재개하는 코드가 정상적으로 실행된다.

```ts
this.cutInUntil = now + 220;
this.physics.world.pause();           // 물리 일시정지 (히트스톱)
cam.zoomTo(1.4, 90);
cam.shake(220, 0.004);

this.time.delayedCall(220, () => {
  this.physics.world.resume();
  cam.zoomTo(1, 200);
});

// update 맨 위: 컷인 중엔 나머지 로직 건너뜀
if (time < this.cutInUntil) return;
```

---

## 물리 / 충돌

### 적 투사체는 별도 그룹으로 — 피아 구분

원거리 잡몹이 쏘는 탄환은 하민에게만 맞고, 컴패니언이 쏘는 탄환은 적에게만 맞아야 한다. 같은 탄환 타입이라도 누가 쐈느냐에 따라 맞는 대상이 달라진다.

Phaser에서 이걸 구분하는 방법은 그룹을 나누는 것 — 적 탄환 그룹은 플레이어와 overlap, 아군 탄환 그룹은 적 그룹과 overlap으로 연결한다.

```ts
// 적 탄환 그룹 (중력 영향 없음)
this.shots = scene.physics.add.group({ allowGravity: false });

// 적 탄은 하민만 맞음
scene.physics.add.overlap(player, this.shots, this.onShotHit);

// 아군 탄은 적 그룹과 overlap — 따로 연결
```

---

### `active`만으론 부족할 때 — `body.enable`로 죽는 중 상태 처리

적이 죽는 애니메이션을 재생하는 동안, 미사일이 그 적을 계속 추적하는 버그가 있었다. `active`는 아직 `true`인데(아직 destroy 전이라), 타겟 선정 로직이 걸러내지 못한 것.

`body.enable = false`로 물리 바디를 비활성화하면 충돌·타겟 판정에서 제외된다. 죽는 애니가 끝나면 `destroy()`.

```ts
startDying() {
  this.dying = true;
  this.body.enable = false; // 물리 바디 비활성화 → 타겟·충돌에서 제외
  // 죽는 애니 완료 후 destroy
}

// 타겟/AoE 선정 시
if (!enemy.active || !enemy.body.enable) continue; // 죽는 중 제외
```

---

## 아키텍처

### 스폰 타입이 늘어나면 boolean 인자 말고 opts 객체로

`spawn(x, y, ranged, charger, flying, ...)` 처럼 boolean 인자가 늘어나면 호출하는 쪽에서 `spawn(100, 200, false, true, false)` 같이 순서를 외워야 한다. 타입이 하나 추가될 때마다 기존 호출부를 전부 수정해야 하기도 하다.

opts 객체로 바꾸면 필요한 것만 명시하면 되고, 나중에 타입이 추가돼도 기존 호출부는 건드리지 않아도 된다.

```ts
// before: 타입 늘 때마다 인자 추가
spawn(x, y, ranged = false)

// after: 필요한 것만 넘김
spawn(x, y, opts: { ranged?: boolean; charger?: boolean } = {}) { ... }
```

---

### 컴패니언 비주얼은 물리와 분리 + 데이터로 스프라이트 자동 로드

컴패니언은 물리 박스(위치·충돌 담당)에 스프라이트를 얹는 구조다. 캐릭터마다 스프라이트가 있냐 없냐, 어떤 애니메이션을 쓰냐를 멤버 데이터에 정의해두면 코드를 건드리지 않고 스프라이트를 추가할 수 있다.

발 높이 맞춤도 여기서 처리 — 하민 스프라이트(48px)와 컴패니언 스프라이트(36px)의 반높이 차이만큼 y 오프셋을 보정한다.

```ts
// MemberDef.sprite?: { dir; count; fps } — 있으면 박스 숨기고 idle 애니
static createAnimations(scene) {
  for (const m of MEMBERS) if (m.sprite) scene.anims.create(...)
}

// 대형 정렬 (하민 뒤로 일렬)
c.followTo(
  player.x - facing * SPACING_X * (i + 1),
  player.y + FOOT_ALIGN_Y  // (48-36)/2 보정
);
```

---

### 독립 행동 중엔 추종을 멈춰야 한다 — busy 플래그

은호가 적에게 달려가 스크래치 공격을 하고 복귀하는 동안, 추종 시스템이 "은호는 하민 뒤에 있어야 해"라며 위치를 계속 덮어써서 공격 모션이 망가지는 버그가 있었다.

`setBusy()`로 특정 시간 동안 추종을 잠시 끄면 해결된다. 은호가 독립 행동을 마치고 복귀하면 다시 추종 시스템으로 돌아온다.

```ts
// 스크래치 발동 시
c.setBusy(now, SCRATCH_MS);
this.scene.tweens.add({
  targets: c,
  x: targetX,
  yoyo: true,                       // 갔다가 돌아옴
  onYoyo: () => { /* 타격 처리 */ }
});

// CompanionManager.update()
if (c.isBusy(now)) return; // busy 중엔 추종 건너뜀
```

---

## 툴링

### 스프라이트 프레임은 연속 번호여야 한다

Phaser의 이미지 시퀀스 로더는 파일명이 `0001.png`, `0002.png`처럼 연속 번호여야 순서대로 읽는다. 번호가 띄엄띄엄이거나 접두사가 붙어있으면 순서가 뒤섞이거나 로드가 안 된다.

Mixamo에서 받은 애니메이션이 150프레임이라 너무 많아서 2프레임마다 한 장씩 추출했더니 `0001.png`, `0003.png`, `0005.png`... 처럼 홀수만 나왔다. 이 경우 파일을 정렬해서 `0001`, `0002`, `0003`으로 재작성해야 Phaser가 정상적으로 읽는다.
