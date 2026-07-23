---
layout: post
title: 소리꽃 KeyBloom TIL 9
date: 2026-07-06
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
소리꽃에 실시간 연주 모드를 붙이면서 나온 것들. 파일 재생과 라이브 연주를 하나의 엔진으로 합치는 법, 브라우저에서 MIDI 건반·컴퓨터 키보드로 입력받는 법, 웹 오디오 지연이 어디서 오는지, 그리고 전체 상태를 파일 하나로 저장하는 법.

---

## 두 입력 모드를 하나로 — noteOn/noteOff 추상화

파일 재생과 실시간 연주는 겉보기엔 다르지만, "노트가 언제 발생하느냐"만 다르다. 파일은 타임라인 대비 시간으로 note-on을 감지하고, 라이브는 하드웨어 이벤트로 받는다. 그 뒤(파티클 생성·소리·건반 눌림)는 완전히 똑같다.

그래서 두 갈래를 공통 핸들러 두 개로 수렴시켰다.

```ts
// 노트 발생 → 파티클 + 합성음 (두 모드 공통)
function spawnNote(midi, velocity, rp, rpCueId, duration) {
  const key = keyByMidi.get(midi);
  if (!key) return;
  particles.spawn(key.centerX, velocity, rp, rpCueId);
  audio.triggerNote(midi, velocity, duration);
}

// 라이브 입력 핸들러 — Web MIDI/컴퓨터 키보드가 직접 호출
function noteOn(midi, velocity) {
  spawnNote(midi, velocity, params, selectedCueId, 0.4); // 라이브는 duration을 몰라 고정
  livePressed.set(midi, keyColor(midi, params));         // 눌림 상태 등록
}
function noteOff(midi) {
  livePressed.delete(midi);
}
```

차이는 프레임 루프에서 갈린다. 파일 모드는 매 프레임 타임라인을 훑어 note-on을 찾고, 라이브 모드는 이벤트가 알아서 들어오니 훑지 않는다. 눌린 건반 상태도 파일은 시간으로 계산, 라이브는 이벤트로 유지한 `livePressed`를 쓴다.

```ts
const live = mode === "live";
if (!live && t >= lastTime) {
  for (const n of notes) if (n.time >= lastTime && n.time < t) spawnNote(n.midi, /* ... */);
}
const active = live ? livePressed : computeActiveFromTime(t);
```

핵심은 "입력 소스만 바꾸고 그 아래는 그대로"다. 비주얼 엔진(파티클·건반·큐·렌더러)을 한 줄도 안 고치고 실시간 모드가 얹혔다.

---

## Web MIDI로 라이브 건반 받기

브라우저는 MIDI 기기를 표준 API로 직접 읽는다. `navigator.requestMIDIAccess()`로 접근 권한을 얻고, 입력 장치의 메시지를 듣는다.

```ts
const access = await navigator.requestMIDIAccess();
for (const input of access.inputs.values()) {
  input.onmidimessage = (e) => {
    const [status, data1, data2] = e.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && data2 > 0) onNoteOn(data1, data2 / 127); // note-on (velocity>0)
    else if (cmd === 0x80 || (cmd === 0x90 && data2 === 0)) onNoteOff(data1); // note-off
  };
}
```

MIDI 메시지는 3바이트다 — 상태 바이트(명령+채널), 노트 번호, velocity(0~127). note-on인데 velocity가 0이면 관례상 note-off로 친다(장치마다 note-off를 그렇게 보낸다). velocity는 0~1로 정규화해서 넘긴다.

권한 요청은 라이브 모드에 처음 들어갈 때만 lazy하게 했다. 안 그러면 파일 모드만 쓸 사람에게도 시작하자마자 권한 팝업이 뜬다. 그리고 브라우저는 Chrome·Edge만 잘 되고 Safari는 약하다.

---

## 컴퓨터 키보드를 건반으로 (Musical Typing)

MIDI 기기가 없어도 연주·테스트할 수 있게, 컴퓨터 키보드를 건반에 매핑했다. GarageBand의 Musical Typing과 같은 방식이다.

```ts
// 홈row = 흰건반, 윗줄 = 검은건반 (피아노 배열)
const SEMITONE = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6,
  KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, /* ... */
};
let baseMidi = 60; // C4. z/x로 옥타브 이동해 88건반 전체 도달

const held = new Map(); // code → 눌린 midi
function onKeyDown(e) {
  if (e.repeat) return;                       // 오토리핏 무시(keydown이 반복해서 옴)
  if (e.code === "KeyZ") { baseMidi -= 12; return; }
  const off = SEMITONE[e.code];
  if (off === undefined || held.has(e.code)) return;
  const midi = baseMidi + off;
  held.set(e.code, midi);                      // keyup 때 같은 midi로 끄려고 기억
  onNoteOn(midi, 0.7);                          // 세기 감지 없어 고정 velocity
}
function onKeyUp(e) {
  const midi = held.get(e.code);
  if (midi !== undefined) { held.delete(e.code); onNoteOff(midi); }
}
```

