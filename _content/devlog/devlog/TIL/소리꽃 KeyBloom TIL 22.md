---
layout: post
title: 소리꽃 KeyBloom TIL 22
date: 2026-07-25
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 라이브 녹화를 실시간 캡처에서 "이벤트 기록 후 오프라인 렌더"로 다시 짜 기기 버벅임과 결과물을 분리한 이야기, 연주를 MIDI로 뽑기, 그리고 시작 로딩바·다크 스크롤바·네이티브 광고 제외 같은 잔손질.
tags:
  - TypeScript
  - JavaScript
  - CSS
---
라이브 연주를 녹화하는데, 실시간으로 화면을 찍으니 컴퓨터가 버벅이면 그 버벅임이 그대로 영상에 박혔다. "치는 순간"과 "결과물"을 떼어놓는 게 이 문제의 핵심이었다.

---

## 라이브 녹화를 다시 짜기

### 실시간 캡처의 한계

기존 라이브 녹화는 `MediaRecorder`(브라우저 화면·소리를 녹화하는 API)로 캔버스를 실시간으로 담았다. 즉 그 순간 렌더된 프레임을 그대로 녹화하니, 기기가 버벅이면 버벅인 프레임이 박힌다. 포맷(webm)을 바꿔도 소용없다 — 담는 방식이 실시간이라서다.

파일 모드의 "고화질 MP4"는 이미 이 문제가 없었다. 프레임을 한 장씩 계산해 인코딩하니까. 라이브만 실시간 캡처라 노출돼 있었다.

### 연주를 이벤트로 기록

그래서 라이브 녹화를 "화면을 찍는" 게 아니라 "연주를 기록하는" 것으로 바꿨다. 녹화 중엔 노트 on/off와 큐 전환, 페달을 타임스탬프와 함께 배열에 쌓기만 한다. 미리보기는 버벅여도 상관없다 — 기록엔 영향이 없으니.

```ts
function noteOn(midi, velocity) {
  // ...소리·파티클...
  if (liveRecording) liveRecNotes.push({ midi, velocity, onT: liveRecTime(), offT: null });
}
```

### 정지 후 오프라인 렌더

정지하면 기록한 이벤트를 노트 배열로 재구성해, 파일 MP4와 똑같은 오프라인 렌더러(실시간이 아니라 미리 한 번에 그려내는 것)에 넘긴다. 완벽한 60fps 프레임 + 샘플 피아노 소리가 나온다(기존 라이브 녹화는 영상만이었다). 렌더러는 파일/라이브 공용으로, 입력만 다르다.

페달을 밟은 채 뗀 음은 페달을 뗄 때까지 울려야 하니, 페달 구간을 노트 길이로 변환해서 넘긴다(파일 MIDI의 서스테인 처리와 같은 규칙).

```ts
// 페달 구간 [down, up) 안에서 뗀 노트는 페달 뗄 때까지 연장
for (const [d, u] of pedal) {
  if (off < u) { if (off >= d) dur = u - e.onT; break; }
}
```

트레이드오프는 정지 후 렌더 시간이 필요하다는 것 — 대신 결과물 품질이 기기 성능과 무관해진다.

---

## 연주를 MIDI로도

기록해 둔 이벤트가 있으니, 영상뿐 아니라 `.mid` 파일로도 뽑을 수 있다. `@tonejs/midi`(이미 파싱에 쓰던 라이브러리)로 노트와 페달(CC64)을 채워 쓴다. DAW에서 그대로 열린다.

```ts
const m = new Midi();
const tr = m.addTrack();
for (const e of liveRecNotes)
  tr.addNote({ midi: e.midi, time: e.onT, duration: (e.offT ?? endT) - e.onT, velocity: e.velocity });
for (const s of liveRecSustain)
  tr.addCC({ number: 64, value: s.down ? 1 : 0, time: s.time }); // 서스테인 페달
await saveOutput(new Blob([m.toArray()]), "keybloom-live", "mid");
```

MIDI엔 페달을 노트 길이로 녹이지 않고 CC64 이벤트 그대로 넣는다 — 재생기가 페달을 해석하게. 영상은 길이로 굽고, MIDI는 이벤트로 남긴다.

