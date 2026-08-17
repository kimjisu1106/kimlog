---
layout: post
title: 소리꽃 KeyBloom TIL 41
date: 2026-08-12
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 파일 연결로 넘어온 경로를 실행 인자에서 읽어 여는 법, single-instance로 켜진 앱에 파일을 전달하고 새 창에는 쿼리로 넘기는 법, 그리고 꽉 찬 마스터가 재인코딩에서 찝히는 이유와 look-ahead 리미터로 막는 법.
tags:
  - TypeScript
  - Rust
---
출시 직후 실사용에서 걸린 것들을 고치며 배운 것 — 파일 연결로 열기, 열 때 창 선택, 내보내기 오디오 클리핑.

---

## 파일 연결로 열기

### Windows 파일 연결은 경로를 "실행 인자"로 넘긴다

`.kbloom`을 더블클릭하면 OS가 앱을 실행하면서 그 파일 경로를 실행 인자로 붙인다(`"app.exe" "C:\...\x.kbloom"`). 앱이 이 인자를 안 읽으면 그냥 빈 상태로 뜬다(그동안의 버그). 그래서 시작할 때 인자에서 `.kbloom` 경로를 찾아 읽어 로드했다.

```rust
#[tauri::command]
fn get_opened_file() -> Option<String> {
  std::env::args()
    .skip(1) // [0]은 exe 경로
    .find(|a| a.to_lowercase().ends_with(".kbloom") && std::path::Path::new(a).is_file())
}
```

프론트는 시작 시 이 경로(또는 새 창이면 아래의 `?open=` 쿼리)를 읽어 픽커 없이 로드하고, 그 경로를 기억해 이후 Ctrl+S로 바로 덮어쓴다.

### 이미 켜진 앱에서 또 열기 — single-instance

앱이 켜진 상태에서 `.kbloom`을 더블클릭하면 OS는 두 번째 프로세스를 새로 띄운다. 그대로 두면 창이 계속 쌓인다. `tauri-plugin-single-instance`를 첫 플러그인으로 등록하면, 두 번째 실행을 기존 인스턴스가 가로채 그 실행 인자를 콜백으로 받고(새 프로세스는 스스로 종료), 우리가 원하는 대로 처리할 수 있다.

```rust
builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
  use tauri::{Emitter, Manager};
  if let Some(path) = argv.iter().skip(1).find(|a| a.to_lowercase().ends_with(".kbloom")) {
    let _ = app.emit("open-file", path.clone()); // 프론트로 전달 → 교체/새창을 물음
  }
  if let Some(w) = app.get_webview_window("main") {
    let _ = w.unminimize();
    let _ = w.set_focus(); // 기존 창을 앞으로
  }
}));
```

프론트는 `open-file` 이벤트를 받아 "현재 창에 열기 / 새 창으로 열기"를 모달로 묻는다. 교체는 저장 안 한 변경이 있으면 먼저 확인한 뒤 현재 창에 로드한다.

### 새 창엔 argv 대신 쿼리로 경로를 넘긴다

"새 창으로 열기"는 같은 앱의 새 `WebviewWindow`를 여는 것이다. 그런데 `get_opened_file`이 읽는 실행 인자는 프로세스 공용이라 새 창을 구분하지 못한다(원래 실행 파일만 가리킴). 그래서 새 창엔 URL 쿼리로 경로를 실어 보내고, 프론트 시작 코드가 쿼리를 먼저 확인하게 했다.

```ts
new WebviewWindow(`proj-${Date.now()}`, {
  url: `index.html?open=${encodeURIComponent(path)}`,
});
// 시작 시: const path = new URLSearchParams(location.search).get("open") ?? (await getOpenedFile());
```

새 창은 라벨이 `main`이 아니라서 그대로면 커맨드·다이얼로그 권한이 없다. capabilities(Tauri에서 기능별 권한을 여는 설정)의 창 목록에 글롭 라벨(와일드카드로 여러 대상을 한 번에 지정하는 이름)을 넣어 같은 권한을 준다.

```json
"windows": ["main", "output", "proj-*"]
```

개념 정리 — 창마다 JS 컨텍스트가 독립이라 파일 프로젝트는 창끼리 서로 독립으로 동작한다. 공유되는 건 Rust 쪽 오디오 엔진(State) 정도라, 파일 모드 편집·내보내기는 다중 창이 안전하다.

---

