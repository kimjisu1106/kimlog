---
layout: post
title: 소리꽃 KeyBloom TIL 14
date: 2026-07-19
permalink: "devlog/devlog/TIL/소리꽃 KeyBloom TIL 14"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 소리꽃 내보내기·소리를 파고든 날 — 프레임 단위 오프라인 인코딩(WebCodecs), 실제 피아노 샘플로 멀티샘플링·페달·재타격, 그리고 무료 배포 준비(자기완결 파일·워터마크·다국어·Cloudflare Pages).
tags:
  - JavaScript
  - TypeScript
---
07-19에 배운 것들을 세 갈래로 묶는다 — 내보내기를 프레임 단위 오프라인 인코딩으로 다시 짜기, 합성음을 버리고 실제 피아노 샘플로 갈아타기, 그리고 무료 버전 배포를 준비하기.

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

아침에 배음을 쌓아 만든 합성음이 아무리 다듬어도 진짜 피아노 질감이 안 나서, 실제 녹음 샘플(Salamander Grand Piano, CC-BY)로 갈아탔다. 샘플을 그냥 트는 것과 "피아노처럼 들리게" 트는 것은 다른 문제였다.

## 멀티샘플링 — 샘플 하나로 여러 음

### 가장 가까운 샘플을 빠르게/느리게 재생해 음정 맞추기

88건반을 다 녹음하면 용량이 커진다. 단3도(3반음) 간격으로만 녹음하고, 어떤 음이 오든 가장 가까운 샘플을 골라 재생속도로 음정을 맞춘다. 샘플을 빠르게 재생하면 음정이 올라가고 느리게 재생하면 내려가는데, 이렇게 재생속도로 음정을 올리고 내리는 것을 피치시프트라고 한다. 한 옥타브(12반음) 위는 재생속도 2배 — 그래서 `2^(반음차/12)`.

```ts
const STEP = 3; // 샘플된 피치 간격(minor third) — 어떤 노트든 최근접 샘플과 ±1반음
function nearestPitch(midi: number): number {
  const c = Math.max(LOWEST, Math.min(HIGHEST, midi));
  return Math.round((c - LOWEST) / STEP) * STEP + LOWEST;
}

const pitch = nearestPitch(midi);
src.playbackRate.value = Math.pow(2, (midi - pitch) / 12); // ±1반음 피치시프트
```

간격을 3반음으로 잡으면 어떤 음이든 최근접 샘플과 최대 ±1반음이라, 피치시프트로 인한 음색 왜곡이 귀에 잘 안 띈다.

### 세기별 레이어 + 경계 음량 정규화

피아노는 세게 칠수록 커질 뿐 아니라 음색도 밝아진다. 그래서 건반을 누른 세기(velocity)별로 4단계 레이어를 따로 녹음해 두고 velocity로 고른다. 문제는 원본 레이어마다 녹음 레벨이 4~7dB(dB는 소리 크기 단위인 데시벨)씩 달라서, 같은 velocity인데도 레이어 경계를 넘는 순간 소리가 뚝 커지는 것처럼 들렸다.

레이어는 음색(밝기)만 바꾸고, 음량은 velocity 게인 하나로만 매끄럽게 결정되도록 — 각 레이어의 실측 평균 음량을 재서 보정 계수로 눌러 레벨을 맞췄다.

```ts
const BANDS = 4;
const BAND_COMP = [1.52, 1.0, 0.6, 0.38]; // 레이어별 녹음 레벨 보정(band1 기준 정규화)

function bandFor(velocity: number): number {
  return Math.max(0, Math.min(BANDS - 1, Math.floor(velocity * BANDS)));
}

const vol = BAND_COMP[band] * (0.55 + velocity * 0.7); // 레벨 보정 × velocity 다이내믹스
```

레이어를 나눈 목적(음색 변화)과 음량을 분리한 게 핵심이다. 안 그러면 "세기별 레이어"가 곧 "음량 계단"이 되어 버린다.

## 페달과 재타격

