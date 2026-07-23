---
layout: post
title: 소리꽃 KeyBloom TIL 14
date: 2026-07-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 화면 실시간 녹화를 프레임 단위 WebCodecs 오프라인 인코딩으로 바꾸며 배운 백프레셔·백그라운드 탭 회피·디스크 직행, 그리고 배음 합성 피아노 소리를 실시간·오프라인 공용으로 만든 이야기.
tags:
  - JavaScript
  - TypeScript
---
소리꽃 내보내기를 실시간 캔버스 녹화에서 프레임 단위 오프라인 인코딩(WebCodecs + mp4-muxer)으로 바꾸고, 얇던 합성음을 배음 합성 피아노로 만들며 배운 것들. 실시간에 안 묶인 인코딩이 왜 프레임 드랍을 없애는지, 백그라운드 탭에서도 멈추지 않게 하는 법, GB급 파일을 메모리 없이 저장하는 법, 그리고 같은 소리 코드를 실시간·오프라인 양쪽에서 쓰는 설계.

---

## 프레임 단위 오프라인 인코딩

### 실시간 캡처 대신 프레임을 직접 인코더에 넣는다

기존 내보내기는 `canvas.captureStream()` + `MediaRecorder`로 화면을 실시간 녹화했다. 재생 속도로 흘러가며 찍으니, 4K처럼 무거우면 컴퓨터가 못 따라가 프레임을 떨어뜨린다.

WebCodecs(브라우저가 영상을 직접 압축·해제하게 해주는 기능)의 `VideoEncoder`는 프레임을 내가 원하는 속도로 한 장씩 넣을 수 있다. 재생과 무관하게 루프를 돌며 렌더→인코딩하니, 하드웨어가 느리면 그냥 오래 걸릴 뿐 프레임은 안 빠진다.

```ts
const encoder = new VideoEncoder({
  output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
  error: (e) => (encoderError = e),
});
encoder.configure(config);

for (let i = 0; ; i++) {
  // ...이 프레임 상태를 계산해서 전용 캔버스에 그림...
  const vf = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / 60) }); // µs 단위
  encoder.encode(vf, { keyFrame: i % 120 === 0 });
  vf.close();
}
```

타임스탬프는 마이크로초 단위 정수다. `i번째 프레임 = i / 60초 = i * 1e6 / 60 µs`. 실시간의 "지금 시각"이 아니라 프레임 번호로 시간을 만드는 게 오프라인 렌더의 핵심 — 시계가 아니라 카운터가 시간이다.

---

### 압축 조각들을 하나의 mp4 상자로 포장하기 (muxer)

인코더는 압축된 영상 조각만 뱉는다. 이 조각들을 하나의 `.mp4` 상자에 순서대로 담아 재생 가능한 파일로 포장하는 일은 먹서(muxer)가 맡는다 — 그래서 `mp4-muxer`를 썼다. 조각을 담는 상자 형식 자체를 컨테이너라고 부른다.

```ts
const muxer = new Muxer({
  target,
  video: { codec: "avc", width, height, frameRate: 60 },
  audio: audioCodec ? { codec: "aac", sampleRate: 48000, numberOfChannels: 2 } : undefined,
  fastStart: false,
});
```

함정은 인코더가 조각을 내보내는 형식이었다. 같은 H.264라도 조각을 이어붙이는 방식이 두 가지인데, MP4 상자는 그중 한 가지(avcC)만 받는다. 그래서 인코더에 "이 형식으로 뱉어라"라고 명시해야 한다.

```ts
const config: VideoEncoderConfig = {
  codec, width, height, bitrate, framerate: 60,
  avc: { format: "avc" },  // annexb 아님 — mp4-muxer가 avcC(description)를 요구
};
```

이 옵션을 빼면 인코더가 상자와 안 맞는 형식으로 뱉어 먹서가 파일 헤더를 못 만든다. 상자(컨테이너) 형식과 조각 형식을 서로 맞추는 건 늘 확인할 지점이다.

---

### 기기마다 지원 화질이 달라 — 되는 규격부터 시도

영상 규격에는 화질 등급이 여러 개 있는데, 기기(GPU)마다 지원하는 등급이 다르다. 그래서 가장 좋은 등급부터 시도하고, 안 되면 한 단계씩 낮춰 처음 되는 걸 쓴다(High→Main→Baseline). 이렇게 안 되면 아래로 물러나는 걸 폴백이라 한다. 코드의 `avc1.PPCCLL`은 이 등급·화질을 나타내는 약속된 표기라 그대로 두었다.

