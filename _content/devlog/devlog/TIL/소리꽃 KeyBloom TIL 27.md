---
layout: post
title: 소리꽃 KeyBloom TIL 27
date: 2026-07-27
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 네이티브 앱에 하우스 광고를 붙이며 배운 것 — Tauri 플러그인을 네 곳에 맞추는 절차, WebView 링크를 시스템 브라우저로 여는 이유, 원격 SDK를 소비하는 방식과 그 신뢰 표면, 자리를 남기는 visibility.
tags:
  - TypeScript
  - Rust
  - CSS
---
설치형(네이티브) 앱은 카카오 애드핏이 안 떠서 광고 자리가 비어 있었다. 그 자리를 내 앱·블로그를 홍보하는 자체 광고로 채우는데, 광고 로직을 앱에 넣지 않고 외부(온실 GreenHouse)가 서빙하는 SDK(남이 만든 기능을 내 앱에 붙이는 도구 모음)를 불러다 쓰는 소비자-SDK 방식으로 붙였다.

---

## Tauri 플러그인은 네 곳을 맞춰야 동작한다

배너 클릭을 시스템 브라우저로 열려면 `tauri-plugin-opener`가 필요한데, 플러그인 하나를 켜는 데 네 군데를 함께 손봐야 한다. 하나라도 빠지면 호출이 막힌다.

```toml
# 1. src-tauri/Cargo.toml — Rust 크레이트
tauri-plugin-opener = "2"
```

```rust
// 2. src-tauri/src/lib.rs — 빌더에 등록
tauri::Builder::default()
  .plugin(tauri_plugin_opener::init())
```

```json
// 3. src-tauri/capabilities/default.json — 권한 허용(안 넣으면 호출 거부)
"permissions": ["core:default", "dialog:default", "opener:default"]
```

```ts
// 4. JS 패키지
import { openUrl } from "@tauri-apps/plugin-opener";
```

Tauri v2는 권한을 명시하지 않으면 막는 게 기본이라, capability의 `opener:default`가 특히 빼먹기 쉬운 지점이다.

---

## 앱 속 브라우저에서는 링크를 시스템 브라우저로 넘긴다

네이티브 앱은 WebView(앱 속에 넣은 브라우저 화면) 안에서 도는데, 배너를 `<a href>`나 `location`으로 그냥 열면 앱 창 자신이 그 주소로 이동해 앱이 통째로 사라진다. 그래서 링크는 앱 창이 아니라 OS 기본 브라우저로 열어야 한다.

```ts
open: (url) => {
  if (/^https:\/\//.test(url)) void openUrl(url);
}
```

---

## 원격 SDK 소비 — 앱은 컨테이너와 콜백만 준다

광고 로직(fetch·필터·로테이션·렌더)을 앱마다 다시 짜지 않고, 외부가 서빙하는 SDK를 스크립트로 불러 `init` 한 번만 부른다. 광고 정책을 바꿔도 SDK만 갱신하면 앱 재빌드 없이 반영된다.

```ts
const s = document.createElement("script");
s.src = "https://kimlog-greenhouse.pages.dev/houseAd.js";
s.onload = () => {
  window.HouseAd.init({
    el: "#adBox",          // 그릴 자리
    platform: "native",    // target 필터 기준
    open: (url) => { /* 시스템 브라우저로 */ },
  });
};
document.head.appendChild(s);
```

앱이 주는 건 컨테이너(`el`)와 링크 핸들러(`open`)뿐이다. 실패(오프라인)하면 `onload`가 안 떠 배너만 조용히 생략된다 — 앱 동작엔 영향 없다.

---

## 소비자-SDK 모델의 트레이드오프

이 방식의 대가는 원격 코드를 앱 안에서 실행한다는 것이다. 즉 SDK를 서빙하는 도메인을 쥔 쪽이 설치된 모든 앱 안에서 임의 코드를 돌릴 수 있다. 이전에 검토했던 "앱이 데이터(ads.json)만 받아 직접 그리기"보다 신뢰 표면(공격이 들어올 수 있는 지점)이 크다.

- 같은 소유자이고, 애드핏 등 광고 SDK가 다 이 모델이라 감수한다.
- 대신 심층 방어로, SDK가 URL을 검증하더라도 앱의 `open` 콜백에서 `https` 스킴을 한 번 더 확인하고 넘긴다(위 코드). 신뢰하는 상대라도 경계에서 재검증하는 게 싸고 안전하다.

---

## 자리는 남기고 내용만 숨기기 — visibility

실시간 연주 모드에서 하단 바를 `display:none`으로 숨겼더니, 자리까지 사라져 미리보기 크기가 모드 전환마다 출렁였다. 자리(폭)는 남기고 내용만 감추려면 `visibility`를 쓴다.

```css
/* display:none → 요소가 레이아웃에서 빠져 자리까지 사라짐(collapse) */
/* visibility:hidden → 자리는 유지, 내용만 안 보임 */
body.live-mode #sequence {
  visibility: hidden;
}
```

덕분에 파일 모드와 라이브 모드에서 광고·시퀀서 영역이 그대로 확보돼 미리보기 크기가 안 흔들린다.

---

## 요약

- Tauri 플러그인 하나는 Cargo·lib.rs 등록·capability 권한·JS 패키지 네 곳을 맞춰야 동작한다(권한 누락 주의).
- WebView 링크는 `<a href>` 직행 시 앱 창이 이동해 깨지므로 `openUrl`로 시스템 브라우저에 넘긴다.
- 광고 로직을 SDK로 외부화하면 앱은 컨테이너 + 콜백만 주고, 재배포 없이 갱신된다.
- 대가는 원격 코드 실행 신뢰 표면 — 감수하되 `open` 콜백에서 `https` 재검증(심층 방어).
- `display:none`은 자리까지 없애고 `visibility:hidden`은 자리를 남긴다 — 레이아웃 안정에 후자.
