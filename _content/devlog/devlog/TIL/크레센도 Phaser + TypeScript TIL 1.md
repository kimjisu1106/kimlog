---
layout: post
title: 크레센도 Phaser + TypeScript TIL 1
date: 2026-06-07
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
## Phaser 물리

### arcade 그룹에 add하면 중력 설정이 덮어써진다

Phaser의 물리 그룹은 소속된 오브젝트에 기본값을 일괄 적용한다. 문제는 `group.add()`가 호출될 때 그 기본값(기본: 중력 ON)이 오브젝트의 기존 설정을 덮어쓴다는 것. 투사체처럼 중력이 없어야 하는 오브젝트를 생성자에서 `setAllowGravity(false)` 해놔도, `group.add()` 직후 다시 중력이 켜진다 → 포물선으로 떨어지는 버그.

```ts
// 해결 1: 그룹 자체를 중력 OFF로 생성
this.projectiles = scene.physics.add.group({ allowGravity: false });

// 해결 2: 발사 시점마다 재확정 (가장 확실)
fire() {
  this.body.setAllowGravity(false);
  // ...
}
```

---

### one-way 발판 (위에서만 충돌)

Phaser StaticBody는 상하좌우 각 방향의 충돌을 개별로 켜고 끌 수 있다. 위만 `true`로 두면 발판을 아래서 점프해서 통과하고 위에서 착지하는 "위에서만 충돌"이 된다.

```ts
// TypeScript에서 `as`는 타입 단언(type assertion) —
// "이 값이 이 타입이야"라고 컴파일러에게 알려주는 것.
// rect.body의 타입이 기본적으로 넓게 잡혀 있어서, 좁혀줘야 세부 프로퍼티에 접근 가능.
const body = rect.body as Phaser.Physics.Arcade.StaticBody;

body.checkCollision.down = false;
body.checkCollision.left = false;
body.checkCollision.right = false;
// 위(up)만 true(기본값)로 남김 → 위에서만 착지, 아래/옆은 통과
```

---

### 넉백 면역은 인스턴스 게터 오버라이드로

TypeScript 클래스는 상속이 된다. `Boss extends Enemy`면 Boss는 Enemy를 기반으로 만들어진 것. `override`로 부모의 메서드·프로퍼티를 자식에서 다르게 정의할 수 있다.

`get knockbackX()`는 getter — 프로퍼티처럼 읽히지만(`boss.knockbackX`) 실제로는 함수가 실행되는 것.

```ts
// Enemy 클래스 (부모)
// protected = 이 클래스와 자식 클래스에서만 접근 가능
protected get knockbackX() {
  return GameConfig.enemy.hitKnockbackX; // 잡몹은 맞으면 밀림
}

// Boss 클래스 (자식, Enemy를 상속)
// override = 부모의 knockbackX를 덮어쓴다고 명시 (TypeScript에서 권장)
protected override get knockbackX() {
  return 0; // 보스는 안 밀림
}
```

이렇게 하면 "맞으면 밀림" 로직은 Enemy에 하나만 두고, 보스만 예외로 처리할 수 있다.

---

## 스프라이트 / 애니메이션

### 물리 바디와 비주얼을 분리하면 정렬이 자유롭다

Phaser의 Physics 오브젝트는 네모난 히트박스(물리 바디)를 기준으로 위치가 결정된다. 그런데 스프라이트 그림은 공격 모션처럼 팔이 뻗으면 가로가 훨씬 넓어지기도 한다. 바디와 그림을 1:1로 묶으면 그림 크기가 달라질 때마다 히트박스도 이상해진다.

해결: 히트박스(바디)는 32×48 고정으로 두고, 그림(animSprite)은 별도 Sprite로 만든 뒤 매 프레임 발 위치만 맞춰준다.

```ts
// setOrigin(0.5, 1) = 스프라이트의 기준점을 "가로 중앙, 세로 맨 아래(발)"로 설정
this.animSprite = scene.add.sprite(x, y, frame).setOrigin(0.5, 1);

// 매 프레임 update에서: 발을 바디 바닥에 정렬
// this.y = 바디 중심Y, SIZE.h/2 = 바디 높이의 절반 → 바디 하단
this.animSprite.setPosition(this.x, this.y + SIZE.h / 2);
```