```ts
const level = height >= 2160 ? "34" : height >= 1080 ? "2a" : "20"; // 5.2 / 4.2 / 3.2
for (const profile of ["6400", "4d00", "4200"]) {                   // High / Main / Baseline
  const config = { codec: `avc1.${profile}${level}`, /* ... */ };
  if ((await VideoEncoder.isConfigSupported(config)).supported) return config; // 첫 지원 채택
}
return null; // 전부 실패 → 실시간 WebM으로 안내
```

`isConfigSupported`로 실제 지원을 물어보고 첫 성공을 쓴다. 코덱 문자열을 하드코딩하면 특정 기기에서만 조용히 실패하니, "후보 목록 + 지원 질의"가 안전하다.

---

## 실시간에 안 묶기

### 탭을 옮겨도 안 멈추게 — 잠깐 손 놓기 (MessageChannel)

긴 작업을 쉬지 않고 돌리면 화면이 멈춰 보인다. 그래서 중간중간 잠깐 손을 놓아 화면이 숨 쉴 틈을 줘야 한다(이걸 양보, yield라 한다). 그런데 보통 쓰는 방법(`setTimeout`·`requestAnimationFrame`)은 사용자가 다른 탭을 보고 있으면 브라우저가 절전을 위해 일부러 느리게 만든다(스로틀) — 렌더 도중 탭을 옮기면 인코딩이 기어간다.

`MessageChannel`(브라우저 안에서 메시지를 주고받는 통로)의 postMessage는 백그라운드에서도 느려지지 않는다.

```ts
const chan = new MessageChannel();
chan.port1.start();
const yieldUI = () => new Promise(r => {
  chan.port1.addEventListener("message", () => r(), { once: true });
  chan.port2.postMessage(0);   // 다음 매크로태스크에 즉시 재개 (탭 상태 무관)
});
// 루프 안: if (i % 4 === 0) { onProgress(...); await yieldUI(); }
```

"작업을 쪼개 양보하되 스로틀은 피한다"는 요구에 `setTimeout(0)`은 안 맞고 `MessageChannel`이 정답이었다. 렌더 도중 탭을 옮겨도 끝까지 완주하는 걸 확인했다.

---

### 대기줄이 넘치지 않게 — 배수 속도에 맞추기 (백프레셔)

인코더가 처리하는 속도보다 프레임을 빨리 밀어 넣으면 대기줄이 끝없이 쌓여 메모리가 터진다. 수도꼭지를 배수 속도에 맞추듯, 대기줄(`encodeQueueSize`)이 일정 개수(여기선 4개)를 넘게 밀리면 잠깐 멈춰 빠질 때까지 기다린다 — 이렇게 밀어 넣는 쪽 속도를 뒤에서 조절하는 걸 백프레셔라 한다.

```ts
encoder.encode(vf, { keyFrame: i % 120 === 0 });
vf.close();  // ★ GPU 프레임 메모리 즉시 반환 — 안 하면 몇 프레임 만에 스톨
while (encoder.encodeQueueSize > 4) await onceDequeue(encoder); // 큐가 빠질 때까지 대기
```

두 가지가 다 필수였다. `vf.close()`를 빼면 프레임 한 장이 GPU 메모리를 붙잡은 채 안 놓아 금방 멈추고, 백프레셔가 없으면 대기줄이 폭주한다. 다 쓴 자원을 자동 정리(GC)에 맡기지 않고 손으로 직접 닫아줘야 하는 것(`VideoFrame`·`AudioData`)이 WebCodecs엔 여럿이다.

---

### 메모리에 안 쌓고 디스크로 바로 흘려보내기

1080p 5분이 약 0.5GB, 4K는 GB급이다. 완성될 영상을 메모리에 다 쌓아뒀다가 저장하면 큰 영상에서 터진다. 그래서 먹서가 조각을 뱉는 족족 File System Access 쓰기 통로에 물려 디스크로 바로 흘려보냈다.

```ts
const handle = await showSaveFilePicker({ suggestedName: "keybloom.mp4", /* ... */ });
const writable = await handle.createWritable();
const target = new FileSystemWritableFileStreamTarget(writable);
// muxer({ target, fastStart: false })  ← moov를 뒤에 둬 메모리 상주 없이 순차 기록
```