---

## 잔손질

### 시작 로딩바 — 로더가 하나여야 진행률이 잡힌다

피아노 샘플 120개를 디코드하는 몇 초 동안 로딩바를 띄우려 했는데, 진행률 콜백(OS·브라우저가 "다음 조각 내놔" 하고 불러 주는 함수)이 안 붙었다. 샘플 로드가 두 군데서 시작되고 있었기 때문이다 — 오디오 컨텍스트(웹 오디오의 작업 공간)를 만들 때 자동으로 한 번, 프리로드에서 또 한 번. 로드 결과는 캐시(한 번만 실행)라, 먼저 부른 "자동 로드"가 이겨서 진행률 콜백 없이 끝나버렸다.

컨텍스트 생성 시의 자동 로드를 없애 프리로드가 유일한 로더가 되게 하니, 그제야 진행률이 들어왔다. 오버레이는 로딩이 끝날 때까지 화면을 덮어 준비 전 사용을 막는다(실패해도 가두지 않게 catch로 제거).

```ts
loadPromise = Promise.all(urls.map(async (u) => {
  buffers.set(u, await ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()));
  onProgress?.(++done, urls.length); // 로더가 하나여야 이 콜백이 붙는다
}));
```

같은 작업을 두 경로가 시작할 수 있으면 콜백·진행률은 먼저 부른 쪽에 매인다. 진행률을 붙이려면 로더를 하나로 모아야 한다.

### 다크 스크롤바

패널이 넘칠 때 뜨는 기본 밝은 스크롤바가 다크 테마와 안 맞았다. 안 보이는 듯하되 잡을 순 있게, 얇고 은은하게 스타일했다(Chromium/WebView2).

```css
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-thumb {
  background: var(--panel-border);
  border: 2px solid transparent;      /* padding-box로 여백 줘 가늘게 */
  background-clip: padding-box;
  border-radius: 6px;
}
```

### 광고는 웹 전용

카카오 애드핏 광고가 네이티브 앱에서 같은 자리에 멈춰 있었다. AdFit은 승인된 웹 도메인에서만 서빙해서, 네이티브 WebView(앱 속에 넣은 브라우저 화면)에선 갱신도 안 되고 외부 호출도 부적절했다. 그래서 광고를 정적 HTML에서 빼고, 웹일 때만 JS로 주입하게 했다.

```ts
export function initAd(): void {
  if (IS_NATIVE) return;              // 네이티브엔 안 실음
  // ...웹에서만 #adBox에 ins + 스크립트 주입...
}
```

그리고 네이티브에선 광고 자리를 CSS로 숨겨 그 공간을 되돌렸다 — 파일 모드는 시퀀서가 폭 전체를, 라이브는 하단을 통째로 숨겨 미리보기를 넓게.

```css
body.native #adBox { display: none; }
body.native.live-mode #bottom { display: none; }
```

레이아웃이 바뀌니 라이브 전환 시 캔버스를 다시 계산해야 했다(창 크기가 안 변해 resize 이벤트가 안 옴 — 직접 호출).

---

## 요약

- 실시간 캡처는 기기 버벅임을 그대로 박는다. 라이브 녹화를 "이벤트 기록 → 정지 후 오프라인 렌더"로 바꿔 품질을 기기와 분리했다(+ 오디오 포함).
- 페달은 영상엔 노트 길이로 굽고, MIDI엔 CC64 이벤트로 남긴다 — 같은 연주, 다른 표현.
- `@tonejs/midi`로 기록한 연주를 `.mid`로 추출(노트 + 페달).
- 시작 로딩바는 로더가 하나여야 진행률이 붙는다 — 같은(캐시되는) 작업을 두 경로가 시작하면 콜백은 먼저 부른 쪽에 매인다.
- 스크롤바는 `::-webkit-scrollbar`로 다크 톤.
- AdFit은 웹 전용 — 네이티브는 JS 주입을 건너뛰고 광고 자리를 CSS로 숨겨 공간을 돌려준다. 레이아웃이 바뀌면 캔버스 재계산을 직접 불러야 한다.