---

### 프레임 폭이 제각각이면 "높이 기준 균등 스케일"

공격 모션(발차기)은 팔다리가 뻗어서 가로가 훨씬 넓다. 가로 크기를 고정하면 모션마다 찌그러진다. 높이만 고정하고 가로는 원본 비율 그대로 두면 자연스럽게 표시된다.

```ts
// CHAR_DISPLAY_H: 화면에 표시할 목표 높이 (예: 80px)
// FRAME_H: 원본 프레임 높이 (예: 48px)
const CHAR_SCALE = CHAR_DISPLAY_H / FRAME_H; // 배율 계산
this.animSprite.setScale(CHAR_SCALE); // 가로세로 같은 배율로 적용 → 비율 유지
```

---

### 낱장 프레임으로 애니 만들기 (시트 없이)

스프라이트 시트(여러 프레임이 한 이미지에 붙어있는 것) 대신 낱장 PNG 여러 개를 받았을 때. Phaser에서 개별 이미지로 애니메이션을 만드는 방법.

```ts
const frames = [];
for (let i = 1; i <= count; i++) {
  // setFilter: 이미지를 작게 축소해서 렌더할 때 픽셀이 뭉개지지 않게
  scene.textures.get(key(i)).setFilter(Phaser.Textures.FilterMode.LINEAR);
  frames.push({ key: key(i) }); // 각 낱장 이미지를 프레임으로 추가
}
// key: 애니 이름, frameRate: 초당 프레임 수, repeat: -1 = 무한반복
scene.anims.create({ key: "run", frames, frameRate: 24, repeat: -1 });
```

---

### 그림 기본 방향이 섞이면 flip 버그

AI가 그려준 스프라이트 중 hurt 동작만 왼쪽을 바라보고 있었다. 코드에서 `setFlipX(facing < 0)` — 왼쪽을 볼 때 가로 반전 — 으로 방향을 처리하는데, 기본 방향이 오른쪽인 프레임에 적용하면 왼쪽일 때 반전→왼쪽, 오른쪽일 때 그대로→오른쪽. 반대로 기본이 왼쪽인 hurt 프레임에 적용하면 왼쪽일 때 반전→오른쪽으로 보임.

→ 모든 스프라이트는 오른쪽 기본 방향으로 통일할 것.

---

## 수학

### 점프 높이는 속도의 제곱에 비례

물리 공식: 최대 높이 h = v² / 2g

높이를 90%로 줄이고 싶으면 속도를 90%로 줄이면 안 된다. 높이가 속도의 제곱에 비례하므로:

- 높이를 90%로 → 속도를 √0.9 ≈ 0.948배로
- 예) `360 → 342` (360 × 0.948)

90%를 0.9 곱했다가 점프가 훨씬 낮아져서 깨달은 것.

---

### 중력 고려 탄도 조준

노아가 쏘는 화살이 날아가는 동안 중력에 끌려 아래로 꺾인다. 적을 조준할 때 현재 위치가 아니라 "화살이 날아가는 시간 후 적의 위치"를 겨냥해야 맞는다.

```ts
const t = Math.abs(dx) / speed; // 수평 거리 ÷ 속도 = 비행시간
const vx = dx / t;              // 수평 속도 (부호가 방향)
const vy = dy / t - 0.5 * g * t; // 중력 보정: 비행 중 떨어질 만큼 위로 더 쏨
```

---

## 아키텍처 / 게임 느낌

### 타격 판정은 애니 전체가 아니라 "타격 구간"에만

공격 버튼을 누르면 애니메이션이 재생된다. 처음엔 애니 재생 중 내내 히트박스를 켜뒀더니, 주먹을 다 휘두르고 팔을 내리는 도중에 들어온 적도 맞는 버그가 생겼다. 실제로 "주먹이 뻗는" 구간(전체 시간의 20%~55%)에만 판정을 켜야 자연스럽다.

```ts
isHitActive(now) {
  const t = now - this.lastAttackAt; // 공격 시작 후 경과 시간
  return t >= dur * 0.2 && t < dur * 0.55; // 가운데 구간만 판정 ON
}
```

---

### 같은 휘두름에 중복 타격 방지 (swing dedup)

