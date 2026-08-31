---
layout: post
title: 소리꽃 KeyBloom TIL 17
date: 2026-07-20
permalink: "he22fkit"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 무료·유료 게이팅을 UI와 실행 경로 두 겹으로 두는 법, 알파는 컨테이너가 아니라 코덱이 담는다는 것, 그리고 화면 크기 판정을 CSS 미디어쿼리에 맡길 때 생기는 특이도·리사이즈 함정.
tags:
  - JavaScript
  - TypeScript
  - CSS
---
알파 내보내기를 유료로 돌리고 좁은 화면 안내와 패널 접기를 붙이면서, 게이팅을 어디에 걸어야 하는지와 "레이아웃은 바뀌었는데 창은 그대로"인 상황을 배웠다.

---

## 기능 잠그기

### 게이팅은 UI와 실행 경로 두 겹으로

드롭다운 옵션을 `disabled`로 막는 건 표시일 뿐이다. 개발자도구로 속성 하나만 지우면 뚫린다. 실제로 동작을 막는 가드는 기능을 실행하는 함수 안에 있어야 한다.

```ts
// ① UI — 보이지만 못 고르게
if (IS_FREE) {
  const proBg = bgSel.querySelector('option[value="alpha"]') as HTMLOptionElement | null;
  if (proBg) proBg.disabled = true;
}

// ② 실행 경로 — UI를 우회해도 여기서 막힘
function startExport(opts: ExportOptions): void {
  if (IS_FREE && opts.height >= 2160) return; // 4K 게이팅
  if (IS_FREE && opts.background === "alpha") return; // 알파 게이팅
  // ...
}
```

UI는 "왜 안 되는지 알려주는 역할", 실행 가드는 "실제로 막는 역할"로 나눠 생각하면 어디에 무엇을 둘지가 분명해진다.

### 조건이 겹칠 때 재활성되지 않게

알파 옵션은 원래 "MP4를 고르면 잠김"이라는 규칙이 있었다. 여기에 무료 잠금을 더할 때, 기존 규칙을 그대로 두면 사용자가 포맷을 WebM으로 바꾸는 순간 알파가 다시 열려 버린다.

```ts
const applyExportRules = (): void => {
  // ❌ 포맷을 바꾸면 무료인데도 알파가 다시 열림
  // alphaOpt.disabled = fmtSel.value === "mp4";

  // ✅ 무료면 무조건 잠금, 그 외에는 기존 규칙
  alphaOpt.disabled = IS_FREE || fmtSel.value === "mp4";
};
```

조건을 덧붙일 땐 "이 규칙이 다시 계산되는 순간이 언제인가"를 봐야 한다. 초기화 때 한 번 잠갔다고 끝이 아니다.

### 잠근 기능은 지우지 말고 남긴다

옵션을 아예 없애면 "이 앱은 그거 못 함"이 되고, 잠가서 남기면 "유료에서 됨"이 된다. 후자가 나중에 구매 유도를 붙일 자리도 만들어 준다. `<option>` 안에는 이미지를 못 넣어 왕관은 텍스트로 표기했다.

```ts
["alpha", t("투명 (알파)", "Transparent (alpha)") + (IS_FREE ? " 👑 PRO" : "")],
```

---

## 알파는 코덱이 담는다

### 확장자를 바꿔도 소용없는 이유

편집툴에서 안 열리길래 컨테이너를 `.mov`로 바꾸면 될 줄 알았는데, 아니었다. 정리하면 이렇다.

- 컨테이너(WebM, MOV, MP4)는 상자다. 어떤 코덱이든 담을 수 있다.
- 알파 채널을 실제로 가지고 있는 건 코덱이다. 브라우저에서 알파를 낼 수 있는 코덱은 VP8/VP9뿐이다.
- Vegas Pro·Premiere는 VP9의 알파를 못 읽는다. 그래서 VP9를 MOV에 옮겨 담아도 결과는 같다.

편집툴이 알파째로 받아주는 건 사실상 ProRes 4444, QuickTime RLE, PNG 시퀀스다. 그런데 브라우저 내장 인코더(WebCodecs)엔 H.264 / VP8 / VP9 / AV1만 있고 ProRes 인코더가 없다. 그래서 알파 영상 자체는 WebM으로 뽑히지만, 그게 편집툴에서 바로 안 열린다 — 쓰려면 사용자가 한 번 더 변환해야 한다.

### 그래서 무료에서는 왜 아예 잠갔나

"알파를 못 만들어서"가 아니다. WebM 알파는 잘 뽑힌다. 문제는 그게 Vegas·Premiere에서 안 열린다는 것이다. 그런데 앱이 "알파 됨"이라고 보여주면 사용자는 당연히 WebM으로 뽑고, 정작 편집툴에 넣으면 안 열린다. "된다고 해서 했는데 안 됨"이 되어 버린다. 반쪽짜리 기능은 없느니만 못하다.

그럼 앱이 변환까지 해주면 되지 않나. 방법은 있다 — 다만 무료 웹에서 그걸 구현하는 비용이 곁가지 기능치고 너무 크다.

| 방법 | 호환 | 문제 |
| --- | --- | --- |
| ffmpeg.wasm으로 ProRes 변환 | 좋음 | 30MB 다운로드, 소프트웨어 인코딩이라 느림 |
| PNG 시퀀스로 뽑아 영상으로 합치고 오디오 붙이기 | 모든 툴 | 1080p 알파 1분에 수 GB, 파이프라인이 큼 |
| 무압축 RGBA | 좋음 | 1080p60이 초당 약 500MB — 비현실적 |

