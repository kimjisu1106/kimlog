---
layout: post
title: 소리꽃 KeyBloom TIL 21
date: 2026-07-25
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: WASAPI 22ms를 한 자릿수로 내리려 ASIO를 붙이며 배운 것 — 빌드 셋업(LLVM·SDK·환경변수), 그리고 오디오 인터페이스 드라이버가 목록에서 조용히 사라지던 "한 번에 하나만 로드" 함정.
tags:
  - Rust
---
cpal 기본(WASAPI 공유모드)으로 22ms까지 왔지만 연주용엔 아쉬웠다. 오디오 인터페이스(UR22C)의 ASIO 드라이버를 쓰면 지연을 더 낮출 수 있는데, 붙이는 과정에서 빌드 셋업과 열거 함정 두 가지를 만났다. 특히 두 번째는 로그를 파고들어 직접 잡았다.

---

## 왜 ASIO인가

Windows에서 브라우저·기본 오디오는 WASAPI(윈도우 기본 소리 통로) 공유모드로만 나가서 지연 바닥이 있다(우리 기기 22ms). ASIO(오디오 장비에 거의 직결하는 저지연 규격)는 오디오 인터페이스 하드웨어에 거의 직결이라 지연이 크게 낮아진다(실측 12ms, 드라이버 제어판에서 버퍼를 더 낮추면 한 자릿수 ms도 가능). cpal은 `asio` 피처로 이걸 지원한다.

---

## ASIO 빌드 셋업

`cpal = { version = "0.15", features = ["asio"] }` 하나로 끝이 아니다. asio-sys는 빌드할 때 세 가지가 더 필요하다.

1. LLVM(libclang) — ASIO SDK의 C++ 헤더를 bindgen이 읽어 Rust 바인딩을 생성. `winget install LLVM.LLVM`.
2. Steinberg ASIO SDK — Steinberg에서 받아 압축 해제(빌드용은 라이선스상 허용).
3. 환경변수 — asio-sys가 위 둘의 위치를 찾을 수 있게 지정한다.

```toml
# src-tauri/.cargo/config.toml (머신 특정 — gitignore)
[env]
CPAL_ASIO_DIR = "C:/Users/.../asiosdk_2.3.3_2019-06-14"
LIBCLANG_PATH = "C:/Program Files/LLVM/bin"
```

`.cargo/config.toml`의 `[env]`에 두면 `cargo`(따라서 `tauri:dev`/`build`)가 부를 때 자동 적용돼서, 터미널마다 export할 필요가 없다. 이게 없으면 asio-sys 빌드가 실패한다. 웹 빌드엔 전혀 무관하다.

---

## 드라이버 열거 함정

### 증상 — 인터페이스 드라이버가 안 보임

ASIO를 붙였는데 소리가 노트북 스피커로 나거나 아예 안 났다. 로그를 찍어보니 잡힌 드라이버가 `Steinberg built-in ASIO Driver`(범용 브릿지) 하나뿐이었다. DAW에선 멀쩡히 쓰는 `Yamaha Steinberg USB ASIO`(UR22C 하드웨어)가 cpal 목록엔 없었다. 다른 오디오 프로그램이 아무것도 떠 있지 않은데도 그랬다.

### 원인 — 한 번에 하나만 로드

파고들어 보니, asio-sys는 ASIO 드라이버를 한 번에 하나만 로드할 수 있다. 그런데 내 코드는 장치 목록을 `collect()`로 한꺼번에 쥐고 있었다.

```rust
// ❌ 문제 — Device들을 동시에 붙잡음
let devices: Vec<_> = host.output_devices()?.collect();
```

첫 드라이버(built-in)를 쥔 채로 다음(Yamaha)을 로드하려니 `DriverAlreadyExists`로 조용히 실패해 목록에서 빠졌다. 그래서 built-in만 남았던 것.

### 해결 — 이름만 훑고 하나만 열기

1패스로 이름만 뽑으면서 각 Device를 즉시 드롭(= 드라이버 해제)하고, 2패스에서 고른 하나만 다시 연다.

```rust
// 1패스: 이름만 — 루프 한 바퀴마다 Device가 드롭되어 드라이버가 풀린다
let mut names = Vec::new();
for d in host.output_devices()? { names.push(d.name().unwrap_or_default()); }

// 하드웨어(usb/yamaha/ur…, built-in 제외) 우선 선택
let chosen = names.iter().find(|n| is_hw(n))
    .or_else(|| names.iter().find(|n| !is_builtin(n)))
    .or_else(|| names.first())?.clone();

// 2패스: 고른 하나만 연다
for d in host.output_devices()? {
    if d.name().unwrap_or_default() == chosen { return Some(d); }
}
```

그제야 `Yamaha Steinberg USB ASIO`가 목록에 뜨고, 선택되어 UR22C로 직접 나갔다. "리소스를 하나만 붙잡을 수 있는데 전부 붙잡으려 했다"가 함정의 정체였다.

> 여기까지 오는 데 엉뚱한 데를 오래 의심했다. 처음엔 인터페이스 드라이버 설정이나 다른 오디오 프로그램(켜지도 않은 DAW)을 붙잡고 있었다. 정작 원인은 바깥이 아니라 코드가 드라이버를 전부 쥐고 있던 것이었는데, "드라이버가 하나만 잡힌다"는 로그를 놓고 "혹시 이 프로세스가 먼저 하나를 잡아서 나머지가 안 보이는 것 아닌가"를 짚고 나서야 풀렸다. 안 될 때 바깥부터 의심하는 습관이 로그 안의 단서를 늦게 보게 했다.

---

## built-in 브릿지 제외 + WASAPI 폴백

범용 `built-in` 브릿지는 저지연 이득도 없으면서 출력을 엉뚱한 장치(노트북)로 보낸다. 그래서 하드웨어 ASIO 드라이버가 있을 때만 ASIO를 쓰고, 없으면 WASAPI 기본출력으로 폴백하게 했다. WASAPI 기본출력은 Windows 기본 장치(보통 사용자가 쓰는 인터페이스)라 소리 위치가 맞는다.

```rust
fn pick_host() -> (cpal::Host, bool) {
    if let Ok(h) = cpal::host_from_id(cpal::HostId::Asio) {
        let has_hw = h.output_devices()
            .map(|ds| ds.filter(|d| !is_builtin(&d.name().unwrap_or_default())).count() > 0)
            .unwrap_or(false);
        if has_hw { return (h, true); } // 하드웨어 ASIO 있을 때만
    }
    (cpal::default_host(), false) // 아니면 WASAPI
}
```

그리고 ASIO는 독점이라, DAW가 인터페이스를 쥐고 있으면 앱이 못 쓴다(하나만 사용) — 이건 ASIO 자체의 특성이라 감수한다.

---

## 요약

- ASIO 빌드는 크레이트 피처 외에 LLVM(libclang)·Steinberg SDK·환경변수(`CPAL_ASIO_DIR`/`LIBCLANG_PATH`)가 필요 — `.cargo/config.toml [env]`에 두면 자동 적용.
- asio-sys는 드라이버를 한 번에 하나만 로드한다. `output_devices().collect()`로 다 쥐면 두 번째가 `DriverAlreadyExists`로 조용히 탈락한다.
- 이름만 1패스로 훑고(Device 즉시 드롭=해제) 고른 하나만 2패스에서 연다.
- 범용 built-in 브릿지는 제외하고 하드웨어 ASIO 우선, 없으면 WASAPI 폴백 — 저지연도 출력 위치도 챙긴다.
- ASIO는 독점 사용 — DAW가 잡고 있으면 못 쓴다.