`fastStart: false`가 짝이다 — MP4의 목차(moov, 어느 지점에 무슨 조각이 있는지 표)를 파일 앞에 두려면 전체를 다 만들어 메모리에 쥐고 있어야 하는데, 목차를 맨 뒤에 두면 조각을 나오는 대로 순차로 흘려보낼 수 있다. 저장 픽커는 클릭(사용자 제스처) 직후 열어야 권한이 유효하고, 취소(`AbortError`)는 정상 흐름으로 처리한다.

---

## 오디오 트랙

### 합성음 전체를 미리 한 번에 만들어두기 (OfflineAudioContext)

지금까지 녹화엔 프로그램이 만든 소리(합성음)가 아예 안 담겼다(실시간 `MediaRecorder`가 오디오 파일만 먹싱). 오프라인 경로에선 합성음을 곡 전체 길이로 한 번에 렌더할 수 있다. `OfflineAudioContext`는 소리를 스피커로 내보내지 않고 실시간보다 빠르게 미리 계산만 해두는 작업대다.

```ts
export async function renderPianoNotes(notes, totalSec, sampleRate = 48000) {
  const ctx = new OfflineAudioContext(2, Math.ceil(totalSec * sampleRate), sampleRate);
  const master = createMasterChain(ctx, ctx.destination);
  for (const n of notes) playPianoVoice(ctx, master, midiToFreq(n.midi), n.velocity, n.duration, n.time);
  return ctx.startRendering(); // 실시간보다 빠르게 전체 PCM 생성
}
```

`OfflineAudioContext`는 실시간 제약이 없어 수천 노트도 시간만 들이면 정확히 렌더된다. 오디오 파일이 있으면 그걸 `decodeAudioData`로, 없으면 이 합성음을 트랙으로 넣는다.

---

### 소리를 조각내 넣기 + 코덱 폴백

오디오 인코더엔 소리 원본(PCM, 압축 전 소리 데이터)을 작은 조각으로 나눠 넣는다. 2채널을 f32-planar(왼쪽 전부 → 오른쪽 전부) 레이아웃으로 담았다.

```ts
const CHUNK = 4800; // 0.1초
for (let off = 0; off < total; off += CHUNK) {
  const n = Math.min(CHUNK, total - off);
  const data = new Float32Array(n * 2);
  data.set(L.subarray(off, off + n), 0);   // [L…]
  data.set(R.subarray(off, off + n), n);   // [R…]
  const ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: n,
    numberOfChannels: 2, timestamp: Math.round(off / 48000 * 1e6), data });
  enc.encode(ad); ad.close();
}
```

오디오 코덱도 지원을 물어 폴백했다 — AAC(`mp4a.40.2`) → Opus(mp4-muxer가 MP4 안 Opus 지원) → 둘 다 안 되면 소리 없이 영상만.

```ts
// AudioEncoder.isConfigSupported로 AAC → Opus → null 순서로 판정
```

---

### 영상 총 길이를 다 그려봐야 알아서 — 오디오는 비디오 뒤에

곡이 끝나도 파티클이 사라질 때까지 꼬리 프레임(tail)을 더 그린다(최대 4초). 그래서 영상 총 길이를 루프가 끝나야 안다. 오디오는 그 길이에 맞춰야 하니 비디오를 다 인코딩한 뒤에 처리했다.

```ts
await encoder.flush();
const actualTotalSec = i / 60;              // tail 포함 실제 길이 — 이제 확정
if (audioConfig) {
  const pcm = await getAudioPcm(cfg, actualTotalSec);  // 이 길이로 패딩/컷
  await encodeAudio(pcm, audioConfig, muxer);
}
muxer.finalize();
```

mp4-muxer는 비디오·오디오 트랙의 타임스탬프가 독립이라 넣는 순서는 상관없다. "총 길이를 뒤늦게 안다"는 제약을 인코딩 순서로 자연스럽게 풀었다.

---

## 피아노 합성음

### 배음을 쌓아 두툼한 피아노 소리 만들기

기존은 삼각파(triangle) 발진기 하나라 소리가 얇았다. 실제 악기 음색은 기본음 위에 배음이 쌓여 만들어지니, sine 파셜 여러 개를 겹쳤다. 피아노는 현의 강성 때문에 배음이 정수배보다 살짝 높다(인하모니시티) — 그 살짝 벌어짐을 넣어야 "피아노스럽다".

