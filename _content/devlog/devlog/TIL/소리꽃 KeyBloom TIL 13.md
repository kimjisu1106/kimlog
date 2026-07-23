---
layout: post
title: 소리꽃 KeyBloom TIL 13
date: 2026-07-18
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 파티클과 건반이 렌더 방식은 다르지만 같은 색 규칙을 쓰게 한 공용화, 그리고 "직전 색 제외 랜덤"을 상태 없이 재현하는 결정적 해시와 정수 곱셈의 함정.
tags:
  - JavaScript
  - TypeScript
  - CSS
---
소리꽃의 색 모드를 파티클·건반 공용 5종으로 통일하고 팔레트 모드를 넣으며 배운 것들. 렌더 경로가 달라도 규칙은 한 곳에 두는 법, "직전 색은 빼고 랜덤"을 상태 없이 재현 가능하게 만드는 결정적 해시, 그 해시가 정수 곱셈이 아니면 색이 쏠리는 이유, 그리고 또 밟은 색·레이아웃 함정들.

---

## 색 규칙을 한 곳에 모으기

### 렌더 경로가 달라도 색 규칙은 공용

파티클과 건반은 색을 화면에 올리는 방식이 완전히 다르다. 파티클은 수천 개라 매번 색칠하면 느리다 — 그래서 색 단계별 도장을 미리 만들어 두고(이 과정을 "굽는다"고 하고, 도장 묶음을 아틀라스라 부른다) 그걸 찍어낸다. 건반은 88개뿐이라 매 프레임 색을 그때그때 계산해서 칠한다. 방식은 이렇게 다르지만 "무슨 색인가"라는 규칙은 같아야 한다 — 안 그러면 같은 노트인데 파티클 색과 건반 색이 어긋난다.

그래서 색을 정하는 규칙만 공용 모듈로 빼고, 화면에 올리는 경로는 각자 두었다.

```ts
// colorModes.ts — 규칙만 공용. 건반은 이걸 노트 단위로 즉시 호출
export function resolveNoteColor(mode, src, midi, time, velocity, paletteIdx): string {
  switch (mode) {
    case "solid":    return src.solid;
    case "gradient": return lerpColor(src.min, src.max, velocity);
    case "pastel":   return hslToRgb(noteHue(midi, time), 0.45, 0.8);
    case "random":   return hslToRgb(noteHue(midi, time), 0.75, 0.6);
    case "palette":  return src.palette[paletteIdx % src.palette.length];
  }
}

// 파티클은 같은 규칙으로 24단계를 "구워" 아틀라스로 재사용
export function bakeAtlasColors(p, steps): string[] { /* 같은 switch, 단계별로 */ }
```

핵심은 색을 정하는 재료(색 값 필드)는 각자 갖고, 그 재료를 실제 색으로 바꾸는 규칙만 공용으로 둔다는 분리다. 파티클은 `colorSolid`·`colorMin/Max`, 건반은 `keyColor`·`keyColorMin/Max`를 각자 갖되(둘을 독립적으로 칠하고 싶으니까), 그 값을 색으로 바꾸는 함수는 하나다. 팔레트만은 예외로 큐당 하나를 공유한다 — 팔레트는 "이 큐의 색 팔레트"라는 한 벌의 개념이라 나누는 게 부자연스럽다.

---

### 언제 도장을 다시 구울지 — 색 지문으로 판정

파티클 도장(아틀라스)은 색이 바뀌면 다시 만들어야 한다. 언제 다시 만들지 판정하려면 "색을 정하는 입력이 하나라도 바뀌었나"를 봐야 한다. 그래서 색을 정하는 재료를 전부 한 줄 문자열로 이어붙인 지문을 만든다 — 이걸 시그니처라 부르고, 재료가 하나라도 바뀌면 이 문자열이 달라져 "다시 구워라"는 신호가 된다. 이 지문을 빠뜨리면 색을 바꿔도 옛 도장이 그대로 남는다.

