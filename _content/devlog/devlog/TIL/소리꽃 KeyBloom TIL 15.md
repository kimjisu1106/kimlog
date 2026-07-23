---
layout: post
title: 소리꽃 KeyBloom TIL 15
date: 2026-07-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 합성음을 버리고 실제 피아노 샘플로 소리를 내며 배운 것 — 최근접 샘플 피치시프트, 세기별 레이어 정규화, 서스테인 페달과 재타격, 그리고 리미터·룩어헤드 스케줄러로 음량과 백그라운드를 다루는 법.
tags:
  - JavaScript
  - TypeScript
---
아침에 배음을 쌓아 만든 합성음이 아무리 다듬어도 진짜 피아노 질감이 안 나서, 실제 녹음 샘플(Salamander Grand Piano, CC-BY)로 갈아탔다. 샘플을 그냥 트는 것과 "피아노처럼 들리게" 트는 것은 다른 문제였다.

---

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

---

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

---

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

## 요약

- 멀티샘플링은 간격을 좁게(±1반음) 잡아 피치시프트 왜곡을 숨긴다.
- 세기별 레이어는 음색만 바꾸게 하고, 음량은 velocity 게인 하나로 — 레이어 녹음 레벨은 실측해서 정규화.
- 서스테인 페달은 노트 실효 길이를 늘리는 문제이고, 빠른 리페달은 병합해야 소리가 안 끊긴다.
- 같은 음 재타격은 이전 울림을 `setTargetAtTime`로 짧게 페이드해 겹침을 막는다.
- 마스터는 평소 소리를 누르는 컴프레서가 아니라 피크만 막는 리미터로 — 밀도 펌핑 방지.
- 오디오를 rAF에서 떼어 룩어헤드로 미리 예약하면 백그라운드 탭에서도 안 끊기고, 시작 즉시 pump로 첫 노트 유실을 막는다.