### 서스테인 페달(CC64) — 뗀 뒤에도 울리게 + 빠른 리페달 병합

MIDI의 서스테인 페달은 CC64 값으로 들어온다(0.5 이상이면 밟음). 페달이 밟힌 구간 `[down, up)` 안에서 건반을 떼면, 실제 소리는 페달을 뗄 때까지 이어져야 한다. 그래서 노트의 실효 길이를 "페달이 떼지는 시각까지"로 늘려 준다.

여기에 함정이 하나 — 페달을 짧게 뗐다 곧바로 다시 밟는(리페달) 구간이다. 이때 댐퍼가 완전히 내려오기 전에 다시 밟혀 소리가 이어지는데, 페달 구간을 그대로 쪼개면 그 틈에서 소리가 건조하게 끊긴다. 틈이 아주 짧으면(≤0.15s) 두 구간을 하나로 병합했다.

```ts
const PEDAL_REPEDAL_GRACE = 0.15;

// 빠른 리페달(gap<=GRACE)은 하나로 병합 — 댐퍼가 완전히 안 내려와 소리가 이어지므로
const merged: [number, number][] = [raw[0]];
for (let i = 1; i < raw.length; i++) {
  const last = merged[merged.length - 1];
  if (raw[i][0] - last[1] <= PEDAL_REPEDAL_GRACE) last[1] = raw[i][1];
  else merged.push(raw[i]);
}

// 노트-오프가 페달 구간 안이면 그 페달이 떼질 때까지 울린다
function sustainedDuration(time: number, duration: number, intervals: [number, number][]): number {
  const off = time + duration;
  for (const [d, u] of intervals) {
    if (off < u) return off >= d ? u - time : duration;
  }
  return duration;
}
```

### 같은 음 재타격 — 이전 울림을 빠르게 페이드

실제 피아노는 같은 음을 다시 치면 같은 현을 다시 때려서 두 소리가 겹치지 않는다. 그런데 샘플은 칠 때마다 독립 재생이라, 막지 않으면 이전 울림 위에 새 울림이 쌓여 소리가 2배로 커졌다(특정 구간이 유독 크게 들리던 원인).

피치별로 "마지막 울림"의 게인 노드를 들고 있다가, 같은 음을 다시 치는 순간 이전 울림을 짧게 페이드아웃한다.

```ts
export type LastByMidi = Map<number, { gain: GainNode; end: number }>;

if (last) {
  const prev = last.get(midi);
  if (prev && prev.end > when) {
    prev.gain.gain.cancelScheduledValues(when);
    prev.gain.gain.setTargetAtTime(0.0001, when, 0.015); // 새 타격 순간 이전 울림 빠르게 감쇠
  }
}
```

`setTargetAtTime`은 값을 뚝 바꾸지 않고 목표치로 부드럽게 다가가게 하는 것이라, 소리를 뚝 끊지 않고 자연스럽게 사라지게 한다.

## 전체 음량 다루기

### 전체 소리를 눌러 출렁이던 문제 — 컴프레서를 리미터로 교체

처음엔 마스터에 컴프레서(큰 소리를 눌러 평탄하게 만드는 장치)를 걸었는데, threshold를 낮게(-14 등) 잡으니 평소 소리까지 대부분 눌러 버렸다. 그러면 누르는 양이 그 순간 소리의 밀도에 따라 달라져서, 같은 velocity인데도 화음 구간은 작고 단음 구간은 크게 들리는 출렁임(펌핑)이 생겼다.

목적은 "평소 소리를 매만지기"가 아니라 "클리핑(소리가 최대치를 넘어 깨지는 것) 직전 피크만 막기"였다. threshold를 0 근처(-2)로 올리고 하드 니로 바꿔, 평소 소리는 그대로 두고 피크만 막는 리미터처럼 동작하게 했다.

