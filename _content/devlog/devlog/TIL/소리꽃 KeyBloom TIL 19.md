---
layout: post
title: 소리꽃 KeyBloom TIL 19
date: 2026-07-25
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 기존 웹앱을 한 줄도 안 버리고 Tauri로 네이티브 데스크톱 앱으로 감싸기 — 실행 환경 감지 플래그, 네이티브 파일 저장(대화상자+Rust 쓰기), 그리고 라이브 소리만 네이티브로 가르는 심(seam).
tags:
  - TypeScript
  - Rust
---
웹으로 만든 KeyBloom을 네이티브 데스크톱 앱으로 만들기 시작했다. 목표는 "화면은 그대로, 소리만 네이티브"라서, 웹 코드를 갈아엎지 않고 껍데기만 씌우고 필요한 곳만 갈래를 트는 게 핵심이었다.

---

## 웹앱을 그대로 감싸기

### Tauri가 하는 일 — 껍데기만

Tauri는 기존 정적 프론트엔드(빌드된 `dist`)를 OS의 내장 웹뷰(Windows면 WebView2)로 띄우는 네이티브 셸이다 — 웹 코드를 그대로 담아 설치형 앱으로 감싸는 껍데기라고 보면 된다. 웹앱을 액자에 끼운 셈으로, 그림(웹 코드)은 안 바뀌고 액자 덕에 설치형 앱이 된다. 그래서 HTML/JS/캔버스 코드는 하나도 안 바뀌고 앱 창 안에서 그대로 돈다. 설정은 "빌드 결과가 어디 있고 개발 서버가 어디냐"만 알려주면 된다.

```json
// src-tauri/tauri.conf.json
{
  "build": {
    "frontendDist": "../dist",          // 기존 빌드 산출물
    "devUrl": "http://localhost:5173",  // 개발 중엔 vite 서버
    "beforeBuildCommand": "npm run build"
  }
}
```

웹 빌드·배포 파이프라인은 손도 안 댔다. 네이티브는 그 위에 얹히기만 한다.

### 실행 환경 감지 — 능력 플래그

웹에서 돌 때와 네이티브에서 돌 때를 코드가 구분해야 한다. 기존에 `IS_FREE`(빌드 티어)·`FS_SUPPORTED`(파일 API 지원)처럼 능력 플래그를 쓰고 있었으니, 세 번째로 `IS_NATIVE`를 같은 패턴으로 뒀다.

```ts
// src/platform.ts — Tauri v2는 웹뷰에 __TAURI_INTERNALS__를 주입한다. 웹엔 없다.
export const IS_NATIVE =
  typeof window !== "undefined" &&
  ("__TAURI_INTERNALS__" in window || "__TAURI__" in window);
```

이 플래그 하나로 라이브 토글 노출, 광고 로딩, 저장 방식 등을 갈랐다. 예를 들어 라이브 모드 토글은 원래 완성돼 있는데 웹 오디오 지연 때문에 숨겨뒀던 것 — 네이티브에서만 켠다.

```ts
modeBar.hidden = !IS_NATIVE; // 웹은 숨김, 네이티브만 노출
```

---

## 네이티브 파일 저장

### 웹 다운로드 vs 네이티브 "다른 이름으로 저장"

웹은 `<a download>`로 브라우저 기본 다운로드 폴더에 조용히 떨어뜨린다 — 사용자가 어디 저장됐는지 모른다. 네이티브에선 저장 대화상자로 위치를 직접 고르게 해야 한다. 방식은 JS가 경로를 받고, 실제 파일 쓰기는 Rust 커맨드가 맡는다.

