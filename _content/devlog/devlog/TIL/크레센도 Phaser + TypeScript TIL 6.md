---
layout: post
title: 크레센도 Phaser + TypeScript TIL 6
date: 2026-07-01
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

### 씬 인스턴스는 재사용된다 — 한 번만 만드는 필드는 재시작 때 반드시 리셋

Phaser는 씬을 재시작해도 같은 클래스 인스턴스를 재사용한다. `create()`는 다시 불리지만, 클래스 필드에 남아 있던 값은 그대로 살아있다. 그래서 "없으면 만든다"는 지연 생성 패턴이 재시작에서 터진다.

배경 이미지를 이렇게 한 번만 만들고 재사용하고 있었는데,

```ts
private applyBackground(key: string): void {
  if (!this.bg) {
    this.bg = this.add.image(0, 0, key);  // 최초 1회만 생성
  }
  this.bg.setTexture(key).setScale(...);   // 이후엔 텍스처만 교체
}
```

한 판 끝나고 씬이 shutdown되면 `this.bg`가 가리키던 이미지 객체는 파괴되지만 `this.bg` 참조는 남는다. 두 번째 시작 때 `if (!this.bg)`가 false라 새로 안 만들고, 파괴된 객체에 `setTexture`를 부르며 죽는다.

```
Uncaught TypeError: Cannot read properties of undefined (reading 'sys')
    at Image.setTexture
    at GameScene.applyBackground
```

해결은 `create()` 초기화 블록에서 참조를 비워주는 것. 그러면 재시작마다 새 이미지를 만든다.

```ts
create() {
  this.bg = undefined; // 파괴된 객체 참조 제거 → 지연 생성이 다시 동작
  // ...
}
```

교훈: `if (!this.x)`로 게이트하는 필드는 재시작 시 리셋 목록에 반드시 넣는다. 매 프레임 무조건 재할당되는 필드는 괜찮지만, "한 번만 만드는" 필드가 함정이다.

---

### 씬 전환은 입력 이벤트 콜백 안에서 하지 말고 update 플래그로

보스 처치 후 "아무 키나 누르면 다음 스테이지로" 를 이렇게 입력 이벤트에 직접 걸었더니, 키를 눌러도 넘어가지 않았다.

```ts
// ❌ 입력 이벤트 안에서 바로 씬 전환
this.input.keyboard?.once("keydown", () => this.clearStage());
this.input.once("pointerdown", () => this.clearStage());
```

입력 이벤트 핸들러 안에서 씬을 정지·재시작하면 다른 키 리스너(ESC/P 일시정지 등)와 겹쳐 꼬이거나 재진입 문제가 생긴다. 대신 플래그만 세우고, 실제 전환은 `update()` 루프에서 처리하면 깔끔하다.

```ts
// ✅ 플래그만 세우고
this.awaitingContinue = true;

// update()에서 입력을 폴링해 전환
if (this.awaitingContinue) {
  const input = this.controller.sample(time);
  const pressed = input.jump || input.attack || input.moveX !== 0
    || input.skills.some(Boolean) || this.input.activePointer.isDown;
  if (pressed) { this.awaitingContinue = false; this.clearStage(); }
  return;
}
```

덤으로, 같은 씬을 다시 시작할 때는 `this.scene.start("같은키")`보다 `this.scene.restart()`가 정석이다. (다른 씬으로 갈 때만 `start(key)`.)

---

## 게임 느낌

### 컷신 동안 오브젝트를 진짜로 멈추려면 `body.moves = false`

보스가 죽고 전환 연출이 도는 동안 보스가 옆으로 미끄러지는 버그가 있었다. 죽는 순간 `setVelocity(0, 0)`을 불렀는데도 계속 밀렸다 — 죽기 직전 프레임에 세팅된 추적 속도가 물리 스텝에 남아 있었기 때문.

속도를 0으로 만드는 것보다 확실한 건, 그 바디의 위치 적분을 아예 끄는 것이다. Arcade Body의 `moves`를 false로 두면 속도·중력과 무관하게 위치가 고정된다.

```ts
// 컷신 진입 — 위치 완전 고정
this.setVelocity(0, 0);
(this.body as Phaser.Physics.Arcade.Body).moves = false;

// 컷신 종료 — 물리 재개
(this.body as Phaser.Physics.Arcade.Body).moves = true;
```

"멈춘 위치"를 연출에서 참조할 거라면, 그 좌표를 죽는 순간에 스냅샷으로 저장해두면 이후 로직이 흔들리지 않는다.

```ts
this.struckX = this.x; // HP 0이 된 그 자리를 고정 → 빛도 여기, 부활도 여기
this.struckY = this.y;
```

---

### 연출의 "단계 사이 텀"은 onComplete + delayedCall(hold)로

빛 기둥이 내려오는 연출에서, 빛이 완전히 착지한 뒤에 임팩트(화면 흔들림·배경 교체)가 오길 원했다. 트윈이 끝나는 순간 바로 임팩트를 넣으면 둘이 붙어서 급해 보인다.

트윈의 `onComplete`에서 다시 `delayedCall`로 짧은 텀을 두면, "완료 → 잠깐 유지 → 다음 단계" 순서가 확실하게 보장된다.

```ts
this.tweens.add({
  targets: pillar, scaleY: 1, duration: PILLAR_GROW, ease: "Sine.easeIn",
  onComplete: () => {
    this.time.delayedCall(PILLAR_HOLD, () => {  // 착지 후 잠깐 유지
      cam.shake(...); cam.flash(...);
      this.boss?.hidePhase1();                  // 그 다음 임팩트
    });
  },
});
```

타임라인이 길어지면 각 시점을 매직넘버로 흩뿌리지 말고 이름 있는 상수로 모아두면, 템포를 조절할 때 숫자 하나만 만지면 된다.

---

### 공격 연타는 "쿨다운을 타격 판정창 끝"에 맞추면 손실이 없다

공격 쿨다운이 애니 길이(700ms)와 같으면 애니가 다 끝나야 다음 공격이 나가서 연타가 안 된다. 그렇다고 쿨다운을 너무 짧게 하면, 타격 판정이 들어가기 전에 다음 공격이 캔슬돼 데미지가 새어나간다.

타격 판정 구간이 공격 시작 후 약 140~385ms라면, 쿨다운을 그 판정창이 끝나는 지점(≈400ms)에 맞추면 매 타가 확실히 명중한 뒤 다음 공격으로 이어진다.

```ts
attackDurationMs: 700,   // 애니 전체 길이
attackCooldownMs: 400,   // 타격창 종료(~385ms) 직후 재공격 → 손실 없는 연타
```
