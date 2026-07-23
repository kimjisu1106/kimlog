---
layout: post
title: 소리꽃 KeyBloom TIL 6
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
---
## 브라우저에서 FPS(Frame per Second) 재기

소리꽃에서 파티클 개수를 최대로 올리면 버벅이는 느낌이 있었다. 전날 스프라이트 아틀라스 작업으로 버벅이는 것은 해소되었지만 혹시나 하는 생각에 최적화가 더 필요할지 알기 위해 측정 도구를 만들었다. FPS, Work 시간(ms), P(파티클 갯수)의 최대, 최소를 기록해 확인하는 방식.

---

## FPS는 프레임 간격으로 잰다

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

---

## work 시간으로 CPU인지 GPU인지 가른다

FPS가 떨어질 때, 원인이 두 갈래다 — 우리 JS 코드가 너무 오래 돌아서(CPU)인지, 그리는 픽셀이 너무 많아서(GPU fill-rate)인지. 이걸 가르려면 한 프레임에서 우리 코드가 실제로 쓴 시간(work)을 따로 재면 된다.

```js
function frame() {
  const start = performance.now();
  // ...업데이트 + 그리기...
  const workMs = performance.now() - start; // 우리 JS가 이 프레임에 쓴 시간
  requestAnimationFrame(frame);
}
```

### 원리 — draw 호출은 명령만 던지고 바로 돌아온다

이게 성립하는 이유가 핵심이다. `ctx.drawImage(...)`나 `ctx.fillRect(...)`를 부르면, 그 함수는 "이거 그려줘"라는 명령을 큐에 넣고 즉시 리턴한다. 실제로 픽셀을 칠하는 일(래스터화)은 그 뒤에 GPU(또는 컴포지터)가 비동기로 한다.

그래서 GPU가 픽셀을 칠하는 시간은 우리 `work` 타이머에 안 잡힌다. `work`는 "계산 + 그리기 명령을 만들어 던지기까지"의 CPU 시간만 잰다.

반면 프레임과 프레임 사이 간격(FPS)은 우리 work + GPU 래스터 + 화면 합성 + vsync 대기까지 전부 포함한 "이 프레임이 완성되기까지의 총 시간"이다.

즉 두 숫자는 재는 대상이 다르다. work는 JS(CPU)가 붙잡은 시간, FPS 간격은 전체 시간. 그래서 "프레임 총시간 중 work가 설명 못 하는 부분"이 GPU 몫이고, 그 갭을 보면 병목이 갈린다.

- work가 높은데(예: 16.7ms) FPS가 낮다 → 시간을 JS가 다 쓰고 있다 = CPU 바운드(업데이트 루프·계산이 무겁다)
- work는 낮은데(예: 5ms) FPS가 낮다(프레임이 30ms씩 걸린다) → 그 나머지는 타이머 밖(GPU 픽셀 채우기)에서 쓴 것 = GPU(fill-rate) 바운드. 큰 반투명 파티클이 잔뜩 겹쳐 오버드로가 많을 때 이렇게 된다

### 주의 — 오해하기 쉬운 두 가지

- work가 낮은데 FPS가 딱 60이면 GPU 병목이 아니라 그냥 여유다. 남는 시간은 다음 화면 갱신(vsync)을 기다리며 노는 것. GPU 병목은 "work가 낮은데 FPS도 60 아래로 떨어질 때"만 해당한다.
- 회색지대도 있다. 그리기 명령(draw call)이 수천~수만 개면 "명령을 발행하는 것" 자체가 CPU 비용이라 work에 잡힌다. 그래서 "그리기가 많다"가 CPU(발행 오버헤드)로도, GPU(픽셀 채우기)로도 나타날 수 있다. 정밀 측정이라기보단 "어느 쪽을 먼저 의심할지" 가려주는 실용 휴리스틱이다.

소리꽃은 work가 대부분 6ms대라 CPU 여유가 있었고, 파티클 렌더도 아틀라스(drawImage)라 GPU도 버텼다. 그래서 "이미 괜찮다"가 나왔다.

---

## 순간값은 노이즈다 — min/max가 엉뚱하게 튄다

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

## 요약

- FPS는 `requestAnimationFrame` 간격의 역수(`1000 / interval`)로 잰다.
- 프레임 작업시간(work)을 따로 재면 CPU 바운드(work가 16ms 근처)인지 GPU 바운드(work 낮은데 FPS 낮음)인지 가를 수 있다.
- 순간 FPS는 지터가 심해 min/max가 엉뚱하게 튄다 → 짧은 창 평균 + 켤 때 워밍업으로 안정화.
- 지표 성격에 맞게: FPS는 창 평균(지속 성능), work는 단일 프레임 최악값(무거운 한 프레임 포착).