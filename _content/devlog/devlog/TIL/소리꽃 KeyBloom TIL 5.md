---
layout: post
title: 소리꽃 KeyBloom TIL 5
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
  - WebAPI
---
## 오디오 파일 없이 오실레이터로 음 내기

소리꽃은 사용자가 오디오 파일을 안 넣어도 타이밍 확인용으로 소리가 나면 좋겠다 싶었다. 그런데 진짜 피아노 음색(샘플러)은 음원 파일을 어딘가에서 불러와야 하고, 소리꽃은 서버 없이 오프라인으로 완결하는 게 원칙이라 외부 호출을 안 하고 싶었다. 그래서 브라우저 내장 Web Audio의 오실레이터로 간단한 합성음을 냈다. 샘플 파일 없이도 소리가 난다.

---

## AudioContext — 소리의 시작점

Web Audio는 `AudioContext`라는 오디오 그래프 위에서 돈다. 노드들을 연결해 소리를 만든다. 브라우저 정책상 사용자 제스처(클릭 등) 뒤에 `resume()`을 불러야 소리가 난다.

```js
const ctx = new AudioContext();
// 재생 버튼 눌렀을 때
ctx.resume();
```

---

## MIDI 노트를 주파수로

건반의 음 높이는 MIDI 노트 번호로 온다. 이걸 소리의 주파수(Hz)로 바꿔야 한다. 기준은 A4(라, MIDI 69번)가 440Hz이고, 반음 올라갈 때마다 2의 12제곱근 배가 된다.

```js
const freq = 440 * Math.pow(2, (midi - 69) / 12);
```

---

## note-on마다 오실레이터 + 게인 엔벨로프

노트가 켜질 때마다 오실레이터(파형 발생기) 하나를 만들어 그 주파수로 잠깐 울리고 끈다. 그냥 켰다 끄면 "딱" 하는 클릭 잡음이 나서, 게인(볼륨)으로 빠르게 커졌다 사라지는 엔벨로프를 씌운다.

```js
function triggerNote(midi, velocity, duration) {
  const now = ctx.currentTime;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;

  const peak = 0.02 + velocity * 0.18; // 세게 칠수록 큰 소리
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);       // 빠른 어택
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // 서서히 감쇠

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}
```

한 가지 함정 — `exponentialRampToValueAtTime`은 목표값이 0이면 안 된다(지수는 0에 못 닿음). 그래서 0 대신 아주 작은 값(0.0001)으로 오르내린다. 이 미세한 값 덕분에 클릭 잡음 없이 부드럽게 시작하고 끝난다.

velocity(세기)로 최대 볼륨을, duration(음 길이)으로 울리는 시간을 정한다. `osc.stop`으로 자동으로 꺼지니 정리도 필요 없다.

---

## 오디오 파일이 있으면 합성음은 끈다

합성음은 어디까지나 타이밍 확인용이다. 사용자가 자기 연주 오디오 파일을 넣으면 그걸 재생하고 합성음은 발동하지 않게 했다. 그래서 최종 영상엔 사용자 오디오만 실린다.

- 오디오 파일 있음 → 파일 재생, 합성음 off
- 없음 → note-on마다 오실레이터 합성음

진짜 피아노 음색이 필요하면 나중에 로컬 샘플을 번들에 넣는 식으로 확장하면 되고, 그래도 외부 호출은 안 생긴다.

---

## 요약

- Web Audio `AudioContext`로 오실레이터를 만들어 note-on마다 잠깐 울리면, 샘플 파일 없이(=오프라인) 소리가 난다.
- MIDI 노트 → 주파수: `440 * 2^((midi - 69) / 12)`.
- 켰다 끌 때 클릭 잡음을 막으려면 게인 엔벨로프를 씌우되, `exponentialRampToValueAtTime`의 목표값은 0이 아니라 아주 작은 값(0.0001)으로.
- 합성음은 타이밍 확인용 — 사용자 오디오 파일이 있으면 그쪽을 쓰고 합성음은 끈다.
