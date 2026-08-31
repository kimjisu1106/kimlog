---
layout: post
title: 소리꽃 KeyBloom TIL 18
date: 2026-07-22
permalink: "2aik7upz"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 모달을 Promise로 감싸 await 한 줄로 쓰는 법, 값을 비교해 물을지 정할 때 여유값이 필요한 이유, 그리고 시간을 상한에서 고정하는 구조가 만든 무한 녹화 함정.
tags:
  - JavaScript
  - TypeScript
---
녹음 파일이 MIDI보다 길면 뒷부분이 잘리던 걸, 뽑을 때 어느 길이에 맞출지 고르게 해서 풀었다. 모달 자체보다 "같은 선택인데 경로마다 적용 지점이 다르다"는 데서 배운 게 많았다.

---

## 모달을 Promise로 감싸기

### await 한 줄로 쓰이게 만들기

콜백으로 결과를 넘기면 호출부가 모달 안쪽으로 말려 들어간다. 모달을 `Promise`로 감싸면 호출부는 평범한 분기처럼 읽힌다.

```ts
export function askDurationChoice(midiSec: number, audioSec: number): Promise<DurationChoice | null> {
  return new Promise((resolve) => {
    // ...DOM 구성...
    b.addEventListener("click", () => done(choice));

    function done(v: DurationChoice | null): void {
      window.removeEventListener("keydown", onKey);
      overlay.remove();
      resolve(v);
    }
  });
}
```

호출부는 이렇게 된다.

```ts
const choice = await askDurationChoice(timeline.duration, audioDuration);
if (!choice) return false; // 취소 → 내보내기 시작 안 함
```

### 취소를 null로 표현하기

`"midi" | "audio" | null`로 두면 "안 골랐다"와 "골랐다"가 타입에서 갈린다. `boolean` 플래그를 따로 두거나 빈 문자열로 때우면 호출부에서 매번 헷갈린다.

### 리스너는 반드시 떼기

모달 DOM은 `overlay.remove()`로 사라지지만, `window`에 붙인 `Esc` 핸들러는 그대로 남는다. 모달을 열 때마다 하나씩 쌓여서, 나중에는 관계없는 상황에서 `Esc`가 이상하게 동작한다. 닫는 경로가 여러 개(버튼·배경 클릭·Esc)라도 정리는 `done()` 한 곳에서만 하도록 모았다.

```ts
const onKey = (e: KeyboardEvent): void => {
  if (e.key === "Escape") done(null);
};
window.addEventListener("keydown", onKey);
// done() 안에서 removeEventListener — 어느 경로로 닫혀도 한 번만 정리된다
```

---

## 물을지 말지 정하기

### 값을 비교할 땐 여유값을 둔다

"MIDI 길이와 오디오 길이가 다르면 묻는다"를 그대로 `!==`로 쓰면 거의 항상 뜬다. 오디오 길이는 디코딩해서 얻은 실수값이고 MIDI 길이는 이벤트에서 계산한 값이라, 사실상 같은 곡이어도 소수점 아래가 맞을 리 없다. 사람이 신경 쓸 만한 차이인지를 기준으로 삼아야 한다.

```ts
// 반올림 오차로 매번 뜨지 않게 여유값
const DURATION_MISMATCH_TOLERANCE = 0.5; // s

async function resolveExportDuration(opts: ExportOptions): Promise<boolean> {
  exportDurationOverride = null;
  if (mode !== "file" || opts.audio !== "file" || !audio.hasFile) return true;
  if (audioDuration <= 0 || timeline.duration <= 0) return true;
  if (Math.abs(audioDuration - timeline.duration) <= DURATION_MISMATCH_TOLERANCE) return true;

  const choice = await askDurationChoice(timeline.duration, audioDuration);
  if (!choice) return false;
  if (choice === "audio") exportDurationOverride = audioDuration;
  return true;
}
```

조건을 "묻지 않아도 되는 경우"부터 차례로 걸러 `return true`로 빠져나가게 쓰면, 마지막에 남는 게 진짜 물어야 하는 상황이라 읽기 쉽다.

### 선택지 설명은 상황에 따라 뒤집는다

"MIDI 길이"를 고르면 어떻게 되는지는 어느 쪽이 더 긴지에 따라 정반대다. 오디오가 길면 뒷부분이 잘리는 거고, 짧으면 오히려 무음이 붙는다. 라벨만 보여주면 사용자가 매번 머릿속으로 계산해야 한다.

