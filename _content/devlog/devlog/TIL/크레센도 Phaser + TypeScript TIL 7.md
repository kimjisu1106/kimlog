---
layout: post
title: 크레센도 Phaser + TypeScript TIL 7
date: 2026-07-07
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
## 렌더링

### Phaser 4 per-object Glow 필터로 "외곽선" 주기

어두운 배경에 검은 실루엣이라 잡몹이 안 보였다. 스프라이트 하나에 보라 외곽선을 주고 싶었는데, Phaser 4는 `Filters` 컴포넌트가 **모든 GameObject 기본에** 들어있다. 다만 데이터 구조를 준비하는 `enableFilters()`를 먼저 불러야 활성화된다.

```ts
this.animSprite.enableFilters(); // 켜야 filters 프로퍼티가 생김
this.animSprite.filters?.external.addGlow(
  0x7e57c2, // color — 글로우 색
  1,        // outerStrength — 외곽 세기
  0,        // innerStrength — 내부 세기(0 = 외곽만)
  1,        // scale — 거리 배수
  false,    // knockout — true면 글로우만 그리고 원본은 숨김
  10,       // quality
  5,        // distance — 퍼짐 폭(생성 후 변경 불가, 작을수록 외곽에 밀착)
);
```

**`external` vs `internal`이 핵심이다.**

- `external`: 오브젝트를 **카메라 공간**에 렌더 → 글로우가 스프라이트 경계 **바깥으로 번진다**. 외곽선/오라 용도.
- `internal`: 오브젝트를 자기 프레임버퍼에 렌더 → 글로우가 텍스처 영역 안으로 **잘린다**.

외곽선을 원하니 `external`을 썼다.

주의점 두 가지.

- **WebGL 전용**이다. `enableFilters()`는 WebGL이 아니면 조용히 early return 하므로, Canvas 폴백 환경에서도 크래시 없이 그냥 글로우만 안 나온다.
- **세기와 퍼짐은 다른 노브다.** 처음에 `outerStrength: 4`로 줬더니 너무 셌고, 값을 줄이는 것과 별개로 **`distance`를 줄여야 외곽에 밀착**했다. `outerStrength`는 밝기, `distance`는 번지는 반경.

덤으로, 피격 시 주던 `setTint(0xff6666)`(빨강 플래시)와 글로우가 서로 간섭 없이 공존한다. 틴트는 텍스처 색을 물들이는 것이고 글로우는 별도 렌더 패스라서 그렇다.

---

## 연출

### 화면에 고정되는 연출 오브젝트는 `scrollFactor(0)`

엔딩에서 하늘에 비행선 함대가 몰려오는 컷을 넣었다. 카메라는 하민을 따라 움직이는데, 함대는 카메라와 무관하게 **화면 상단에 고정**되어야 한다.

`scrollFactor(0)`을 주면 그 오브젝트는 카메라 스크롤을 무시하고 화면 좌표에 붙는다. 월드 좌표가 아니라 스크린 좌표처럼 동작해서, HUD·레터박스·캡션 같은 "화면에 붙는" 연출에 그대로 쓴다.

```ts
const ship = this.makeCarrier(scale).setScrollFactor(0).setDepth(45);
// 카메라가 하민을 따라가도 함대는 화면 상단 그 자리에 고정
```

---

### `Container`로 도형을 묶어 "하나처럼" 다루기

전용 함대 스프라이트가 아직 없어서 도형 조합으로 실루엣을 만들었다. 타원(언더글로우) + 사각형(선체) + 사각형(브릿지) 세 조각인데, 이걸 각각 트윈하면 관리가 지옥이다.

`Container`로 묶으면 컨테이너 하나만 움직여도 자식 전체가 함께 따라온다. `setAlpha`·`setScrollFactor`·`setScale`도 컨테이너에 주면 자식에 전파된다.

```ts
private makeCarrier(scale: number): Phaser.GameObjects.Container {
  const glow = this.add.ellipse(0, 10, 40, 8, 0x7e57c2, 0.28);
  const hull = this.add.rectangle(0, 0, 50, 13, 0x171026).setStrokeStyle(1, 0x8266c0, 0.5);
  const bridge = this.add.rectangle(0, -8, 20, 6, 0x2a1f47);
  return this.add.container(0, 0, [glow, hull, bridge]).setScale(scale);
}
```

이렇게 **placeholder를 함수 하나로 격리**해두면, 나중에 진짜 스프라이트가 나왔을 때 `makeCarrier` 내부만 갈아끼우면 되고 호출부(트윈·배치 로직)는 그대로다.

---

### 스태거 트윈으로 "몰려오는" 군집 만들기

함대가 한 번에 뿅 나타나면 위협감이 없다. 여러 대가 **줄줄이** 밀려와야 "몰려온다"는 느낌이 난다.

각 개체의 트윈 `delay`를 **인덱스로 어긋내면** 된다(`base + i * step`). 화면 밖 우측에서 시작해 정해진 슬롯으로 순차 도착시킨다.

```ts
for (let i = 0; i < FLEET; i++) {
  const ship = this.makeCarrier(scale).setScrollFactor(0).setAlpha(0);
  ship.setPosition(width + 60 + i * 30, y);   // 화면 밖 우측에서 시작
  const arriveAt = 600 + i * 180;             // ← delay를 인덱스로 어긋냄 = 줄줄이 등장

  this.tweens.add({
    targets: ship, x: slotX, alpha: 0.92,
    duration: 1500, delay: arriveAt, ease: "Sine.easeOut",
  });
  // 도착 후 yoyo+무한반복으로 미세하게 앞뒤로 부유 → 살아있는 함대 느낌
  this.tweens.add({
    targets: ship, x: slotX - 12,
    duration: 2600, delay: arriveAt + 1500,
    yoyo: true, repeat: -1, ease: "Sine.easeInOut",
  });
}
```

도착 후 `yoyo: true, repeat: -1` 트윈을 얹으면 제자리에서 살짝 흔들려 정지 화면이 안 된다.

---

## UI

### 진행바의 100%는 "실제 트리거 지점"에 맞춰라

상단 진행도 바의 100%를 처음엔 **보스 위치**로 잡았다. 그런데 보스 아레나는 보스보다 한 화면 앞에서 시작(잠기고 컷신 트리거)되기 때문에, 아레나에 들어가는 순간엔 진행바가 90%대였다가 진입 직후 100%로 **튀었다**.

지표가 튀는 건 "기준점"이 실제 게임 이벤트와 다르기 때문이다. 100%를 보스 좌표가 아니라 **아레나 진입선(`arenaLeftX`)** 에 맞추면, 진입하는 순간 정확히 100%가 된다.

```ts
// ❌ 목표 = 보스 위치 → 아레나 진입 시점에 아직 90%대
const span = this.bossX - PLAYER_START_X;

// ✅ 목표 = 아레나 진입선 → 진입하는 순간 딱 100%
const span = this.arenaLeftX - PLAYER_START_X;
const t = this.bossEngaged
  ? 1
  : Phaser.Math.Clamp((this.player.x - PLAYER_START_X) / span, 0, 1);
```

UI 지표는 "무엇을 목표로 보여줄 것인가"를 실제 트리거와 일치시켜야 자연스럽다.