```ts
export function createMasterChain(ctx: BaseAudioContext, dest: AudioNode): AudioNode {
  const master = ctx.createGain();
  master.gain.value = 0.85;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -2; // 클리핑 직전만
  limiter.knee.value = 0; // 하드 니 — 리미터처럼
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  master.connect(limiter).connect(dest);
  return master;
}
```

### 백그라운드 탭에서도 안 끊기게 — 소리를 미리 예약해 두기

파티클은 화면을 매 프레임 다시 그리는 타이밍(rAF)에 맞춰 그리는데, 탭이 뒤로 가면 브라우저가 이 rAF를 크게 느리게(스로틀) 만들어 버린다. 오디오를 rAF에 묶어 두면 탭을 옮기는 순간 소리가 끊기는 이유가 이것이다. 그래서 오디오를 rAF에서 떼어, 오디오 클럭에 앞으로 1.5초치 노트를 미리 예약하고 200ms마다 채워 넣는다(백그라운드 setInterval 스로틀 ~1s보다 커야 안 끊긴다).

시작할 때 즉시 한 번 채우는 게 중요했다 — 안 그러면 첫 틱(최대 200ms) 지연 사이에 0:00 노트가 과거로 밀려 유실됐다.

```ts
const SCHED_LOOKAHEAD = 1.5; // s — 백그라운드 throttle(~1s)보다 커야 끊김 없음

function startAudioSchedule(fromTime: number): void {
  // ...
  schedActive = true;
  pumpSchedule(); // 즉시 한 번 — 첫 틱 지연에 0:00 노트가 유실되는 것 방지
}

function pumpSchedule(): void {
  const now = audio.now();
  const horizon = now + SCHED_LOOKAHEAD;
  while (schedIdx < notes.length) {
    const n = notes[schedIdx];
    const when = audioBase + (n.time - timelineBase);
    if (when >= horizon) break;
    if (when >= now - 0.05) audio.scheduleNote(n.midi, n.velocity, n.sustain ?? n.duration, Math.max(now, when));
    schedIdx++;
  }
}
```

지난 노트(`when < now`)는 건너뛴다 — 백그라운드에 오래 있다 돌아와도 밀린 노트가 한꺼번에 터지는 "쾅"이 없다.

---

소리를 다 만든 뒤엔 "남에게 줄 수 있는 상태"로 만드는 작업이 남았다. 파일 하나로 완결되게, 무료 워터마크가 안 새게, 한국어 밖 사용자도 쓰게, 그리고 실제로 배포까지.

## 자기완결 프로젝트 파일

### 오디오를 파일에 통째로 임베드 (base64)

브라우저는 보안상 파일의 절대경로를 못 읽는다. 그래서 프로젝트에 "오디오 파일 경로"를 저장하는 건 웹에서 불가능하다. 유일한 자기완결 방법은 오디오의 바이트(0·1 덩어리)를 글자로 바꿔 프로젝트 파일 텍스트 안에 넣는 것(이 방식을 base64라고 한다) — MIDI를 넣던 방식 그대로.

```ts
// 저장 — 오디오 바이트를 base64로
const af = audio.sourceFile;
if (af) {
  audioBase64 = bytesToBase64(new Uint8Array(await af.arrayBuffer()));
  audioType = af.type || null;
}

// 복원 — base64 → File 재구성
const bytes = base64ToBytes(d.audioBase64) as Uint8Array<ArrayBuffer>;
const file = new File([bytes], d.audioName ?? "audio", { type: d.audioType ?? "" });
```

여기서 타입 표기가 서로 안 맞는 문제가 하나 있었다 — 복원한 바이트의 타입과 `File` 생성자가 기대하는 타입이 달라서, 실제 데이터는 멀쩡한데 컴파일러만 막았다. 한 줄로 형을 맞춰(`as Uint8Array<ArrayBuffer>`) 해소했다. 트레이드오프는 파일 크기 — 오디오만큼 `.kbloom`이 커지지만(mp3 5MB → ~7MB), 네이티브 앱으로 옮겨도 같은 파일이 그대로 열린다.