```ts
// 저장: 네이티브면 대화상자 → Rust write_file, 웹이면 브라우저 다운로드
export async function downloadBlob(blob: Blob, filename: string, dir?: string): Promise<void> {
  if (IS_NATIVE) {
    const { invoke } = await import("@tauri-apps/api/core");
    let path: string | null;
    if (dir) path = `${dir}/${filename}`;            // 미리 지정한 폴더
    else {
      const { save } = await import("@tauri-apps/plugin-dialog");
      path = await save({ defaultPath: filename });  // 대화상자
    }
    if (!path) return;
    await invoke("write_file", { path, dataB64: await blobToBase64(blob) });
    return;
  }
  // ...웹: anchor 다운로드...
}
```

### 파일 쓰기는 Rust에서 — fs 플러그인 스코프 우회

Tauri의 fs 플러그인으로 파일을 쓰려면 "어느 경로에 써도 되는가"를 권한(scope)으로 일일이 허용해야 한다. 그런데 사용자가 대화상자로 고른 임의의 경로에 쓰려니 스코프가 걸리적거렸다. 그래서 fs 플러그인 대신 내 커맨드에서 `std::fs`로 직접 썼다 — 대화상자가 준 절대경로라 스코프 개념이 필요 없다.

```rust
// invoke로 바이너리를 안전하게 넘기려고 base64로 받는다
#[tauri::command]
fn write_file(path: String, data_b64: String) -> Result<(), String> {
    let bytes = general_purpose::STANDARD.decode(data_b64.as_bytes()).map_err(|e| e.to_string())?;
    std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    Ok(())
}
```

내가 정의한 앱 커맨드는 플러그인 커맨드와 달리 별도 권한 없이 호출된다. 저장 폴더를 미리 지정해두면(`dialog.open({directory:true})`) 대화상자 없이 그 폴더에 타임스탬프 파일명으로 바로 쓴다.

---

## 라이브 소리만 네이티브로 — 심(seam)

가장 조심한 부분. 심(seam)은 두 방식을 잇는 이음매를 뜻하는데, 여기선 웹과 네이티브를 딱 한 곳에서만 가른다는 뜻이다. 소리를 전부 네이티브로 옮기면 파일 재생·영상 내보내기(브라우저 인코더가 Web Audio 렌더에 의존)가 깨진다. 그래서 라이브 연주가 소리를 내는 진입점 딱 한 곳만 네이티브로 가르고, 나머지는 Web Audio 그대로 뒀다.

라이브 소리는 `AudioEngine.triggerNote` 하나에서만 난다(파일 재생은 스케줄러, 내보내기는 오프라인 렌더 — 별개 경로). 그 지점에서만 분기한다.

```ts
// 라이브 입력 — 네이티브면 Rust 엔진으로, 웹이면 Web Audio
triggerNote(midi: number, velocity: number, duration: number): void {
  if (IS_NATIVE) { nativeAudio.noteOn(midi, velocity); return; }
  this.playAt(midi, velocity, duration, this.now());
}
// 건반 뗌 — 네이티브만 note-off(댐퍼). 웹은 고정 감쇠라 no-op
releaseNote(midi: number): void {
  if (IS_NATIVE) nativeAudio.noteOff(midi);
}
```

파일 스케줄러(`scheduleNote`)·정지·내보내기 렌더는 손대지 않았다. 진입점 하나만 갈라서, 웹은 기존 동작 그대로 유지되고 네이티브만 저지연 경로를 탄다.

---

## 요약

- Tauri는 기존 정적 프론트를 웹뷰로 띄우는 껍데기다 — `frontendDist`/`devUrl`만 알려주면 웹 코드는 안 바뀐다.
- 웹/네이티브 구분은 능력 플래그 하나(`IS_NATIVE`)로 — 기존 `IS_FREE`·`FS_SUPPORTED`와 같은 패턴.
- 네이티브 저장은 JS가 대화상자로 경로를 받고 Rust `write_file`(std::fs)이 쓴다 — fs 플러그인 스코프를 우회, 바이너리는 base64로 넘김.
- 소리를 통째로 옮기지 말고 라이브 진입점(`triggerNote`) 하나만 네이티브로 가른다 — 파일·내보내기는 Web Audio 그대로.