빠지기 쉬운 두 가지가 있었다. 하나는 오토리핏 — 키를 누르고 있으면 `keydown`이 계속 날아온다. `e.repeat`로 걸러 첫 눌림만 발음한다. 다른 하나는 옥타브 문제 — 키를 누른 채 옥타브를 바꾸면 note-off의 음이 달라진다. 그래서 눌릴 때의 midi를 `held`에 저장해뒀다가, 뗄 때 그 값으로 꺼야 음이 안 남는다.

컴퓨터 키보드는 한 번에 ~2옥타브만 담기지만, 옥타브 이동으로 창을 옮기면 88건반 어디든 닿는다.

---

## 웹 오디오 지연의 정체

실시간 연주는 지연이 생명이라 줄여보려 했다. 먼저 브라우저에 최소 버퍼를 요청하고, 첫 노트가 컨텍스트 시동에 밀리지 않게 미리 깨웠다.

```ts
new AudioContext({ latencyHint: 0 });   // 가능한 최소 버퍼 요청
// 라이브 진입(버튼 클릭=사용자 제스처)에서 미리 resume → 첫 노트 콜드스타트 제거
audioCtx.resume();
```

그리고 실제 지연이 얼마인지 재서 화면에 띄웠다. 지연은 두 부분이다.

```ts
const total = ctx.baseLatency + ctx.outputLatency; // 초
```

- `baseLatency` — AudioContext 내부 버퍼. 우리가 `latencyHint`로 줄일 수 있는 쪽(~10ms)
- `outputLatency` — OS·장치 출력 버퍼. 브라우저·JS가 못 넘는 바닥

재보니 내부 10ms + 장치 48ms = 58ms였다. 여기서 배운 게 핵심이다 — 브라우저는 Windows에서 WASAPI 공유모드로만 소리를 낸다. 공유모드는 OS 믹서를 거쳐서 버퍼가 크다(수십 ms). DAW가 오디오 인터페이스로 5ms를 내는 건 ASIO(저지연 드라이버)를 쓰기 때문인데, 브라우저는 그 경로에 접근을 못 한다. 그래서 좋은 오디오 인터페이스를 꽂아도 웹에선 저지연이 안 나온다.

즉 웹 오디오의 실시간 지연은 앱 코드로 줄이는 데 한계가 있고, 그 아래는 브라우저·OS의 몫이다. 진짜 저지연이 필요하면 네이티브(ASIO 접근)로 가야 한다는 걸, 막연히 아는 게 아니라 실측 숫자로 확인했다.

---

## 프로젝트를 파일 하나로 저장

큐·시퀀스를 만들어도 새로고침하면 다 날아가서, 전체 상태를 JSON 파일로 저장·복원하게 했다. 서버 없이 다운로드·업로드로 자기완결.

담을 것 중 까다로운 건 MIDI다. 브라우저는 보안상 파일 경로를 기억해 다시 못 연다. 그래서 원본 MIDI 바이트를 base64로 인코딩해 JSON에 임베드했다.

```ts
function bytesToBase64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin); // 파일 안에 MIDI를 통째로 넣음
}
```

그리고 "나중에 기능이 늘어도 저장 코드를 매번 안 고치게" 세 가지로 설계했다.

```ts
// 1. params를 객체째 직렬화 → 새 파라미터가 생겨도 자동 포함
const data = { version: 1, cues, cuePoints, midiBase64, /* ... */ };

// 2. 불러올 때 기본값에 병합 → 옛 파일에 없는 필드는 기본값으로(안 깨짐)
const params = { ...defaultParams, ...loaded.params };

// 3. version 필드 → 포맷이 바뀌면 그때만 마이그레이션
```

이 세 가지 덕에 앞으로 파라미터를 추가해도 저장/불러오기는 대부분 저절로 따라오고, 예전에 저장한 파일도 안 깨지고 열린다. "지금 편하려고"가 아니라 "미래의 나를 위해" 짜두는 부분이다.

---

## 요약

- 파일 재생과 실시간 연주는 "노트가 언제 오느냐"만 다르다 → `noteOn`/`noteOff` 공통 핸들러로 수렴하면 비주얼 엔진을 안 고치고 입력 소스만 교체할 수 있다.
- Web MIDI는 `requestMIDIAccess` + 3바이트 메시지 파싱(`0x90` on / `0x80` off, velocity 0이면 off). 권한은 lazy하게.
- 컴퓨터 키보드는 피아노 배열로 매핑 + 옥타브 이동. 오토리핏은 `e.repeat`로 걸러내고, note-off는 눌릴 때의 midi로 꺼야 한다.
- 웹 오디오 지연 = `baseLatency`(줄일 수 있음) + `outputLatency`(OS 바닥). 브라우저는 WASAPI 공유모드라 ASIO 저지연을 못 써서, 실시간 연주 지연은 웹의 한계.
- 전체 상태 저장은 객체째 직렬화 + 불러올 때 기본값 병합 + `version` 세 가지로 저유지보수. MIDI는 파일 경로를 못 여니 base64로 임베드.