세 방법 다 "알파 하나 제대로 주자고 앱을 크게 건드리는" 주객전도다. 그래서 무료 웹에서는 아예 잠그고(정직하게 PRO 표시), 알파가 진짜 필요한 완전한 형태는 네이티브 앱에서 ProRes 4444로 준다. 기능을 없앤 게 아니라 "될 수 있는 자리"로 옮긴 거다.

곁가지로, ffmpeg.wasm은 한때 COOP/COEP 헤더가 광고 iframe과 충돌해 접었는데, 0.12부터 단일 스레드 코어를 쓰면 `SharedArrayBuffer`가 필요 없어 그 충돌은 사라졌다. 그래도 30MB·느린 인코딩은 남는다.

---

## 화면 크기에 반응하기

### 판정을 JS가 아니라 CSS에 맡기기

좁은 화면 안내를 띄우려면 크기를 재야 하는데, `resize` 리스너를 달고 임계값을 비교하는 코드를 쓸 필요가 없었다. 미디어쿼리가 그 일을 이미 한다. JS는 문구 i18n 때문에 DOM만 만들고, 보이고 숨기는 판정은 전부 CSS가 한다.

가로만 보면 폰을 눕혔을 때 통과해 버리므로 세로 조건도 함께 걸었다.

```css
#smallScreen {
  display: none; /* 기본 숨김 */
}

/* 가로: 패널280+광고250+시퀀서가 안 들어가는 폭
   세로: 하단 250px 고정분을 빼면 무대가 안 남는 높이(폰 가로 눕힘 대응) */
@media (max-width: 1023px), (max-height: 599px) {
  #smallScreen {
    position: fixed;
    inset: 0;
    display: flex;
  }
}
```

### 미디어쿼리를 !important 없이 이기기

"그래도 둘러보기"로 닫으려면 미디어쿼리가 켜 둔 `display: flex`를 눌러야 한다. `!important`를 쓰고 싶어지는 자리인데, 미디어쿼리는 특이도를 올려주지 않는다는 걸 이용하면 된다. `#smallScreen`(id 1개)보다 `body.ss-dismissed #smallScreen`(id 1 + class 1)이 더 구체적이라 그냥 이긴다.

```css
/* 사용자가 닫으면 미디어쿼리보다 우선(선택자 특이도가 더 높음) */
body.ss-dismissed #smallScreen {
  display: none;
}
```

```ts
dismiss.addEventListener("click", () => document.body.classList.add("ss-dismissed"));
```

### 상태는 body 클래스 하나로

패널 접기도 같은 방식으로 했다. JS는 클래스를 토글할 뿐이고, 무엇이 숨고 손잡이가 어디로 가는지는 CSS가 전부 처리한다. 상태가 한 군데(클래스 유무)에만 있어서 어긋날 여지가 없다.

```css
body.panel-hidden #panel {
  display: none;
}

body.panel-hidden #panelToggle {
  right: 0; /* 패널이 사라졌으니 화면 끝으로 */
}
```

### 레이아웃만 바뀌면 resize 이벤트가 안 온다

여기서 한 번 걸렸다. 패널을 접었는데 미리보기가 넓어지지 않고 늘어난 것처럼 보였다. 원인은 단순했다 — `resize` 이벤트는 창 크기가 바뀔 때 오는데, 패널을 접은 건 창 안쪽 레이아웃만 바꾼 것이라 이벤트가 안 온다. 캔버스는 예전 폭에 맞춰진 백킹스토어를 그대로 들고 있었다.

그래서 토글할 때 리사이즈 리스너가 하던 일을 직접 호출했다. 녹화 중 `stage.resize()`를 건너뛰는 규칙까지 같이 맞춰야 동작이 어긋나지 않는다.

```ts
// 패널 토글은 창 크기를 안 바꿔 resize 이벤트가 없음 → 리스너와 같은 재계산을 직접 호출
createPanelToggle(() => {
  if (!exporting) stage.resize(); // 녹화 중엔 고정 해상도 유지(리스너와 동일 규칙)
  sequence.resize();
});
```

캔버스처럼 "크기를 직접 계산해서 들고 있는" 요소는 CSS로 레이아웃을 바꿀 때마다 재계산 지점을 같이 챙겨야 한다.

---

## 요약

- 게이팅은 UI(`disabled`)와 실행 경로(가드) 두 겹으로 — UI만 막으면 우회된다.
- 조건을 덧붙일 땐 그 규칙이 다시 계산되는 순간을 봐야 한다. `IS_FREE || 기존조건`으로 고정.
- 잠근 기능은 지우지 말고 `👑 PRO`로 남긴다 — "못 하는 앱"과 "유료에서 되는 앱"은 다르게 읽힌다.
- 알파를 담는 건 컨테이너가 아니라 코덱이다. VP9 알파는 확장자를 바꿔도 편집툴이 못 읽고, ProRes는 브라우저에서 인코딩할 수 없다.
- ffmpeg.wasm 0.12+ 단일 스레드 코어는 `SharedArrayBuffer`가 불필요해 COOP/COEP 제약이 사라졌다.
- 화면 크기 판정은 미디어쿼리에 맡기면 리사이즈 리스너가 필요 없다. 가로만 보면 폰 눕힘을 놓치니 세로 조건도 함께.
- 미디어쿼리는 특이도를 올려주지 않는다 — `body.클래스 #id`로 `!important` 없이 덮을 수 있다.
- 레이아웃만 바뀌면 `resize` 이벤트가 안 온다. 크기를 직접 계산해 들고 있는 캔버스는 재계산을 손으로 불러야 한다.