```ts
// 색을 정하는 입력을 전부 이어붙인 시그니처 — 하나라도 바뀌면 문자열이 달라짐
export function colorSig(p: EffectParams): string {
  return `${p.colorMode}|${p.colorSolid}|${p.colorMin}|${p.colorMax}|${p.palette.join(",")}`;
}
```

모드만 넣고 `colorSolid`나 `palette`를 빠뜨리면, 단색 색을 바꿔도 지문이 그대로라 다시 굽지 않는다. "판정 지문에는 결과에 영향을 주는 입력을 전부 넣는다"는 게 캐시(한 번 만든 걸 재사용하는 것)의 기본인데, 필드를 새로 추가할 때 이 지문을 같이 안 고치면 조용히 깨진다.

---

### 같은 UI 묶음은 틀 하나로 찍어낸다 (팩토리)

이펙트 색과 건반 색은 이제 같은 5모드 + 같은 입력 구성(모드 셀렉트 + 단색/Min/Max 색칸 + 조건부 표시)이다. 원래는 `applyColorMode`(이펙트)와 `applyKeyColorMode`(건반)를 따로 두고 있었는데, 통일하면서 같은 코드가 두 벌이 됐다. 같은 UI 한 벌을 찍어내는 틀(팩토리)을 하나 만들어, 그 틀로 이펙트용·건반용 두 개를 찍어냈다.

```ts
// 모드 셀렉트 + 색칸들 + 모드별 표시 로직을 한 묶음으로 반환
function colorControls(getMode, setMode, solid, min, max, label, onApply) {
  // ...공통 구성...
  return { rows, apply };  // apply = 모드에 따라 어떤 색칸을 보일지
}
const fxColors = colorControls(/* 이펙트 필드 */);
const kbColors = colorControls(/* 건반 필드 */);
```

같은 것이 둘 이상이면 함수로 묶는 당연한 이야기인데, 통일 작업의 절반은 "따로 자란 두 코드를 하나로 되돌리는 것"이었다.

---

### 옛 파일도 열리게 — 불러올 때 한 줄로

모드 이름을 정리하며 건반의 `rainbow`가 파티클의 `random`(무지개)과 같은 뜻이 됐다. 예전에 저장해 둔 프로젝트 파일에는 아직 옛 이름 `rainbow`가 들어 있으니, 그 파일도 새 버전에서 열리게 하려면 불러올 때 새 이름으로 바꿔줘야 한다(옛 저장값을 새 형식으로 옮기는 이 작업을 마이그레이션이라 한다).

```ts
function normalizeParams(p): EffectParams {
  const merged = { ...defaultParams, ...(p ?? {}) };
  // 구버전 저장값 마이그레이션 — 통일 전 "rainbow"는 지금의 "random"
  if (p?.keyColorMode === "rainbow") merged.keyColorMode = "random";
  return { ...merged, shapes: [...], palette: [...(p?.palette ?? defaultParams.palette)] };
}
```

이게 되는 건 저장 구조를 처음부터 `{...기본값, ...불러온값}` 병합 + `version` 필드로 짜뒀기 때문이다. 새 필드는 기본값이 자동으로 채워지고, 이름이 바뀐 값만 한 줄로 옮기면 된다. 배열(`palette`·`shapes`)은 참조 공유를 피하려고 복제하는 것도 잊지 말 것.

---

## 결정적 "직전 제외 랜덤"

### 되감아도 색이 안 바뀌게 — 색 순서를 미리 표로 정해두기

팔레트 모드는 "노트마다 팔레트에서 한 색, 단 직전 노트 색은 빼고"다. 순진하게 짜면 "직전 색"을 기억하는 변수를 들고 매번 랜덤을 뽑게 되는데(상태 기반), 건반은 되감기나 특정 지점으로 이동(스크럽·시크)을 하면 매 프레임 색을 다시 계산한다. 상태에 기대 랜덤을 뽑으면 볼 때마다 색이 바뀐다.

그래서 곡을 열 때 색 순서를 미리 표로 한 번 정해뒀다. 같은 입력이면 늘 같은 결과가 나오게 만든 것을 결정적이라고 하는데, 이러면 같은 노트는 항상 같은 색이라 되감기·재생·재녹화가 전부 일치한다.

