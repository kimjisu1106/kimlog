---
layout: post
title: 소리꽃 KeyBloom TIL 39
date: 2026-08-09
permalink: "kjoxtxuo"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 외부 파일 없는 컨볼루션 리버브·스타카토 엔벨로프·재생·내보내기 타임라인과 WebView2 모달·단축키·flex 안 range·모듈 리팩터까지 오디오와 프론트엔드 포인트를 정리한 기록.
tags:
  - TypeScript
  - CSS
---
샘플 피아노 소리와 재생·내보내기 타임라인을 손보며 배운 것들.

---

## Web Audio — 룸 리버브

### 임펄스를 즉석 생성한 컨볼루션 리버브

리버브(잔향)를 넣는 표준 방법은 컨볼루션 리버브다 — 방의 임펄스 응답(짧은 소리를 냈을 때 그 공간이 되울리는 파형)을 녹음한 파일(IR)을 `ConvolverNode`(웹 오디오에서 잔향 같은 공간감을 입히는 노드)에 물려, 모든 소리에 그 공간감을 입힌다. 근데 IR 파일을 번들하면 용량·로딩이 붙는다.

임펄스를 파일 대신 지수 감쇠 노이즈로 즉석 생성하면 외부 파일 없이 룸 리버브가 된다. 첫 샘플이 가장 커서(직접음) 프리딜레이(리버브가 시작되기 전의 짧은 지연)가 없어 오디오 싱크에도 영향이 없다.

```ts
function roomImpulse(ctx: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(seconds * ctx.sampleRate);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}
// 그래프: master → (dry + convolver→wet) → limiter → dest
```

wet(잔향)은 원음(dry)과 병렬로 섞어 리미터 앞에서 합류시킨다. 룸 사이즈는 임펄스 길이와 wet 레벨을 함께 키우면 된다.

### 라이브와 오프라인이 같은 리버브를 쓰게

미리듣기(실시간 `AudioContext`)와 영상 내보내기(`OfflineAudioContext`)가 같은 소리를 내려면 마스터 체인을 공유해야 한다. 룸 사이즈 값을 모듈 전역에 두고, 체인을 만드는 함수가 그 값을 읽게 하면 양쪽이 자동으로 일치한다.

> 임펄스를 다시 만드는 건 슬라이더 드래그 중이 아니라 change에만 했다. 재생성이 잔향 꼬리를 끊어 드래그 내내 하면 지직거린다.

---

## Web Audio — 노트 엔벨로프

### 스타카토를 위한 어택 램프 + 자연 감쇠 댐퍼

지속음 샘플만 있는 피아노는 짧은 음(스타카토)을 표현하려면 샘플을 중간에서 잘라 페이드로 꺼야 하는데, 고정 길이 페이드는 뭉툭하게 들린다.

온셋(소리가 시작되는 순간)에 아주 짧은 어택 램프(소리를 처음에 서서히 키우는 구간)를 주면 시작 클릭이 줄고, 노트-오프를 `exponentialRampToValueAtTime`(고정 길이) 대신 `setTargetAtTime`(지수 감쇠, 댐퍼 같은 자연 곡선)으로 바꾸면 덜 뭉툭하다.

```ts
// ❌ 고정 길이 페이드
g.gain.setValueAtTime(vol, when);
g.gain.exponentialRampToValueAtTime(0.0001, end + 0.18);

// ✅ 어택 램프 + 자연 감쇠 댐퍼
g.gain.setValueAtTime(0.0001, when);
g.gain.exponentialRampToValueAtTime(vol, when + 0.004); // 온셋 클릭 완화
g.gain.setValueAtTime(vol, end);
g.gain.setTargetAtTime(0.0001, end, 0.06); // 시상수 0.06s 지수 감쇠
```

`setTargetAtTime(target, startTime, timeConstant)`는 목표에 지수적으로 다가가며 정확히 도달하진 않으므로, 소스 정지는 감쇠가 충분히 작아지는 지점(시상수(값이 줄어드는 속도를 정하는 상수)의 8배쯤)에서 잡는다.

---

## 재생 타임라인

### 첫 노트 어택 잘림 — 재생 시작 리드인

곡 맨 앞에서 재생하면 첫 노트가 오디오 시계의 "지금 이 순간"에 정확히 예약된다. 버퍼를 정확히 지금 시작하면 컨텍스트가 아주 살짝 늦게 시작해 어택이 잘린다.

