---
layout: post
title: 소리꽃 KeyBloom TIL 25
date: 2026-07-26
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 광택 슬라이더 하나가 표면 반짝임과 발광을 겸하던 걸 분리하고, 발광을 세기 슬라이더에서 on/off + 크기 + 밝기로 재설계하며 구버전 파일 하위호환을 맞춘 이야기.
tags:
  - TypeScript
---
건반·파티클의 "광택" 파라미터 하나가 사실 두 효과 — 표면 유리 반짝임(sheen)과 위로 뻗는 발광 — 를 겹쳐 조절하고 있었다. 이 둘을 나누고 발광 조절 방식을 다시 설계했다.

---

## 한 파라미터, 두 렌더 효과 분리

sheen과 발광은 코드상 이미 다른 렌더 구역이었다 — sheen은 건반 위 그라데(`paintKey`), 발광은 위로 뻗는 가산(`lighter`, 빛을 더하듯 밝게 겹치는 합성) 글로우 패스. 파라미터만 하나를 공유했을 뿐이다. 각각 별도 파라미터로 배선하면 자연히 분리된다.

```ts
// 발광 패스 — 이제 keyGlow(on/off) + keyGlowLen(길이) + keyGlowOpacity(밝기)
if (!l.glow) continue;
const glowH = view.h * l.glowLen;
g.addColorStop(0, rgbaOf(l.color, l.glowOpacity * l.level));
```

---

## 세기 슬라이더 → on/off + 크기 + 밝기

발광 "세기(0~1)" 하나로 조절하던 걸, 켤지 말지(토글) + 크기(건반=길이, 파티클=반경) + 밝기로 나눴다. 세기 슬라이더는 "약한 발광"과 "끔"의 경계가 모호했는데, on/off + 크기가 의도를 더 잘 가른다.

---

## 밝기(알파)와 크기(scale) 분리

발광 스프라이트(미리 그려둔 이미지 조각)는 색만 미리 굽고, 밝기는 draw 시 알파(투명도)로, 크기는 draw 시 scale로 준다 — 둘 다 재굽기 없이 즉시 반영된다.

```ts
ctx.globalAlpha = life * GLOW_MAX_ALPHA;                    // 밝기
ctx.drawImage(atlas.glow[i], ..., box * gp.partGlowVol);   // 크기
```

반대로 sheen은 스프라이트에 구워지므로 아틀라스 시그니처(여러 스프라이트를 한 장에 모은 이미지가 바뀌었는지 판별하는 지문값)에 포함된다 → 값이 바뀌면 재굽기. "굽는 값"과 "그릴 때 적용하는 값"을 구분하는 게 성능의 갈림이다.

---

## 하위호환 마이그레이션(저장 구조를 바꾸는 것)

파라미터의 타입·의미가 바뀌면 구버전 저장 파일(`.kbloom`)이 깨질 수 있다. `normalizeParams`에서 기본값과 병합하고 옛 값에서 유추한다.

```ts
// 발광 필드 없던 구버전 → 옛 광택값에서 on/off 유추
if (p && p.keyGlow === undefined) merged.keyGlow = merged.keyGloss > 0;
// helix 모션 병합 → spiral + 기둥 프리셋
if (p.motion === "helix") { merged.motion = "spiral"; merged.spiralSpread = 0; }
```

number → boolean 변경도 자연스럽게 흡수된다(구버전 숫자 발광값은 값이 "있다/참"으로 취급되는 truthy라 on으로 취급). 새 필드는 defaultParams 병합으로 기본값이 채워진다.

---

## 요약

- 한 파라미터가 두 렌더 효과를 겸하면, 효과별 파라미터로 배선해 분리한다.
- 발광은 세기 하나보다 on/off + 크기 + 밝기가 의도를 잘 나눈다.
- 굽는 값(sheen)은 아틀라스 시그니처에, 그릴 때 적용값(밝기·크기)은 재굽기 없이.
- 파라미터 의미·타입을 바꿀 땐 `normalizeParams`에서 구버전 유추로 하위호환.