```ts
// i=0: 그냥 h%n
// i>0: raw = h%(n-1)로 뽑고, 직전 인덱스 위로 시프트 → 직전과 절대 안 겹침 + 결정적
for (let i = 0; i < notes.length; i++) {
  const h = noteHash(notes[i].midi, notes[i].time);
  if (prev < 0) seq[i] = h % n;
  else {
    const raw = h % (n - 1);          // 0..n-2 (한 칸 적게)
    seq[i] = raw >= prev ? raw + 1 : raw;  // 직전 자리를 건너뛰어 배치
  }
  prev = seq[i];
}
```

`h % (n-1)`로 한 칸 적게 뽑은 뒤 직전 인덱스 위치를 건너뛰게 시프트하면, 조건문 없이 "직전 제외 + 균등"이 나온다. 앞의 TIL(물고기 방향)에서 "금지 구간이 있는 랜덤은 분포를 직접 설계한다"와 같은 결의 문제였다.

---

### 색이 몇 개로만 쏠린 이유 — 곱셈 끝자리가 잘려서

팔레트 5색을 넣었는데 1·2번 색만 계속 나왔다. 원인은 색을 고를 때 쓰는 해시 함수였다(해시는 입력을 뒤섞어 큰 숫자로 바꾸는 함수).

```ts
// ❌ 일반 곱셈 — h가 40억쯤이면 h * 22억 ≈ 8.8e18 이 MAX_SAFE_INTEGER(9e15)를 넘어
//    하위 비트가 반올림으로 뭉개진다. 그런데 % n 은 바로 그 하위 비트를 읽는다 → 쏠림
h = (h * 2246822519) >>> 0;

// ✅ Math.imul = 진짜 32비트 정수 곱셈. 하위 비트가 정확히 보존됨
h = Math.imul(h, 2246822519);
```

컴퓨터는 숫자를 담는 칸에 자릿수 한계가 있다. 곱셈 결과가 너무 커지면(JS 숫자는 약 9천조가 한계) 끝자리부터 반올림돼 사라진다. 그런데 색을 고를 때 쓰는 건 바로 그 끝자리라, 끝자리가 뭉개지면 색이 몇 개로만 쏠린다. `Math.imul`은 끝자리를 버리지 않는 전용 곱셈이라 이 문제를 막는다. 바꾼 뒤 5색이 41/37/38/47/37로 고르게 나오는 걸 확인했다.

```ts
// 검증: 200노트에 대해 5색 카운트 → [41,37,38,47,37], 직전 반복 0
```

비트 연산·해시를 JS에서 할 땐 곱셈은 `Math.imul`, 논리 연산은 `| 0`·`>>> 0`으로 32비트에 가둬야 한다.

---

### 라이브는 상태 랜덤, 파일은 사전계산

파일 재생은 되감기(스크럽) 때문에 색 순서를 미리 정해둬야 하지만, 라이브 연주는 노트가 순차로만 들어오고 되감기가 없다. 여기선 상태 랜덤이 오히려 자연스럽다(매번 새 곡처럼 색이 달라짐).

```ts
// 라이브 — noteOn당 한 번 뽑아 건반·파티클이 같은 색 공유. 직전만 제외
export function pickLive(n: number, lastIdx: number): number {
  if (n <= 1) return 0;
  const raw = Math.floor(Math.random() * (n - 1));
  return lastIdx >= 0 && raw >= lastIdx ? raw + 1 : raw;
}
```

같은 "직전 제외" 규칙이지만, 재현이 필요한 경로(파일)는 결정적으로, 필요 없는 경로(라이브)는 상태로 — 제약이 다르면 구현도 갈라도 된다는 걸 정리했다.

---

## 다시 만난 함정들

### hex 색이 글로우를 네모로 만든다

