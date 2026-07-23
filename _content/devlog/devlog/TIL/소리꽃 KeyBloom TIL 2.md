---
layout: post
title: 소리꽃 KeyBloom TIL 2
date: 2026-07-03
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - TypeScript
  - WebAPI
---
## 파티클마다 fillText 하지 말고, 미리 그려둔 그림을 복사해 찍기

소리꽃은 노트마다 파티클을 뿌리는데, 개수를 최대로 올리니 밀집 구간에서 버벅였다. 파티클이 수천 개가 되는데 각각을 유니코드 글리프(●■♥★)로 화면에 `fillText`(글자 그리기)로 그리고 있었다. 원인은 그리는 방식에 있었다.

---

## fillText가 비싼 이유

`fillText`로 글자를 하나 그릴 때 브라우저가 하는 일이 생각보다 많다.

- `ctx.font = "32px ..."`를 매번 설정하면 그 폰트 문자열을 파싱한다.
- 글자를 그릴 때 폰트의 외곽선(벡터)을 그 크기에 맞춰 래스터화(픽셀로 계산)한다.

한두 번이면 티가 안 나지만, 파티클마다 크기·색이 달라 매 프레임 수천 번을 반복하면 이게 프레임을 갉아먹는다. 즉 "매번 글자를 새로 조판해서 찍는" 셈이었다.

---

## 스프라이트 아틀라스 — 한 번 굽고 계속 복사

해법은 단순하다. 글리프를 오프스크린 캔버스(화면에 안 붙인 임시 캔버스)에 미리 한 번 그려두고(스프라이트), 파티클은 그 그림을 `drawImage`로 복사만 한다. `drawImage`는 이미 픽셀이 된 비트맵을 그대로 옮겨 붙이는 거라 `fillText`보다 훨씬 싸다.

```js
function makeSprite(shape, color, font) {
  const c = document.createElement("canvas");
  c.width = c.height = 144;
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.font = `96px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(shape, 72, 72); // 여기서 딱 한 번만 fillText
  return c;
}
```

그린 다음엔 파티클마다 이렇게만 한다.

```js
ctx.drawImage(sprite, px - box / 2, py - box / 2, box, box);
```

---

## 색은 미리 24단계로 틴트해서 굽는다

문제가 하나 있다. 파티클 색이 min~max 그라데이션 위에서 제각각이다(세게 친 노트일수록 max 색 쪽으로 치우쳐 랜덤으로 뽑힘). 색이 다 다르면 스프라이트를 미리 구울 수가 없다.

그래서 색을 24단계로 양자화했다. 그라데이션을 24개 색으로 미리 나눠 각각 스프라이트를 굽고, 파티클은 자기 색 위치(`colorT`, 0~1)로 가장 가까운 스프라이트를 고른다. 눈으로는 24단계면 충분히 부드럽다.

```js
// 파티클은 색 값 대신 colorT(0~1)만 들고, 렌더 때 인덱스로 스프라이트 선택
const idx = Math.round(p.colorT * 23);
ctx.drawImage(sprites[idx], ...);
```

모양을 여러 개 켜면 모양 × 색 2차원 아틀라스가 된다(모든 모양 × 24색). 파티클은 어떤 모양인지 `shapeIndex`만 들면 되고, 이 인덱스를 전체 모양 목록 기준으로 잡아서 선택을 바꿔도 이미 떠 있는 파티클이 안 깨진다.

---

## 광택도 스프라이트에서 처리 — source-atop과 lighter

광택(유리·보석 느낌)도 렌더 합성으로 흉내 냈다. 두 가지 캔버스 합성 모드를 썼다.

- 스프라이트를 구울 때, 글리프 위에 좌상단 밝은 점(스페큘러 하이라이트)을 얹는다. 이때 `globalCompositeOperation = "source-atop"`을 쓰면 새로 그리는 게 기존 픽셀이 있는 자리에만 남아서, 하이라이트가 글리프 모양 밖으로 안 삐져나온다.
- 광택을 많이 올리면 렌더 때 한 번 더 그린다. `globalCompositeOperation = "lighter"`(가산 합성)로 색 헤일로를 겹치면, 파티클이 겹칠수록 밝아지는 발광 효과가 난다.

즉 "무광"일 땐 그냥 스프라이트만, "유광"일 땐 그 위에 가산 글로우를 한 겹 더 얹는 2패스다. 낮은 광택은 1패스라 비용이 안 든다.

---

## 배열도 아낀다 — 제자리 압축과 총량 상한

렌더 말고도 자잘한 게 있었다. 매 프레임 죽은 파티클을 `filter`로 걸러 새 배열을 만들면, 그 새 배열이 계속 쌓여 가비지 컬렉션 부담이 된다. 그래서 살아있는 파티클을 배열 앞쪽으로 당기고 길이만 잘라내는 제자리 압축으로 바꿨다. 또 폭발적인 밀집에서 무한정 늘지 않게 총 파티클 수 상한을 뒀다.

```js
let w = 0;
for (let i = 0; i < arr.length; i++) {
  const p = arr[i];
  // ...물리 갱신...
  if (p.life > 0) arr[w++] = p; // 살아있으면 앞으로 당김
}
arr.length = w; // 새 배열 안 만들고 길이만 자름
```

---

## 요약

- `fillText`는 매번 폰트 파싱 + 글리프 래스터화라 대량 반복에 비싸다. 미리 오프스크린 캔버스에 글리프를 구워두고 `drawImage`로 복사하면 훨씬 싸다.
- 연속 색은 그대로 못 구우니 24단계로 양자화해 스프라이트를 굽고, 파티클은 `colorT`(0~1) 인덱스로 고른다. 모양이 여럿이면 모양 × 색 2D 아틀라스.
- 광택은 `source-atop`으로 글리프 안에만 하이라이트를 굽고, 강할 땐 `lighter`(가산) 글로우를 한 패스 더 얹는다.
- 매 프레임 `filter` 대신 제자리 압축으로 GC 부담을 줄이고, 총량 상한으로 폭주를 막는다.
