---
layout: post
title: 소리꽃 KeyBloom TIL 16
date: 2026-07-19
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 무료 버전 출시를 준비하며 배운 것 — 오디오를 파일에 통째로 임베드하기, 커스텀 확장자 픽커 함정, 미리보기까지 새는 워터마크 막기, t(ko,en) 초경량 다국어, 그리고 Vite 정적 빌드를 Cloudflare Pages에 올리기.
tags:
  - JavaScript
  - TypeScript
---
소리를 다 만든 뒤엔 "남에게 줄 수 있는 상태"로 만드는 작업이 남았다. 파일 하나로 완결되게, 무료 워터마크가 안 새게, 한국어 밖 사용자도 쓰게, 그리고 실제로 배포까지.

---

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

---

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

---

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

---

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

- 웹은 파일 경로를 못 저장하니, 자기완결하려면 오디오 바이트를 파일에 base64로 임베드한다(TS 5.7은 `ArrayBuffer` 캐스팅 한 줄 필요).
- 커스텀 확장자는 픽커 accept를 `application/octet-stream`으로 — `application/json`이면 회색 처리된다.
- 워터마크는 미리보기까지 그려야 화면 녹화 우회를 막는다.
- 오디오 소스 선택은 미리보기·내보내기에 똑같이 적용해 WYSIWYG를 유지한다.
- 규모가 작으면 키 딕셔너리보다 `t(ko,en)` 인라인이 가볍다 — 자동 감지 + reload 전환.
- 겹치는 UI는 "open 함수를 반환"해 여는 주체와 분리하면 위치를 자유롭게 바꿀 수 있다.
- 정적 Vite 앱은 Cloudflare Pages(build `npm run build`, output `dist`)로, 외부 스크립트는 호스트가 있으면 Vite가 그대로 통과시킨다.