재생 시작에 짧은 리드인을 줘서 타임라인 시각이 잠깐 음수가 되게 하면, 첫 노트가 미래에 예약돼 어택이 온전하다. 오디오와 비주얼이 같은 시계를 써서 함께 밀리므로 싱크는 유지된다.

```ts
play(lead = 0): void {
  this.playing = true;
  this.startPerf = performance.now();
  this.baseTime -= lead; // now()가 잠깐 음수 → 앞 무음 구간엔 노트 없음
}
// 첫 노트 when = base + (0 - (-lead)) = base + lead → 미래 예약(어택 온전)
```

### 프리뷰 길이를 max(MIDI, 오디오)로

오디오 파일이 MIDI보다 길면(인트로·여운) 프리뷰가 MIDI 끝에서 멈춰 오디오가 잘려 들렸다. 타임라인 길이를 `max(midi, audio)`로 잡으면 프리뷰가 오디오 끝까지 재생·표시한다. MIDI만 있으면 그대로 MIDI 길이다.

---

## 내보내기

### 리버브 여운(tail)까지 렌더 연장

내보내기는 곡이 끝나도 파티클이 다 사라질 때까지 렌더를 이어가고 오디오도 그 길이에 맞춘다. 그런데 종료 기준이 파티클이라, 파티클이 리버브보다 먼저 사라지면 잔향이 잘렸다.

파티클이 없어도 오디오 여운(리버브 감쇠 + 노트 릴리스)만큼은 렌더를 유지하게 하면, 오디오가 영상 길이에 맞춰 잘리지 않는다.

```ts
// ❌ 파티클만 기준
if (tailActive && (particlesGone || elapsed > MAX)) break;

// ✅ 파티클 AND 오디오 여운 경과까지
if (tailActive && (elapsed > MAX || (particlesGone && elapsed >= keepTailSec))) break;
```

### 첫 노트 잘림 방지 lead-in

내보내기에서도 첫 노트가 t=0에 붙어 있으면 어택이 잘릴 수 있어, 앞에 짧은 무음을 넣는다. 콘텐츠 시각을 `프레임 − leadIn`으로 밀면 앞 구간은 음수라 노트·파티클이 없고(정지 프레임), 오디오는 노트를 `+leadIn` 오프셋으로 렌더한다. 영상·오디오가 같이 밀려 정렬이 맞는다(파일 오디오는 자체 시작점이 있어 leadIn=0).

```ts
const time = (i + 1) * DT - leadInSec; // 앞 무음 동안 음수 → 아무것도 안 그림
```

---

프로젝트 관리 UI와 코드 정리를 하며 만난 프론트엔드·리팩터 포인트들.

---

## WebView2 주의점

### window.confirm이 안 뜬다 — DOM 모달로

새 프로젝트 전에 "저장할까요?"를 `window.confirm`으로 물었는데, 데스크톱 앱(Tauri + WebView2 — 윈도우 네이티브 앱이 웹 화면을 띄우는 컴포넌트)에서 이 창이 안정적으로 안 떠서 확인 없이 그냥 저장으로 넘어갔다. 브라우저에선 되던 게 WebView에선 안 된 것이다.

저장 / 저장 안 함 / 취소 3버튼을 직접 그린 DOM 모달로 바꿔 확실히 뜨게 했다. `window.confirm`은 예/아니오 2택뿐이라, 3택이 필요하면 어차피 직접 모달을 그려야 한다.

> `window.alert`·`window.prompt`도 같은 이유로 WebView에서 안 뜰 수 있다. 앱에서 쓰는 네이티브 다이얼로그는 DOM으로 직접 그리는 게 안전하다.

---

## 단축키와 변경 추적

### 단축키는 preventDefault로 브라우저 기본 동작을 막는다

Ctrl+N(새 프로젝트)·Ctrl+O(열기)·Ctrl+S(저장)·Ctrl+Shift+S(다른 이름으로)를 붙이면서, 각 키가 브라우저 기본 동작(새 창·페이지 저장 등)을 일으키지 않게 `preventDefault`했다. 저장류는 입력칸 포커스와 무관하게 항상 먹게 이 판정을 포커스 가드보다 앞에 둔다.

```ts
if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
  e.preventDefault();
  void saveProject(e.shiftKey); // Shift면 다른 이름으로 저장
  return;
}
```

