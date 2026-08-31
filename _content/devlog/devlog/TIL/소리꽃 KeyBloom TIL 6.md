---
layout: post
title: 소리꽃 KeyBloom TIL 6
date: 2026-07-04
permalink: "wjd31vjo"
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
성능 측정 도구를 만들며 브라우저에서 FPS와 CPU/GPU 병목을 가르는 법, 그리고 폴리시하며 나온 작은 기법 네 가지(잔광·디바운스·캔버스 합성·`[hidden]` 함정)를 정리한다.

---

## 브라우저에서 FPS·프레임 성능 측정

소리꽃에서 파티클 개수를 최대로 올리면 버벅이는 느낌이 있었다. 전날 스프라이트 아틀라스 작업으로 버벅이는 것은 해소되었지만 혹시나 하는 생각에 최적화가 더 필요할지 알기 위해 측정 도구를 만들었다. FPS, Work 시간(ms), P(파티클 갯수)의 최대, 최소를 기록해 확인하는 방식.

### FPS는 프레임 간격으로 잰다

애니메이션은 `requestAnimationFrame`(rAF)으로 매 프레임 콜백이 불린다. 이전 프레임과 지금 프레임의 시간 간격을 재면, 그 역수가 초당 프레임 수(FPS)다.

```js
let last = performance.now();
function frame() {
  const now = performance.now();
  const interval = now - last; // ms
  last = now;
  const fps = 1000 / interval; // 예: 간격 16.7ms → 60fps
  // ...그리기...
  requestAnimationFrame(frame);
}
```

여기에 파티클 수도 같이 띄우면, 버벅임이 "파티클이 많아서"인지 아닌지 눈으로 확인할 수 있다.

### work 시간으로 CPU인지 GPU인지 가른다

FPS가 떨어질 때, 원인이 두 갈래다 — 우리 JS 코드가 너무 오래 돌아서(CPU)인지, 그리는 픽셀이 너무 많아서(GPU fill-rate)인지. 이걸 가르려면 한 프레임에서 우리 코드가 실제로 쓴 시간(work)을 따로 재면 된다.

```js
function frame() {
  const start = performance.now();
  // ...업데이트 + 그리기...
  const workMs = performance.now() - start; // 우리 JS가 이 프레임에 쓴 시간
  requestAnimationFrame(frame);
}
```

#### 원리 — draw 호출은 명령만 던지고 바로 돌아온다

이게 성립하는 이유가 핵심이다. `ctx.drawImage(...)`나 `ctx.fillRect(...)`를 부르면, 그 함수는 "이거 그려줘"라는 명령을 큐에 넣고 즉시 리턴한다. 실제로 픽셀을 칠하는 일(래스터화)은 그 뒤에 GPU(또는 컴포지터)가 비동기로 한다.

그래서 GPU가 픽셀을 칠하는 시간은 우리 `work` 타이머에 안 잡힌다. `work`는 "계산 + 그리기 명령을 만들어 던지기까지"의 CPU 시간만 잰다.

반면 프레임과 프레임 사이 간격(FPS)은 우리 work + GPU 래스터 + 화면 합성 + vsync 대기까지 전부 포함한 "이 프레임이 완성되기까지의 총 시간"이다.

즉 두 숫자는 재는 대상이 다르다. work는 JS(CPU)가 붙잡은 시간, FPS 간격은 전체 시간. 그래서 "프레임 총시간 중 work가 설명 못 하는 부분"이 GPU 몫이고, 그 갭을 보면 병목이 갈린다.

- work가 높은데(예: 16.7ms) FPS가 낮다 → 시간을 JS가 다 쓰고 있다 = CPU 바운드(업데이트 루프·계산이 무겁다)
- work는 낮은데(예: 5ms) FPS가 낮다(프레임이 30ms씩 걸린다) → 그 나머지는 타이머 밖(GPU 픽셀 채우기)에서 쓴 것 = GPU(fill-rate) 바운드. 큰 반투명 파티클이 잔뜩 겹쳐 오버드로가 많을 때 이렇게 된다

#### 주의 — 오해하기 쉬운 두 가지

- work가 낮은데 FPS가 딱 60이면 GPU 병목이 아니라 그냥 여유다. 남는 시간은 다음 화면 갱신(vsync)을 기다리며 노는 것. GPU 병목은 "work가 낮은데 FPS도 60 아래로 떨어질 때"만 해당한다.
- 회색지대도 있다. 그리기 명령(draw call)이 수천~수만 개면 "명령을 발행하는 것" 자체가 CPU 비용이라 work에 잡힌다. 그래서 "그리기가 많다"가 CPU(발행 오버헤드)로도, GPU(픽셀 채우기)로도 나타날 수 있다. 정밀 측정이라기보단 "어느 쪽을 먼저 의심할지" 가려주는 실용 휴리스틱이다.

소리꽃은 work가 대부분 6ms대라 CPU 여유가 있었고, 파티클 렌더도 아틀라스(drawImage)라 GPU도 버텼다. 그래서 "이미 괜찮다"가 나왔다.