```ts
const PARTIAL_GAINS = [1.0, 0.55, 0.3, 0.15];  // 기본음이 지배, 상위는 색채만
const INHARMONICITY = 0.0003;
for (let n = 1; n <= 4; n++) {
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = freq * n * Math.sqrt(1 + INHARMONICITY * n * n); // 배음이 살짝 높게
  const pg = ctx.createGain();
  pg.gain.setValueAtTime(PARTIAL_GAINS[n - 1], when);
  if (n >= 2) pg.gain.exponentialRampToValueAtTime(g * 0.1, when + dur / n); // 상위일수록 빨리 죽음
  osc.connect(pg).connect(env);
}
```

상위 파셜을 더 빨리 감쇠시키는 게 포인트 — 시간이 갈수록 소리가 순해지는 실제 현의 특성이다.

---

### 때리는 순간 훅 컸다 여운이 길게 — 2단 감쇠

피아노는 때리는 순간 훅 커졌다가 빠르게 줄고, 그 뒤 길게 여운이 남는다. 소리 크기가 시간에 따라 변하는 이 곡선을 엔벨로프라 하는데, 한 번의 감쇠로는 안 되고 2단으로 나눴다.

```ts
env.gain.setValueAtTime(0.0001, when);
env.gain.exponentialRampToValueAtTime(peak, when + 0.005);      // 해머 어택
env.gain.exponentialRampToValueAtTime(peak * 0.3, when + 0.12); // 1단: 타격 직후 급감
env.gain.exponentialRampToValueAtTime(0.0001, when + dur);      // 2단: 긴 꼬리 (최대 2.5s)
```

세게 칠수록 밝게(고음 성분 많이) 들리도록, 고음을 깎는 필터(로우패스)의 문턱을 velocity(건반을 얼마나 세게 눌렀는지)에 연동하고, 시간이 가며 어두워지게 서서히 낮췄다.

```ts
lp.frequency.setValueAtTime(freq * 2 + 800 + velocity * 4500, when); // 세게 = 밝게
lp.frequency.exponentialRampToValueAtTime(freq * 2 + 400, when + dur); // 점점 어둡게
```

---

### 화음이 뭉개지지 않게 — 마스터 단에서 총량 관리

기존엔 각 음이 출력에 곧장 연결돼서, 화음을 누르면 여러 음이 합쳐져 소리 크기가 한계(1.0)를 넘어 찌그러졌다(클리핑). 컨텍스트마다 마스터 체인(게인 + 컴프레서)을 한 번 만들어 모든 보이스를 그리로 모았다.

```ts
export function createMasterChain(ctx: BaseAudioContext, dest: AudioNode): AudioNode {
  const master = ctx.createGain(); master.gain.value = 0.7;
  const comp = ctx.createDynamicsCompressor(); // 합산 피크를 눌러 클리핑 방지
  comp.threshold.value = -18; comp.ratio.value = 3.5; /* ... */
  master.connect(comp).connect(dest);
  return master; // 보이스는 destination이 아니라 이걸 향한다
}
```

폴리포니(동시 발음)가 있는 신스는 마스터 단에서 합을 관리해야 한다 — 개별 보이스 볼륨만 낮추면 화음/단음 밸런스가 무너진다.

---

### BaseAudioContext 공용 함수 — 실시간·오프라인 한 코드

이 전부의 핵심 설계는 소리 한 음을 만드는 함수(보이스)를 특정 작업대에 묶지 않은 것이다. `playPianoVoice(ctx: BaseAudioContext, ...)`로 두니, 실시간 작업대(연주 미리보기)와 오프라인 작업대(내보내기 렌더)가 같은 함수를 쓴다.

```ts
// 실시간: 지금 시각에 재생
triggerNote(midi, velocity, duration) {
  playPianoVoice(this.ctx, this.master, midiToFreq(midi), velocity, duration, this.ctx.currentTime);
}
// 오프라인: 각 노트를 자기 시각에 예약 (위 renderPianoNotes)
playPianoVoice(ctx, master, midiToFreq(n.midi), n.velocity, n.duration, n.time);
```

실시간용과 오프라인용은 뿌리가 같은 작업대(공통 상위 타입 `BaseAudioContext`)라, 소리를 만드는 방법이 완전히 같다. 소리를 한 번만 정의하고 두 경로가 공유하니, "미리보기 소리와 내보낸 소리가 다르다"는 문제가 원천적으로 없다.

---

## 미리보기와 격리 · 제약 처리

### 렌더용 복사본을 따로 만들어 미리보기와 분리