```ts
const longerIsAudio = audioSec > midiSec;
const midiBtn = mk("midi", t("MIDI 길이", "MIDI length"), midiSec,
  longerIsAudio
    ? t("연주가 끝나면 바로 끝납니다. 오디오 뒷부분은 잘립니다.", "…")
    : t("연주 전체가 담깁니다. 오디오가 끝난 뒤는 무음입니다.", "…"),
);
```

곡마다 답이 달라서 이 선택은 설정으로 저장하지 않고 뽑을 때마다 물었다. 저장해 두면 다음 곡에서 조용히 잘못된 길이로 나간다.

---

## 같은 선택, 경로마다 다른 적용 지점

### 오프라인은 값 하나

오프라인 렌더는 루프가 `t >= duration`까지 도는 구조라, 넘기는 값만 바꾸면 끝난다.

```ts
duration: exportDurationOverride ?? timeline.duration, // 오디오 길이를 고르면 그만큼 더/덜 렌더
```

### 실시간은 무한 녹화가 됐다

같은 방식으로 실시간 녹화도 "정지 조건을 고른 값으로 바꾸면 되겠지" 했는데, 녹화가 끝나지 않았다. 원인은 시계 쪽에 있었다.

```ts
now(): number {
  if (!this.playing) return this.baseTime;
  const t = this.baseTime + (performance.now() - this.startPerf) / 1000;
  return this.duration > 0 && t > this.duration ? this.duration : t; // ← 상한에서 고정
}
```

재생 시간이 `duration`을 넘으면 그 값에서 멈춘다. 그런데 정지 조건만 그보다 뒤(오디오 끝)로 옮기면, 시계는 MIDI 길이에서 굳어 있으니 그 시각에 영원히 도달하지 못한다. 조건이 성립하지 않아 계속 찍힌다.

값을 상한에서 고정하는 코드가 있으면, 그 상한보다 뒤를 가리키는 조건은 절대 참이 되지 않는다. 조건과 시계를 따로 보면 안 보이고, 실제로 돌려봐야 드러나는 종류였다.

### 핫 루프를 건드리지 않는 쪽으로

고치는 방법은 두 가지였다.

- 프레임 루프의 정지 판정에 "내보내기 중이면 다른 값" 분기를 넣기
- 녹화하는 동안만 `duration` 자체를 늘려 두고 끝나면 되돌리기

매 프레임 도는 코드에 조건을 늘리는 게 싫어서 후자를 골랐다. 프레임 루프는 원래 코드 그대로 두고, 시작과 끝에서만 값을 만진다.

```ts
// 시작 — 실시간 경로는 timeline.now()가 duration에서 고정돼 그 너머로 못 간다
if (exportDurationOverride !== null) timeline.duration = exportDurationOverride;

// 끝 — 늘려둔 길이 원복
if (exportDurationOverride !== null && song) timeline.duration = song.duration;
exportDurationOverride = null;
```

### 임시 상태는 경로마다 각각 정리한다

여기서 한 번 더 걸릴 뻔했다. 실시간은 `finishExport`에서 끝나고 오프라인은 자기 `finally`에서 끝나는데, 두 경로가 서로를 안 거친다. 한쪽에만 정리를 두면 다른 쪽에서는 값이 남는다.

```ts
// 오프라인 경로
} finally {
  offlineExport = null;
  exportDurationOverride = null;
  // ...
}
```

지금은 매 내보내기 시작에서 `exportDurationOverride = null`로 초기화하니 실제 버그로는 안 이어지지만, "정리 지점이 경로 수만큼 있다"는 건 기억해 둘 만하다. 임시 상태를 만들 때는 그 상태가 끝나는 길이 몇 개인지부터 세는 게 맞다.

---

## 요약

- 모달은 `Promise`로 감싸면 호출부가 `await` 한 줄로 끝난다. 취소는 `null`로 두어 타입에서 구분한다.
- 닫는 경로가 여럿이어도 정리는 한 함수에서 — `window`에 붙인 리스너는 DOM을 지워도 안 사라진다.
- 실수값을 비교해 분기할 땐 여유값을 둔다. 기준은 "다른가"가 아니라 "사람이 신경 쓸 만큼 다른가".
- 선택지 설명은 상황에 따라 뒤집어야 한다. 곡마다 답이 달라지는 선택은 저장하지 말고 매번 묻는다.
- 값을 상한에서 고정하는 코드가 있으면, 그 상한보다 뒤를 가리키는 조건은 영원히 참이 되지 않는다.
- 매 프레임 도는 루프에 분기를 늘리기보다, 시작·끝에서 값을 바꿨다 되돌리는 쪽이 깔끔할 때가 있다.
- 임시 상태를 만들 땐 그 상태가 끝나는 경로가 몇 개인지 세고, 각각에 정리를 둔다.
