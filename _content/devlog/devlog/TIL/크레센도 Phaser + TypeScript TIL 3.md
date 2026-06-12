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
## 🧠 오늘의 TIL (with code)

**1. 데이터 주도 스테이지 — 씬 하나를 데이터로 여러 스테이지로** 씬을 복제하지 않고, `registry`로 현재 스테이지 인덱스를 들고 데이터를 읽어 구성.

```ts
// stages.ts — 스테이지 = 순수 데이터
export interface StageDef { worldScreens:number; floating:[number,number,number][];
  enemies:number[]; ranged?:number[]; chargers?:number[]; rescue:string; }

// GameScene.create
this.stageIndex = this.registry.get("stage") ?? 0;
const stage = STAGES[this.stageIndex];
// 클리어 → 다음 스테이지(로스터 유지) or 최종 결과
const next = this.stageIndex + 1;
next < STAGES.length ? (this.registry.set("stage", next), this.scene.start("GameScene"))
                     : this.scene.start("ResultScene", { result: "clear" });
```

→ registry는 **씬 재시작·전환에도 유지**되는 게 핵심. 진행도/로스터를 여기 둠.

**2. "동시 입력 콤보"는 버퍼링 없이 — 스킬키 누른 순간 Space 상태만 본다** 연달아 치는 콤보가 아니라 동시 입력이라, A 누를 때 Space가 눌려있으면 콤보.

```ts
// InputController.sample(now)
if (attack) this.lastSpaceAt = now;
const comboHeld = this.cursors.space.isDown
  || now - this.lastSpaceAt <= GameConfig.combat.comboWindowMs;
// GameScene: 스킬 누름 + comboHeld → fireCombo (volley)
```

→ Space를 버퍼링(지연)하지 않아 일반 공격은 즉각 반응. "A 활성화 시에만 윈도우 평가".

**3. 다단계 텍스트는 디바운스 — 최종 단계만** DOUBLE→TRIPLE→QUAD가 줄줄이 뜨던 것 → 마지막 입력 후 한 번만.

```ts
this.comboDisplayAt = time + 200;        // 입력마다 뒤로 미룸
// update: 잠잠해지면 1회 표시
if (this.comboDisplayAt && time >= this.comboDisplayAt) {
  this.showComboText(this.comboIdxs.size + 1); this.comboDisplayAt = 0;
}
```

**4. 컷인 = 물리 히트스톱 + 줌 (단, 흰 플래시는 가린다)**

```ts
this.cutInUntil = now + 220;
this.physics.world.pause();          // 히트스톱(스킬 발사 후 정지→해제)
cam.zoomTo(1.4, 90); cam.shake(220, 0.004);
this.time.delayedCall(220, () => { this.physics.world.resume(); cam.zoomTo(1, 200); });
// update 맨 위: if (time < this.cutInUntil) return;
```

→ ⚠️ `cam.flash(흰색)`은 **텍스트·이펙트를 다 덮어버림** → 흔들림으로 대체. `delayedCall`은 물리 pause와 무관하게 돈다(scene.time).

**5. 적 투사체는 별도 그룹 + 플레이어 overlap (피아 구분)**

```ts
this.shots = scene.physics.add.group({ allowGravity: false }); // 적 탄(직선)
scene.physics.add.overlap(player, this.shots, this.onShotHit); // 하민만 맞음
// 컴패니언 투사체는 enemyGroup과 overlap — 그룹을 나눠 피아 구분
```

**6. "죽는 중" 상태 — active만으론 부족, body.enable로 거른다** 죽는 애니 재생 중인 적(`active=true`지만 `dying`)을 미사일이 계속 조준하던 버그.

```ts
startDying() { this.dying = true; this.body.enable = false; /* death anim → destroy */ }
// 타겟/AoE: if (!enemy.active || !enemy.body.enable) continue;  // 죽는 중 제외
```

**7. immovable 바디는 collideWorldBounds가 안 잡는다 → 수동 클램프** _(어제도 나온 함정, 재확인)_ 보스를 solid(immovable)로 만드니 넉백에 맵 밖으로 날아가 안 돌아옴.

```ts
boss.setImmovable(true); scene.physics.add.collider(player, boss); // 겹침 방지
// 매 프레임 월드 경계 클램프(immovable은 경계 처리 안 됨)
if (boss.x > b.right - m) { boss.setX(b.right - m); boss.setVelocityX(0); }
```

**8. 멀티 스폰 타입은 opts 객체로 (boolean 인자 늘리지 말 것)**

```ts
// before: spawn(x, y, ranged=false)  → 타입 늘 때마다 인자 추가/혼란
spawn(x, y, opts: { ranged?: boolean; charger?: boolean } = {}) { ... }
```

**9. 컴패니언 비주얼 = 물리/위치와 분리 + 데이터 주도 스프라이트** 박스 컴패니언에 스프라이트를 얹되, 멤버 데이터에 폴더만 적으면 자동 로드.

```ts
// MemberDef.sprite?: { dir; count; fps }  — 있으면 박스 숨기고 idle 애니
static createAnimations(scene){ for (const m of MEMBERS) if (m.sprite) scene.anims.create(...) }
// 트레일(브레드크럼)이 idle 때 겹쳐서 → 대형 정렬로 변경
c.followTo(player.x - facing * SPACING_X * (i+1), player.y + FOOT_ALIGN_Y);
```

→ 발 높이 맞춤: 하민(48)·컴패니언(36) 반높이 차 `(48-36)/2`만큼 보정.

**10. 한 캐릭터 다른 동작은 "busy 플래그"로 트레일 일시 이탈** 은호가 적에게 달려들었다 복귀할 때, 추종 시스템이 위치를 덮어쓰지 않게.

```ts
// 스크래치: 트윈으로 럭지 + 그동안 follow 스킵
c.setBusy(now, SCRATCH_MS);
this.scene.tweens.add({ targets: c, x: tx, yoyo: true, onYoyo: () => /* 타격 */ });
// CompanionManager: if (c.isBusy(now)) return;  // 그동안 추종 안 함
```

---

## 🛠 작업 흐름 TIL (반복된 것)

- **에셋 워크플로**: 원본(`assets/`, 대용량/3D) → 게임용(`public/`, 높이 192 리사이즈). 런타임 로드는 `public/`만.
- **프레임 낱장**: 연속 번호(0001,0002…)여야 로더가 바로 읽음. 띄엄띄엄/접두사 붙으면 정렬해 재작성 필요.
- **PowerShell 함정**: 커밋 메시지에 `"`(큰따옴표) 넣으면 here-string 깨짐 → 따옴표 없이. `Remove-Item`은 샌드박스에서 막힘 → `git rm` 또는 sandbox 해제.