### dirty 플래그로 저장 여부를 판단

"저장 안 한 변경이 있으면 물어보기"를 하려면 변경 여부를 추적해야 한다. 편집이 모이는 지점(undo용 히스토리 등록·undo/redo·새 미디 로드)에서 `dirty = true`, 저장·불러오기에서 `dirty = false`로 두면, 새 프로젝트 때 이 플래그만 보면 된다.

---

## CSS 레이아웃

### flex 안의 range는 min-width:0이라야 줄어든다

영어 화면에서 설정 패널에 가로 스크롤이 생겼다. 원인은 `input[type=range]`였다. flex 자식은 기본 최소 크기가 `min-content`라, range는 자기 고유 폭 아래로는 안 줄어든다. 긴 영어 라벨 옆에서 슬라이더가 안 줄어드니 행이 패널 밖으로 넘쳤다.

```css
input[type="range"] {
  flex: 1;
  min-width: 0; /* 이게 있어야 라벨이 길어도 슬라이더가 줄어들어 행이 안 넘침 */
}
```

고정폭 사이드바는 가로 스크롤이 필요 없으니 `overflow-x: hidden`으로 못을 박고, 라벨은 `white-space: nowrap`을 빼 긴 영어는 줄바꿈되게 했다.

### 색·폰트를 CSS 변수로

같은 값을 여기저기 하드코딩하면 브랜드 색 하나 바꿀 때 다 뒤져야 한다. `#fff`처럼 흩어진 값을 이미 있는 변수(`--on-accent`)로 모으고, `rgba()` 글로우는 `--accent-rgb`(RGB 세 값) 토큰을 만들어 `rgba(var(--accent-rgb), 0.4)`로 색을 한 곳에서 관리한다.

---

## 모듈과 리팩터

### export-from 재노출은 로컬 바인딩을 안 만든다

중복된 유틸(base64 인코딩)을 공용 모듈로 옮기고, 기존 import 경로를 유지하려 재노출했다. 그런데 `export { x } from "..."`는 재노출만 할 뿐 그 모듈 안에서 쓸 로컬 변수를 안 만든다. 그래서 재노출한 모듈이 내부에서 `x`를 호출하면 정의되지 않은 참조가 된다.

```ts
// ❌ 재노출만 — 이 모듈 본문에서 bytesToBase64를 못 씀
export { bytesToBase64 } from "../bytes";

// ✅ 내부 사용 + 재노출은 따로
import { bytesToBase64 } from "../bytes";
export { bytesToBase64 };
```

### 프리뷰와 내보내기의 공통 규칙은 공용 모듈로

미리보기와 영상 내보내기가 "시각 t에 활성인 큐"를 각자 복제해 손으로 맞춰오고 있었다(한쪽만 바뀌면 미리보기와 저장이 어긋난다). 의존성 없는 작은 모듈로 뽑아 양쪽이 같은 함수를 쓰게 하면 어긋날 일이 없다. 순환 참조가 걱정이면, 그 규칙이 아무것도 의존하지 않게 떼어내면 순환도 안 생긴다.

---

## 요약

- 컨볼루션 리버브의 임펄스는 지수 감쇠 노이즈로 즉석 생성하면 외부 파일이 필요 없다(첫 샘플이 직접음이라 프리딜레이 없음)
- 스타카토는 온셋 어택 램프 + `setTargetAtTime` 자연 감쇠 댐퍼가 고정 길이 페이드보다 자연스럽다
- 첫 노트가 오디오 클럭 now에 예약되면 잘린다 → 재생 시작 리드인(now()가 잠깐 음수)으로 미래 예약, 같은 시계라 싱크 유지
- 내보내기 tail은 파티클이 아니라 오디오 여운까지, lead-in은 노트 오프셋 + 앞 정지 프레임으로 정렬
- WebView2에선 `window.confirm`/`alert`이 안 뜰 수 있다 → 네이티브 다이얼로그는 DOM 모달로 직접
- 단축키는 `preventDefault`로 브라우저 기본 동작을 막고, 변경 여부는 dirty 플래그로 추적
- flex 안 요소가 안 줄어들면 `min-width: 0`을 의심 — range의 가로 넘침 원인
- `export { x } from "..."`는 로컬 바인딩을 안 만든다(내부 사용은 import 따로), 프리뷰↔내보내기 공통 규칙은 공용 모듈로 어긋남 방지
