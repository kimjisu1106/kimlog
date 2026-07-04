---
layout: post
title: 소리꽃 KeyBloom TIL 7
date: 2026-07-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - WebAPI
  - CSS
---
## 오늘 쓴 작은 기법 네 가지

소리꽃 폴리시를 하면서 나온, 짧지만 재사용성 높은 기법들을 한데 모았다. 잔광(상태 감쇠), 디바운스(비싼 재계산 미루기), 캔버스 합성으로 빛내기, CSS `[hidden]`이 안 먹던 함정.

---

## 잔광 — 매 프레임 렌더에 시간 상태를 얹기

원래 건반은 "지금 눌린 키"만 매 프레임 그렸다. 그러니 키를 떼는 순간 빛이 뚝 꺼졌다. "천천히 사라지는 여운"을 넣으려면, 렌더가 현재 상태만 보는 게 아니라 시간에 따라 변하는 상태를 들고 있어야 한다.

키마다 발광 세기(`level`)를 들고, 누르면 1, 떼면 매 프레임 조금씩 깎는다.

```js
// 눌린 키는 level 1로 갱신
for (const [midi, color] of active) litKeys.set(midi, { color, level: 1 });
// 뗀 키는 시간에 따라 감쇠(잔광)
for (const [midi, lit] of litKeys) {
  if (!active.has(midi)) {
    lit.level -= dt / DECAY_SEC; // dt = 프레임 간격(초)
    if (lit.level <= 0) litKeys.delete(midi);
  }
}
```

핵심은 "즉시 꺼질 것"과 "서서히 꺼질 것"을 분리한 것. 키 색과 반짝임(sheen)은 뗀 즉시 꺼지고, 위로 뻗는 발광 글로우만 `level`로 감쇠시켰다. 하나의 눌림을 두 종류 상태로 나눠 다룬 셈이다.

---

## 디바운스 — 연속 입력에 딸린 비싼 작업 미루기

색·광택 슬라이더를 드래그하면 매 입력마다 스프라이트를 다시 구웠다(수십 ms). 드래그는 매 프레임 입력이 쏟아지니 프레임이 튀었다.

해결은 디바운스 — 값이 바뀌는 동안은 미루고, 잠깐 안정된 뒤에만 한 번 실행한다.

```js
// 매 프레임 현재 설정의 sig를 만들어 비교
if (sig === builtSig) return;        // 이미 반영됨
if (sig !== pendingSig) {            // 값이 방금 또 바뀜(드래그 중)
  pendingSig = sig; stable = 0;      // 대기 리셋
} else if (++stable >= N) {          // N프레임째 그대로면
  rebuild(); pendingSig = "";        // 그제서야 한 번 굽는다
}
```

대신 "지금 당장 정확해야 하는" 순간엔 미룬 걸 강제로 실행(flush)해야 한다. 소리꽃은 녹화 시작 직전에 대기 중인 재굽기를 flush해서, 영상 첫 프레임이 옛 설정으로 찍히지 않게 했다. 미루기와 flush는 짝이다.

---

## 캔버스 합성 모드로 빛나게

캔버스는 새로 그리는 걸 기존 픽셀과 어떻게 섞을지(`globalCompositeOperation`)를 바꿀 수 있다. 두 개가 특히 쓸모 있었다.

- `lighter`(가산) — 새 색을 기존 픽셀에 더한다. 겹칠수록 밝아져서 발광·네온 느낌이 난다. 건반에서 위로 뻗는 글로우, 파티클 글로우에 사용.
- `source-atop` — 새로 그리는 게 기존 픽셀이 있는 자리에만 남는다. 파티클 글리프 위에 하이라이트를 얹을 때, 글리프 모양 밖으로 안 삐치게 클립하는 용도.

```js
ctx.globalCompositeOperation = "lighter"; // 가산
// ...색 그라데이션으로 위로 뻗는 빛을 그림...
ctx.globalCompositeOperation = "source-over"; // 원상복구 필수
```

주의는 하나 — 다 쓰고 반드시 `source-over`로 되돌려야 한다. 안 그러면 이후 그리는 것까지 전부 가산으로 섞여버린다.

---

## CSS `[hidden]`이 안 먹던 이유

JS에서 `el.hidden = true`를 줬는데 요소가 안 숨겨졌다. `hidden`은 브라우저 기본 스타일시트의 `[hidden] { display: none }`으로 동작하는데, 이건 우선순위가 아주 낮다.

내 CSS에 이런 게 있으면,

```css
.ctl-row { display: flex; } /* 이게 [hidden]의 display:none을 덮어씀 */
```

`.ctl-row`(클래스 선택자)가 `[hidden]`(브라우저 기본)보다 우선순위가 높아서, `display: flex`가 이겨 요소가 계속 보인다. 해결은 더 구체적으로 명시하는 것.

```css
.ctl-row[hidden] { display: none; } /* 클래스+속성이라 이김 */
```

`hidden` 속성이 안 들으면, 그 요소에 `display`를 지정하는 다른 규칙이 있는지부터 의심하면 된다.

---

## 요약

- 잔광 = 매 프레임 렌더에 시간 상태(`level`)를 들려 감쇠. "즉시 꺼질 것"과 "서서히 꺼질 것"을 나눠 다룬다.
- 연속 입력(슬라이더 드래그)에 딸린 비싼 작업은 디바운스로 미루고, 정확해야 할 순간엔 flush로 강제 실행.
- `globalCompositeOperation`의 `lighter`(가산=발광), `source-atop`(모양 안에만). 쓰고 나면 꼭 `source-over`로 복구.
- `[hidden]`이 안 먹으면 `display`를 지정하는 다른 규칙이 덮은 것 — `.클래스[hidden] { display: none }`으로 우선순위를 이길 수 있다.