## 내보내기 오디오 클리핑

### 왜 "재생은 멀쩡한데 내보내면 찝히나"

핵심은 재생 ≠ 재인코딩이다. 파일을 그냥 틀 땐 원본을 그대로 내보내니 멀쩡하다. 하지만 내보내기는 오디오를 AAC(널리 쓰이는 손실 오디오 압축 포맷)로 다시 압축한다. DAW(디지털 오디오 워크스테이션, 음악 편집·믹싱 프로그램)에서 0dBFS(디지털 오디오에서 최대 음량 기준점)로 꽉 채운 마스터는 손실 인코딩의 인터샘플 오버슈트(샘플과 샘플 사이에서 피크가 기준을 넘는 현상)로 피크가 0dB 위로 넘어가 재생 때 클리핑된다. 여기에 48k 리샘플(샘플레이트를 바꾸며 값을 다시 계산하는 것) 과정의 오버슈트와 최종 정수 변환의 `clamp(±1)`(값을 정해진 범위 안으로 자르는 것)까지 겹친다. 즉 재인코딩 전에 헤드룸(−0.5~−1dBFS) 을 확보해야 한다.

### look-ahead 브릭월 리미터 — 피크 전에 미리 누른다

단순히 넘는 값을 자르면(하드 클립) 그게 바로 찝힘이다. 리미터는 피크가 올 지점을 조금 앞서 게인을 미리 낮춰(잘라내지 않고) 상한을 지킨다. 각 샘플에서 상한을 지키는 데 필요한 게인을 구하고, `[i, i+look]` 구간의 최소 게인을 monotonic deque(최솟값을 빠르게 찾는 자료구조)로 미리 반영한 뒤 attack/release(소리를 누르고 다시 푸는 반응 시간)로 매끄럽게 만든다. L/R을 같은 게인으로 묶어 스테레오 이미지를 지키고, 넘칠 구간이 없으면 원본을 그대로 둔다(투명).

```ts
const req = new Float32Array(n); // 각 샘플에서 ceiling을 지키는 게인(≤1)
for (let i = 0; i < n; i++) {
  const p = Math.max(Math.abs(left[i]), Math.abs(right[i]));
  req[i] = p > ceiling ? ceiling / p : 1;
}
// deque로 laMin[i] = min(req[i..i+look]) → 피크보다 look 샘플 먼저 게인이 내려감
// g = target < g ? target + (g - target)*atk : target + (g - target)*rel;  // 감쇠는 빠르게, 복귀는 천천히
// left[i] *= g; right[i] *= g;
```

### dBFS ↔ 선형 게인

ceiling은 선형 게인으로 쓴다. 데시벨은 로그 스케일이라 `선형 = 10^(dB/20)`. 그래서 −0.5dBFS = `10^(-0.5/20)` ≈ 0.944, −1dBFS ≈ 0.891.

---

## 라이선스 UI

### 웹에선 구매 버튼만 — 활성화는 감춘다

plus는 앱 전용(`IS_NATIVE && licensed`)이라 웹에선 라이선스 활성화가 의미 없다. 그렇다고 라이선스 섹션을 통째로 숨기면 웹 사용자가 살 방법이 없다. 그래서 웹에선 활성화 컨트롤만 감추고 구매 버튼과 안내만 남겼다.

```ts
if (!IS_NATIVE) {
  licKey.hidden = true;
  licActivate.hidden = true;
  licDeactivate.hidden = true; // 구매 버튼(licBuy)만 노출
}
```

---

## 요약

- Windows 파일 연결은 경로를 실행 인자로 넘긴다 — 시작 시 argv(또는 새 창은 `?open=` 쿼리)에서 읽어 로드
- single-instance(첫 플러그인)로 두 번째 실행을 가로채 기존 창에 전달 → 교체/새창을 물음
- 새 창은 argv를 못 구분하니 URL 쿼리로 경로 전달, capabilities는 글롭 라벨(`proj-*`)로 권한 부여
- "재생 OK, export 찝힘" = 재인코딩(AAC 오버슈트)+리샘플+clamp — 재인코딩 전 헤드룸 필요
- 리미터는 피크를 자르지 않고 look-ahead로 미리 눌러 상한을 지킨다(선형 ceiling = 10^(dB/20))
- 앱 전용 유료라도 웹엔 구매 동선을 남긴다 — 활성화 컨트롤만 감추고 구매 버튼 노출