### 커스텀 확장자가 파일 선택창에서 회색? 종류 꼬리표를 '아무 바이너리'로

파일 선택창(File System Access 픽커)에 `.kbloom`을 `application/json`으로 등록했더니, 크롬이 "확장자가 그 MIME과 안 맞는다"며 파일을 회색 처리해 선택조차 못 하게 했다. MIME은 브라우저가 파일 종류를 알아보는 꼬리표인데, 커스텀 확장자는 특정 종류로 묶으면 안 되고 '아무 바이너리(octet-stream)'로 등록해야 파일 선택창에서 회색 처리가 안 된다.

```ts
// ❌ application/json — 크롬이 .kbloom을 회색 처리(선택 불가)
// ✅ application/octet-stream
const OPEN_TYPES: PickerType[] = [
  { description: "KeyBloom 프로젝트", accept: { "application/octet-stream": [".kbloom", ".json"] } },
];
```

`.json`을 함께 둔 건 구버전 파일 호환용이다.

## 내보내기 보호·선택

### 워터마크를 미리보기에도 그려 화면 녹화 우회 차단

무료 버전은 내보낸 영상에 워터마크를 박는다. 그런데 워터마크를 내보내기 경로에만 그리면, 깨끗한 미리보기 화면을 화면 녹화 소프트웨어로 찍어 워터마크 없는 영상을 얻을 수 있다. 그래서 무료 빌드에서는 미리보기 프레임에도 항상 워터마크를 그린다.

```ts
// 매 프레임(미리보기)에서도 — 화면 녹화 우회 차단
if (IS_FREE) drawWatermark(ctx, view);
```

화질 좋은 오프라인 렌더 경로와 실시간 미리보기 양쪽 모두에 같은 draw를 태워, "워터마크 없는 깨끗한 화면"이 어디에도 안 남게 했다.

### 오디오 소스 선택을 미리보기·내보내기에 WYSIWYG로

프로젝트에 오디오가 있어도 파일 / 샘플 피아노 / 무음 중에 고를 수 있게 했다. 핵심은 이 선택이 미리보기와 내보내기에서 똑같이 적용되는 것(보이는 대로 나오는 것). 그래서 소스 적용을 한 함수로 모으고, 내보내기가 잠시 소스를 바꿔도 끝나면 미리보기 설정으로 되돌린다.

```ts
function applyAudioSource(src: "file" | "sample" | "none"): void {
  audio.setUseFile(src === "file");
  audio.setMuted(src === "none");
}
```

## 초경량 다국어

### t(ko, en) 인라인 + 자동 감지 + 전환

키 딕셔너리(`{"save": {...}}`)를 만드는 대신, 각 문자열 자리에서 바로 `t("한국어", "English")`로 감쌌다. 규모가 작을 땐 이게 훨씬 가볍다 — 번역이 코드 옆에 붙어 있어 문맥이 안 흩어진다. 언어는 저장값 우선, 없으면 브라우저 언어로 자동 감지하고, 전환은 저장 후 새로고침(화면을 한 번만 만들고 다시 안 그리는 구조라, 언어 전환은 다시 그리는 대신 새로고침으로 처리).

```ts
export const lang: Lang = detect(); // localStorage 우선, 없으면 navigator.language

export function t(ko: string, en: string): string {
  return lang === "en" ? en : ko;
}

export function setLang(l: Lang): void {
  if (l === lang) return;
  localStorage.setItem(KEY, l);
  location.reload();
}
```

## 인앱 도움말 · 배포

### 플로팅 버튼이 겹칠 때 — open 함수를 돌려주는 패턴

도움말을 우하단 플로팅 버튼으로 뒀더니 재생 슬라이더와 겹쳤다. 버튼은 패널 탭 안으로 옮기고, 도움말 모듈은 모달만 만들어 body에 붙인 뒤 "여는 함수"를 반환하게 했다. 그러면 여는 주체(탭 버튼)와 모달이 서로 몰라도 되고, 버튼 위치를 바꿔도 모달 코드는 그대로다.