### 순간값은 노이즈다 — min/max가 엉뚱하게 튄다

FPS의 최저(min)를 같이 띄우면 "가장 버벅인 순간"을 잡을 수 있어 좋다. 그런데 처음엔 아무것도 안 하고 가만히 둬도 min 36 / max 93처럼 값이 튀었다.

원인은 순간(단일 프레임) FPS를 그대로 min/max에 넣은 것이었다.

- max 93 — rAF 간격이 어쩌다 한 번 짧게 찍히면 그 한 프레임이 90+로 계산된다. OS·브라우저 스케줄링 때문에 간격이 완벽히 일정하지 않다
- min 36 — 오버레이를 켜는 그 순간, 화면에 뭔가 뜨면서 그 프레임이 길어져 37fps로 잡히고, 그게 min에 박힌다

즉 "한 프레임 튄 것"이 전체 min/max를 지배했다.

해결 방법: 창 평균 + 워밍업

1. 순간값 대신 짧은 창(예: 500ms) 동안의 평균 FPS를 min/max에 쓴다. 한 프레임 지터는 평균에 묻힌다.
2. 측정을 켠 직후 몇 프레임은 무시(워밍업)한다. 켤 때 생기는 히치를 제외.

```js
// 500ms 동안 프레임을 모아서 평균 FPS를 낸다
winFrames++;
winTime += interval;
if (winTime >= 500) {
  const winFps = (winFrames * 1000) / winTime;
  if (!warming) {
    fpsMin = Math.min(fpsMin, winFps);
    fpsMax = Math.max(fpsMax, winFps);
  }
  winFrames = 0;
  winTime = 0;
}
```

이렇게 하니 가만히 두면 min/max가 60 근처로 붙고, 실제로 무거운 구간에서만 min이 떨어졌다. 그제서야 min/max가 믿을 수 있는 숫자가 됐다.

(work의 max는 반대로 단일 프레임 그대로 뒀다 — 가끔 튀는 "가장 무거운 한 프레임"을 놓치지 않으려고. 지표마다 "평균이 맞나, 최악값이 맞나"가 다르다.)

---

## 작은 기법 네 가지 — 잔광·디바운스·합성·`[hidden]`

소리꽃 폴리시를 하면서 나온, 짧지만 재사용성 높은 기법들을 한데 모았다. 잔광(상태 감쇠), 디바운스(비싼 재계산 미루기), 캔버스 합성으로 빛내기, CSS `[hidden]`이 안 먹던 함정.

### 잔광 — 매 프레임 렌더에 시간 상태를 얹기

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

### 디바운스 — 연속 입력에 딸린 비싼 작업 미루기

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

### 캔버스 합성 모드로 빛나게

캔버스는 새로 그리는 걸 기존 픽셀과 어떻게 섞을지(`globalCompositeOperation`)를 바꿀 수 있다. 두 개가 특히 쓸모 있었다.

- `lighter`(가산) — 새 색을 기존 픽셀에 더한다. 겹칠수록 밝아져서 발광·네온 느낌이 난다. 건반에서 위로 뻗는 글로우, 파티클 글로우에 사용.
- `source-atop` — 새로 그리는 게 기존 픽셀이 있는 자리에만 남는다. 파티클 글리프 위에 하이라이트를 얹을 때, 글리프 모양 밖으로 안 삐치게 클립하는 용도.

```js
ctx.globalCompositeOperation = "lighter"; // 가산
// ...색 그라데이션으로 위로 뻗는 빛을 그림...
ctx.globalCompositeOperation = "source-over"; // 원상복구 필수
```

주의는 하나 — 다 쓰고 반드시 `source-over`로 되돌려야 한다. 안 그러면 이후 그리는 것까지 전부 가산으로 섞여버린다.

### CSS `[hidden]`이 안 먹던 이유

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

- FPS는 `requestAnimationFrame` 간격의 역수(`1000 / interval`)로 잰다. 프레임 작업시간(work)을 따로 재면 CPU 바운드(work가 16ms 근처)인지 GPU 바운드(work 낮은데 FPS 낮음)인지 가른다. 순간 FPS는 지터가 심해 창 평균 + 워밍업으로 안정화하고, work는 단일 프레임 최악값으로 본다.
- 잔광 = 매 프레임 렌더에 시간 상태(`level`)를 들려 감쇠. "즉시 꺼질 것"과 "서서히 꺼질 것"을 나눈다.
- 연속 입력(슬라이더 드래그)에 딸린 비싼 작업은 디바운스로 미루고, 정확해야 할 순간엔 flush로 강제 실행.
- `globalCompositeOperation`의 `lighter`(가산=발광), `source-atop`(모양 안에만). 쓰고 나면 꼭 `source-over`로 복구.
- `[hidden]`이 안 먹으면 `display`를 지정하는 다른 규칙이 덮은 것 — `.클래스[hidden] { display: none }`으로 우선순위를 이긴다.