판정 구간 동안 매 프레임 체크가 돌아가므로, 한 번 휘두를 때 60fps라면 이론상 수십 번 맞을 수 있다. 마지막으로 맞은 스윙 시각을 기록해두고, 같은 스윙이면 무시한다.

```ts
receiveHit(swingTime, dmg) {
  if (swingTime <= this.lastHitSwing) return; // 이미 이 스윙에 맞았으면 무시
  this.lastHitSwing = swingTime;
  // 실제 피해 처리
}
```

---

### 전역 데미지는 거리 게이트 필수

보스의 전체공격(바닥 장판)이 활성화되면 맵 어디서든 하민이 피해를 받던 버그. 전체공격이라도 "보스 근처"일 때만 맞아야 자연스럽다.

```ts
// 보스 위치와 플레이어 위치의 수평 거리가 aoeRangeX 이내일 때만 피해
if (Math.abs(player.x - this.x) > cfg.aoeRangeX) return;
```

---

### 씬 인스턴스는 재시작 시 재사용

Phaser는 `scene.restart()`를 호출해도 씬 클래스 인스턴스를 새로 만들지 않는다. `create()` 메서드만 다시 실행된다. 따라서 인스턴스 변수에 저장된 상태가 재시작 후에도 남아있다. 게임오버 후 리트라이했는데 보스가 이미 처치된 상태로 시작하거나, 구출 플래그가 켜진 채로 시작하는 버그가 이 때문이다.

```ts
create() {
  // 재시작할 때마다 수동으로 초기화
  this.rescued = false;
  this.gameEnded = false;
  this.bossEngaged = false;
  // ...
}
```

---

### 씬 간 상태/이벤트

Phaser에서 여러 씬이 동시에 실행된다(GameScene 위에 UIScene이 겹쳐 실행). 씬끼리 데이터를 주고받는 두 가지 방법:

```ts
// 방법 1: EventEmitter — 이벤트 발행/구독 (1회성 알림)
// CompanionManager가 EventEmitter를 상속받아 이벤트를 발행할 수 있게 됨
class CompanionManager extends Phaser.Events.EventEmitter {
  add(companion) {
    // ...
    this.emit("join", companion, index); // "join" 이벤트 발행
  }
}
// UIScene에서 구독:
// companions.on("join", (c, i) => { /* 버튼 추가 */ })

// 방법 2: registry — 씬 간 공유 저장소 (지속 상태)
// 스테이지가 바뀌어도 "어떤 멤버가 합류했는지" 기억해야 할 때
this.registry.set("roster", [...roster, "noah"]);
// 다음 씬에서: this.registry.get("roster")
```

---

### 카메라 컷신

보스 구역에 진입하면 카메라가 하민을 따라오다 멈추고, 보스 위치로 이동하는 연출.

```ts
cam.stopFollow(); // 하민 자동 추적 해제
cam.pan(
  targetCx, targetCy, // 이동할 목표 위치
  900,                // 이동 시간(ms)
  "Sine.easeInOut",   // 가속/감속 곡선 (부드럽게)
  false,
  (_c, p) => {        // p = 진행도 0~1
    if (p >= 1) this.introLock = false; // 카메라 이동 완료 후 입력 잠금 해제
  }
);
```

---

## 툴링 (Vite / git / PowerShell)

### Vite — 런타임에 로드하는 에셋은 반드시 `public/`에

Vite 프로젝트에서 `src/assets/`에 넣은 파일은 빌드 시 번들러가 처리한다(경로가 바뀜). 그런데 Phaser처럼 런타임에 URL로 직접 로드하는 경우(`scene.load.image('key', 'assets/sprites/hamin.png')`)는 경로가 바뀌면 안 된다. `public/` 폴더에 넣으면 빌드 후에도 경로가 그대로 유지된다.

### PowerShell 함정 3가지

-  `Remove-Item`이 Claude Code 샌드박스에서 막힘 → 폴더 삭제는 `git rm -r`
-  커밋 메시지에 큰따옴표 `"`를 넣으면 here-string 문법이 깨짐 → 따옴표 없이 작성
- `git push`의 빨간 출력은 정상(진행 상황을 stderr로 출력하는 것), `해시..해시 main -> main`이 보이면 성공