```ts
export function createHelp(): () => void {
  // ...모달 DOM 구성...
  document.body.append(overlay);
  return open; // 여는 버튼은 호출부가 원하는 곳에 배치
}

// 호출부(main): 만들고 → 컨트롤 핸들러로 넘김
const openHelp = createHelp();
const controls = createControls(panel, params, { onHelp: openHelp, /* ... */ });
```

모달엔 "프로젝트는 서버에 저장되지 않으니 파일로 직접 보관하라"는 고지를 함께 넣었다 — 로컬 전용 앱이라 이걸 안 알리면 새로고침에 작업이 날아간다.

### Vite 정적 빌드를 Cloudflare Pages로 + 외부 광고 스크립트

`npm run build`가 정적 사이트 빌드 도구(Vite)로 `dist/`에 정적 파일만 뽑으므로(서버 로직 없음) Cloudflare Pages가 맞다(Workers 불필요). 빌드 커맨드 `npm run build`, 출력 디렉토리 `dist`만 지정하면 된다. 카카오 광고 스크립트는 호스트가 붙은 외부 URL(`//t1.kakaocdn.net/...`)이라, Vite가 번들 대상으로 보지 않고 그대로 통과시킨다 — 빌드 결과에 스니펫이 손대지 않은 채 남는다.

```html
<div id="adBox">
  <ins class="kakao_ad_area" style="display: none"
    data-ad-unit="DAN-..." data-ad-width="250" data-ad-height="250"></ins>
  <script src="//t1.kakaocdn.net/kas/static/ba.min.js" async></script>
</div>
```

---

## 요약

- 오프라인 인코딩은 "시계가 아니라 프레임 카운터가 시간" — `VideoEncoder`에 프레임을 내 속도로 넣으니 하드웨어가 느려도 프레임이 안 빠진다. MP4는 avcC 포맷(`avc: { format: "avc" }`), 코덱은 `isConfigSupported`로 프로파일 폴백.
- 백그라운드 탭 스로틀은 `MessageChannel` yield로 회피, 메모리는 `encodeQueueSize` 백프레셔 + `VideoFrame.close()`, GB급은 FSA 쓰기 스트림 + `fastStart:false`로 디스크 직행.
- 합성음은 `OfflineAudioContext` 전체 렌더 → `AudioData` 청킹 → AAC/Opus 폴백. tail 길이가 동적이라 오디오는 비디오 뒤에. 피아노 음색 = 배음 파셜(인하모니시티) + 2단 감쇠 + velocity 로우패스 + 마스터 컴프레서. 보이스를 `BaseAudioContext` 공용 함수로 두면 실시간·오프라인이 같은 소리.
- 렌더는 전용 캔버스·딥클론으로 미리보기와 격리, 알파 제약은 UI + 진입점 이중 방어.
- 멀티샘플링은 간격을 좁게(±1반음) 잡아 피치시프트 왜곡을 숨기고, 세기 레이어는 음색만·음량은 velocity 게인으로(레벨 정규화). 서스테인은 노트 실효 길이 문제, 빠른 리페달은 병합, 재타격은 이전 울림 페이드.
- 마스터는 컴프레서가 아니라 피크만 막는 리미터로(밀도 펌핑 방지). 오디오를 rAF에서 떼어 룩어헤드로 예약하면 백그라운드 탭에서도 안 끊긴다.
- 웹은 파일 경로를 못 저장하니 오디오를 base64로 임베드(TS는 `ArrayBuffer` 캐스팅 한 줄). 커스텀 확장자 픽커는 `application/octet-stream`. 워터마크는 미리보기까지 그려야 화면 녹화 우회를 막는다.
- 규모가 작으면 `t(ko,en)` 인라인이 가볍다(자동 감지 + reload). 겹치는 UI는 "open 함수 반환"으로 분리. 정적 Vite 앱은 Cloudflare Pages(build `npm run build`, output `dist`), 외부 스크립트는 호스트가 있으면 Vite가 그대로 통과.
