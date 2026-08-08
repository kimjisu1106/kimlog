---
layout: post
title: 소리꽃 KeyBloom TIL 33
date: 2026-08-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 캔버스에서 이미지를 다루며 배운 것 — 이미지 실루엣에만 색을 입히는 합성, 불투명 이미지가 네모로 뜨는 이유, 그리고 배경을 원본·맞춤·채움·타일로 배치하는 방법.
tags:
  - TypeScript
---
사용자 이미지를 파티클 모양·배경으로 쓰면서 캔버스 합성과 배치를 정리했다.

---

## 실루엣에만 색을 입히려면 source-atop

커스텀 파티클 모양은 "이미지 모양은 쓰되 색은 기존 색 모드(무지개·팔레트 등) 그대로"여야 한다. 이미지를 그린 뒤 그 알파(모양)를 마스크(모양대로 오려내는 틀) 삼아 색을 덮으면 된다. 이때 합성 모드가 `source-atop`.

```ts
g.drawImage(img, ...);                    // 이미지(모양) 먼저
g.globalCompositeOperation = "source-atop"; // 이미 그려진 픽셀 위에만
g.fillStyle = color;
g.fillRect(0, 0, dim, dim);               // 그 모양대로만 색이 채워짐
```

`source-atop`은 "새로 칠하는 것을 이미 있는 픽셀이 있는 자리에만" 남긴다. 그래서 이미지가 있는 곳만 색으로 덮이고 나머지는 투명하게 유지된다.

---

## 불투명 이미지가 네모로 뜨는 이유

이걸로 테스트하다 이미지가 아니라 색칠된 네모가 떴다. 이유는 단순하다 — `source-atop`은 "픽셀이 있는 자리"에 색을 넣는데, 배경이 불투명한 이미지는 사각형 전체가 픽셀이라 네모 전체가 색으로 덮인다.

```text
투명 배경 PNG  → 그 모양대로 색 (원하는 실루엣)
불투명 이미지    → 사각형 전체가 실루엣 → 색칠된 네모
```

- 배운 점: 실루엣 방식은 투명 배경 PNG를 전제한다. 불투명 이미지엔 실루엣이 없어서 못 쓴다.

---

## 배경 배치 — 원본·맞춤·채움·타일

배경 이미지는 사람마다 원하는 배치가 다르다. 네 가지를 스케일 계산으로 나눴다. 렌더 높이(`h`)에 비례해 계산하면 미리보기·내보내기 어느 해상도든 프레임 대비 같은 결과가 된다.

```ts
// 원본 = 기준 해상도(1080p) 대비 원본 크기 / 맞춤 = 전체 보이게(contain) / 채움 = 프레임 채움(cover)
const scale =
  fit === "fit"   ? Math.min(w / iw, h / ih)  // contain
  : fit === "cover" ? Math.max(w / iw, h / ih)  // cover
  : h / 1080;                                    // original
ctx.drawImage(img, (w - iw*scale)/2, (h - ih*scale)/2, iw*scale, ih*scale);
```

타일(반복)은 `createPattern`으로.

```ts
const scale = h / 1080;
const pat = ctx.createPattern(img, "repeat");
ctx.save();
ctx.scale(scale, scale);      // 패턴을 원본(1080p 기준) 크기로
ctx.fillStyle = pat;
ctx.fillRect(0, 0, w / scale, h / scale);
ctx.restore();
```

---

## 요약

- 이미지 모양에만 색을 입히려면 `drawImage` 후 `source-atop` + `fillRect(color)`.
- 그 방식은 투명 배경 PNG 전제 — 불투명 이미지는 사각형 전체가 실루엣이라 네모가 된다.
- 배경 배치는 `min`(contain)·`max`(cover)·`createPattern`(tile)로 나누고, 렌더 높이 비례로 계산해 해상도 무관하게 같은 결과.
