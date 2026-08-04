---
layout: post
title: 소리꽃 KeyBloom TIL 32
date: 2026-08-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 두 번째 창에 같은 화면을 띄우는 방법 — 무거운 프레임 복사 대신 입력만 이벤트로 보내 각자 그리게 하고, Tauri로 두 번째 창을 띄우고 풀스크린까지 한 이야기.
tags:
  - TypeScript
  - Rust
---
공연 때 관객 화면(두 번째 모니터)에 파티클만 띄우고 싶었다. 두 창에 같은 그림을 어떻게 맞추느냐가 관건이었다.

---

## 화면(프레임)을 복사하지 말고 입력을 공유한다

먼저 떠오르는 건 한 창의 화면을 다른 창으로 복사하는 것. 그런데 4K 프레임은 초당 수십 MB라 창 사이로 넘기기엔 너무 무겁다.

그래서 화면 대신 연주(노트)만 넘긴다. 노트 on/off + 시드 + 큐 설정만 보내면 초당 몇 바이트다. 받은 창이 그걸로 자기가 직접 그린다. 파티클이 결정적이라(TIL 31) 같은 노트 → 같은 그림.

```text
메인 창  ──(노트 on/off + 시드)──▶  출력 창(독립 렌더)
          프레임 아님, 초당 몇 바이트
```

---

## Tauri에서 두 번째 창 띄우기 — 멀티페이지 빌드(페이지 여러 벌 내보내기)부터

출력 창은 UI 없이 캔버스만 있는 별도 페이지다. Vite(웹 프론트 빌드·개발 서버 도구)는 기본이 한 페이지라, 출력 페이지를 입력에 추가해야 빌드된다.

```ts
// vite.config.ts — index(메인) + output(출력 창) 두 페이지
export default defineConfig({
  build: { rollupOptions: { input: {
    main: resolve(__dirname, "index.html"),
    output: resolve(__dirname, "output.html"),
  } } },
});
```

그리고 Tauri에서 런타임에 창을 하나 더 띄운다. 창 생성은 아무 앱이나 못 하게 막혀 있어 권한을 열어야 한다. Tauri에선 창별 권한을 capabilities 파일에 적는다.

```ts
const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
const w = new WebviewWindow("output", { url: "output.html", width: 1280, height: 720 });
```

```json
// capabilities — 창 생성 + 이벤트 + 풀스크린 권한을 output 창에도
"windows": ["main", "output"],
"permissions": ["core:default", "core:webview:allow-create-webview-window", "core:window:allow-set-fullscreen"]
```

---

## 창 사이 통신은 emit / listen

메인이 연주 이벤트를 쏘고 출력 창이 받는다.

```ts
// 메인 — 라이브 noteOn 때
void import("@tauri-apps/api/event").then(({ emit }) =>
  emit("kb:noteOn", { midi, velocity, seed, params }));

// 출력 창 — 받아서 같은 시드로 spawn
void listen("kb:noteOn", (e) => particles.spawn(..., e.payload.seed));
```

풀스크린은 출력 창에서 더블클릭으로 토글(상단 바 없는 진짜 풀스크린).

```ts
window.addEventListener("dblclick", () => getCurrentWindow().setFullscreen(fs));
```

---

## 왜 이게 복잡했나 — Tauri는 WebView + Rust다

"네이티브 앱인데 왜 브라우저 얘기가 나오지?" 싶었는데, Tauri 앱은 화면(프론트)이 OS의 WebView(앱 속에 넣은 브라우저 화면) 안에서 돈다. 우리 파티클·캔버스는 전부 그 WebView에서 렌더된다. 진짜 네이티브(파일·오디오)는 Rust 쪽이다. 그래서 창 사이 통신도 브라우저가 아니라 Tauri(네이티브)의 이벤트를 쓴다.

---

## 요약

- 두 화면을 맞출 땐 프레임(무거움) 말고 입력(가벼움) 을 공유하고 각자 렌더한다.
- Tauri 두 번째 창은 Vite 멀티페이지 + `WebviewWindow` + capabilities 권한이 세트.
- 창 사이는 `emit`/`listen`, 풀스크린은 `setFullscreen`.
- Tauri = WebView(프론트) + Rust(네이티브)라, 렌더는 WebView·조작은 Tauri API.