오프라인 렌더는 화면에 보이는 미리보기(`#stage`)를 건드리면 안 된다. 그래서 화면과 별개인 전용 캔버스 + 자체 파티클/렌더러를 따로 만들고, 큐 데이터는 통째로 깊이 복제해(딥클론) 넘겼다.

```ts
const canvas = document.createElement("canvas");        // 화면과 별개
const ps = new ParticleSystem();                        // 자체 인스턴스
const renderer = new ParticleRenderer();
renderer.warm(cfg.cues.map(c => ({ cueId: c.id, params: c.params })));
// main에서: cues.map(c => ({ ...c, params: cloneParams(c.params) })) ← 렌더 중 편집과 격리
```

렌더 도중 사용자가 큐를 편집해도(숫자키 큐 전환 등) 렌더에 영향이 없다 — 넘긴 건 복제본이니까.

---

### 짧은 규칙은 공유 대신 복제 — 순환 참조를 피해

프레임을 그리려면 main 쪽의 몇몇 규칙(어느 큐가 켜져 있나·건반 색·잔광 감쇠)이 필요했다. 그런데 내보내기 모듈은 main이 불러다 쓰는 쪽이라, 반대로 내보내기 모듈이 main을 불러오면 서로가 서로를 부르는 순환 참조가 된다(모듈 로딩이 꼬인다). 규칙이 몇 줄뿐이라 그대로 복제하고 "main과 동일 규칙"이라는 주석을 달아 처리했다.

```ts
// main.ts activeCueIdAtTime과 동일 규칙(역방향 import는 순환이라 소량 복제)
const activeCueIdAtTime = (t) => { let id = 1; for (const p of cfg.cuePoints) { if (p.time <= t) id = p.cueId; else break; } return id; };
```

공용 모듈로 뺄 수도 있었지만(더 정석), 순수하고 짧은 규칙 몇 줄이라 복제 + 주석이 더 가벼웠다. 무엇을 공유하고 무엇을 복제할지는 결합도와 크기로 가른다.

---

### 투명 배경은 MP4로 못 뽑는다 — 두 겹 방어 + 취소 정리

투명 배경(알파)은 MP4(H.264) 형식엔 담을 자리가 없어 못 뽑는다. 그래서 UI에서 둘을 같이 못 고르게 하고, 실제 진입점에서도 한 번 더 막았다.

```ts
// UI: 알파 선택 시 mp4 옵션 disable + webm 강제 / mp4 선택 시 alpha disable / 라이브 모드도 webm 강제
// main: format === "mp4" && mode === "file" 일 때만 오프라인 경로 진입 (이중 방어)
```

취소 시엔 인코더를 닫고 먹서를 마무리(finalize)하지 않은 채 쓰기 통로를 중단해, 반쯤 쓰다 만 파일을 폐기한다.

```ts
if (encoder.state !== "closed") encoder.close();
if (writable) await writable.abort();  // 반쯤 쓴 파일 버림 (finalize 안 함)
```

UI 잠금만으론 콘솔 우회가 뚫리니 진입점 방어를 같이 두는 건, 앞서 유료 게이팅에서 배운 것과 같은 원칙이다.

---

## 요약

- 오프라인 인코딩은 "시계가 아니라 프레임 카운터가 시간" — `VideoEncoder`에 프레임을 내 속도로 넣으니 하드웨어가 느려도 프레임이 안 빠진다.
- MP4는 avcC 포맷(`avc: { format: "avc" }`), 코덱 문자열은 `isConfigSupported`로 프로파일 폴백.
- 백그라운드 탭 스로틀은 `MessageChannel` yield로 회피, 메모리는 `encodeQueueSize` 백프레셔 + `VideoFrame.close()`로 관리, GB급은 FSA 쓰기 스트림 + `fastStart:false`로 디스크 직행.
- 합성음은 `OfflineAudioContext`로 전체 렌더 → `AudioData` 청킹 → AAC/Opus 폴백. tail 길이가 동적이라 오디오는 비디오 뒤에.
- 피아노 음색 = 배음 파셜(인하모니시티) + 2단 감쇠 + velocity 로우패스 + 마스터 컴프레서(화음 클리핑 방지).
- 보이스를 `BaseAudioContext` 공용 함수로 두면 실시간·오프라인이 같은 소리를 낸다 — 재사용의 핵심.
- 렌더는 전용 캔버스·인스턴스·딥클론으로 미리보기와 격리. 순환을 피해야 하는 짧은 규칙은 복제 + 주석, 알파 제약은 UI + 진입점 이중 방어.