광택을 올리면 파티클 주변에 색 네모가 생겼다. 발광 글로우는 중심에서 가장자리로 투명해지는 원형 그라데이션인데, 가장자리가 투명이 안 되고 불투명 색으로 남아 사각 캔버스가 통째로 칠해진 것.

```ts
// 글로우 스프라이트 — 가장자리 alpha 0이어야 원형
grad.addColorStop(1, rgbaOf(color, 0));
```

범인은 색→투명 변환 함수였다. 로컬 함수가 `rgb(...)` 형식만 처리해서, 팔레트·단색 모드의 hex(`#4a90d9`)는 변환이 안 되고 그대로 남았다 → `alpha 0`이어야 할 자리가 불투명 hex.

```ts
// ❌ rgb()만 처리 — hex는 그대로 반환되어 불투명하게 남음
function withAlpha(rgb, a) { return rgb.replace("rgb(", "rgba(").replace(")", `,${a})`); }

// ✅ hex·rgb 둘 다 처리하는 기존 함수로 교체
export function rgbaOf(color, a) {
  if (color.startsWith("rgb(")) return color.replace("rgb(", "rgba(").replace(")", `,${a})`);
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r},${g},${b},${a})`;
}
```

색을 문자열로 다루면 "포맷이 여러 개"라는 함정이 늘 따라온다. 무지개·그라데는 `rgb()`를 뱉어 우연히 멀쩡했고, hex를 뱉는 새 모드에서만 터졌다 — 입력 포맷을 한 종류로 못 박거나, 변환기를 포맷 전부에 대응시켜야 한다.

---

### grid 4열 오버플로 + 페이지 이중 스크롤

팔레트 색칸을 4열로 바꾸자 두 가지가 겹쳐 터졌다.

색칸(컬러 인풋 40px + 삭제 버튼)을 `auto` 폭 4열로 두니 패널 폭을 넘쳤다. `1fr` 그리드로 칸을 패널 폭에 맞추고, 자식이 칸보다 커지지 않게 `min-width:0`을 줬다.

```css
.palette-chips { display: grid; grid-template-columns: repeat(4, 1fr); }
.palette-chip { min-width: 0; }                 /* 이게 없으면 자식이 셀을 밀어냄 */
.palette-chip input[type="color"] { flex: 1; min-width: 0; }
```

그리고 페이지 스크롤바가 패널 내부 스크롤바와 겹쳐 두 개가 됐다. 앱 셸은 페이지 자체가 스크롤되면 안 된다.

```css
/* app-shell: 페이지 레벨 스크롤 금지 — 스크롤은 내부 컨테이너만 */
html, body { overflow: hidden; }
```

`min-width:0`(flex/grid 자식은 기본적으로 콘텐츠보다 안 줄어듦)과 `overflow:hidden`(앱 셸 페이지 스크롤 차단)은 이전에도 만난 CSS 기본값 함정과 같은 부류다 — 기본값이 "안 줄어듦/스크롤 허용"이라 명시로 눌러야 한다.

---

## 요약

- 렌더 경로(파티클 아틀라스 vs 건반 즉시 계산)가 달라도 색을 *정하는* 규칙은 공용 모듈 하나. 색 값 필드만 각자, 팔레트는 큐당 공유.
- 다시 구울지 판정하는 색 지문(`colorSig`)에는 결과에 영향 주는 입력을 전부 넣는다 — 새 필드 추가 시 지문도 같이.
- "직전 제외 랜덤"은 `h%(n-1)` 후 직전 자리 시프트로 조건문 없이. 재현 필요한 경로는 색 순서를 미리 표로(결정적), 라이브는 상태 랜덤.
- JS에서 해시 곱셈은 `Math.imul` — 일반 곱셈은 결과가 너무 커지면 끝자리가 잘려 나가 색이 몇 개로 쏠린다.
- 색을 문자열로 다루면 포맷(hex/rgb)이 섞이는 함정 — 변환기를 모든 포맷에 대응시킨다.
- grid/flex 자식은 `min-width:0`이 없으면 안 줄고, 앱 셸은 `html,body{overflow:hidden}`으로 페이지 스크롤을 막는다.
