---
layout: post
title: 소리꽃 KeyBloom TIL 19
date: 2026-07-25
permalink: "devlog/devlog/TIL/소리꽃 KeyBloom TIL 19"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 웹 KeyBloom을 네이티브 데스크톱 앱으로 만든 날 — Tauri로 껍데기 감싸기, Rust(cpal/ASIO)로 저지연 피아노 엔진, 그리고 라이브 녹화를 오프라인 렌더로 다시 짜고 MIDI로도 뽑기.
tags:
  - TypeScript
  - Rust
  - JavaScript
  - CSS
---
07-25에 배운 것들을 네 갈래로 묶는다 — Tauri로 웹앱을 네이티브로 감싸기, Rust로 저지연 피아노 엔진 짜기, ASIO로 지연을 더 낮추기, 그리고 라이브 녹화를 "이벤트 기록 후 오프라인 렌더"로 다시 짜기.

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

브라우저 웹 오디오는 출력 지연 바닥이 ~48ms라 라이브 연주에 못 쓴다. 그래서 소리만 Rust(cpal)로 직접 내기로 했다. Web Audio 그래프를 쓰던 걸 오디오 콜백 하나로 옮기니, 실시간 오디오의 규칙들을 처음부터 다시 만나게 됐다.

## 브라우저 지연을 우회하기

### cpal로 오디오를 직접 낸다

`cpal`은 OS 오디오(Windows면 WASAPI, 나중엔 ASIO)에 출력 스트림을 여는 크레이트(Rust의 재사용 부품 꾸러미, 라이브러리)다. 스트림은 스피커로 소리가 흘러나가는 관인데, 관을 열고 콜백(OS가 "다음 소리 조각 내놔" 하고 불러 주는 함수)에 소리 샘플을 채워 넣으면 그게 스피커로 나간다. 브라우저의 고정 버퍼링을 거치지 않으니 지연이 확 준다(실측 22ms, 웹 58ms의 절반 이하).

### 소리 관은 한 스레드만 쥐어야 한다 (Stream은 !Send)

첫 벽. 스레드(thread)는 프로그램 안에서 동시에 도는 작업 라인인데, 어떤 물건은 스레드끼리 넘겨도 되고(`Send`) 어떤 건 안 된다(`!Send`). `cpal`의 `Stream`(소리 관)은 Windows에서 `!Send`라 스레드 간에 옮길 수 없다. 그런데 Tauri 커맨드는 여러 스레드에서 불린다. 그래서 스트림을 상태(State)에 담아둘 수가 없었다.

해결은 전용 오디오 스레드가 스트림을 소유하고 그냥 살아있게 두는 것. 커맨드는 스트림을 건드리지 않고 이벤트만 보낸다.

```rust
pub fn init(&self) {
    if self.inited.swap(true, Ordering::SeqCst) { return; }
    let (prod, cons) = RingBuffer::<Cmd>::new(2048);
    *self.prod.lock().unwrap() = Some(prod);       // 커맨드는 여기로 이벤트를 넣고
    std::thread::spawn(move || run_audio(cons));   // 오디오 스레드가 스트림을 소유
}

fn run_audio(cons: Consumer<Cmd>) -> Result<(), String> {
    let stream = /* ...build & play... */;
    stream.play()?;
    loop { std::thread::sleep(Duration::from_secs(3600)); } // 스트림을 살려두려 스레드 유지
}
```

### 이벤트는 기다림 없이 넘긴다 (락프리 링버퍼)

오디오 콜백은 실시간이라 잠그면 안 된다 — 락(줄 서서 차례를 기다리는 것)에 걸리면 그동안 소리가 끊긴다. 커맨드 스레드가 노트 이벤트를 넣고 콜백이 빼는 구조라, 한쪽만 넣고 한쪽만 빼는 원형 우편함(단일 생산자-단일 소비자 SPSC, 기다림 없는 락프리 링버퍼 `rtrb`)을 썼다. 생산자는 커맨드 쪽(Mutex로 감쌈, 여러 스레드가 넣을 수 있어), 소비자는 오디오 콜백.

```rust
// 오디오 콜백 안 — 락 없이 이벤트만 뺀다
while let Ok(cmd) = cons.pop() {
    match cmd {
        Cmd::NoteOn { midi, vel } => { /* 보이스 추가 */ }
        Cmd::NoteOff { midi } => { /* 릴리스 */ }
        // ...
    }
}
```

콜백에서는 할당도 락도 안 한다 — 샘플 디코드·버퍼 준비는 전부 스트림 열기 전에 끝내둔다.

## 샘플을 바이너리에 임베드

웹에선 샘플을 `fetch`로 받았는데, 네이티브에선 파일 경로가 dev와 배포에서 달라 골치였다. 그래서 `include_dir`로 컴파일 시점에 샘플 전체를 바이너리에 넣었다 — 경로 문제가 원천 소멸한다.

```rust
static SAMPLES: Dir = include_dir!("$CARGO_MANIFEST_DIR/../public/samples/piano");
// ...
if let Some(f) = SAMPLES.get_file(&format!("{p}_{b}.ogg")) {
    let pcm = decode_ogg(f.contents())?; // symphonia로 디코드
}
```

바이너리가 몇 MB 커지지만, dev/배포 경로 분기가 사라지는 값이 더 크다.

## 콜백 믹서 — 샘플 피아노를 코드로

믹서(여러 건반 소리를 하나로 섞는 것)를 오디오 콜백 안으로 옮긴 것이다. 웹의 `samplePiano.ts`(피치시프트·세기 레이어·릴리스)를 콜백 안으로 이식했다.

### 최근접 피치 피치시프트 + 세기 레이어

88건반을 다 녹음하지 않고 단3도 간격 샘플만 두고, 재생속도로 음정을 맞춘다. 세기(velocity)는 4단계 레이어 중 고른다.

```rust
let pitch = nearest_pitch(midi);              // 최근접 샘플 피치
let band = band_for(vel);                     // 세기 레이어
voices.push(Voice {
    step: 2f32.powf((midi as f32 - pitch as f32) / 12.0) * rate_ratio, // 피치시프트 × 장치레이트 보정
    gain: BAND_COMP[band] * (0.25 + 1.25 * vel.powf(1.25)),            // 레이어 보정 × velocity 곡선
    // ...
});
```

`step`에 `장치레이트 보정`을 곱하는 건, 샘플은 48kHz인데 장치가 44.1kHz로 열리면 그만큼 빨리/느리게 읽어야 음정이 맞기 때문이다. 매 출력 프레임마다 `pos += step`으로 소스 버퍼를 훑고 선형 보간한다.

### note-off 릴리스·재타격 + tanh 마스터

피아노는 떼면 댐퍼가 현을 멈춘다. 그래서 note-off에 지수 릴리스를 걸고(스타카토가 됨), 같은 음을 다시 치면 이전 울림을 빠르게 페이드한다(재타격 겹침 방지). 마스터는 하드 클리핑 대신 `tanh`로 부드럽게 포화시켜, 크게 키워도 화음이 거칠게 깨지지 않는다.

```rust
mix += s * v.gain * v.env;
if v.releasing { v.env *= v.rel_coef; if v.env < 0.001 { v.dead = true; } }
// ...
let out = (mix * master).tanh(); // 마스터 볼륨 + 소프트 리미터
```

### velocity 곡선은 두 번 고쳤다

처음엔 다이내믹을 넓히려 `vel^1.5`로 눌렀는데, 중간 세기가 너무 조용해져 forte를 내려면 건반을 부술 듯 쳐야 했다. `vel^1.25`로 덜 누르고 전체를 키운 뒤 사용자 볼륨 슬라이더를 달아 균형을 맞췄다. "다이내믹 넓히기"와 "충분히 크게"는 곡선 지수 하나로 밀당하는 문제였다.

## 서스테인 페달

MIDI 페달(CC64)을 받아, 페달이 밟힌 동안엔 건반을 떼도 소리를 유지하고 페달을 뗄 때 한꺼번에 댐퍼를 건다. 보이스마다 "건반이 눌려있나(key_down)"를 두고, note-off·페달업에서 판정한다.

```rust
Cmd::NoteOff { midi } => for v in voices.iter_mut() {
    if v.midi == midi && v.key_down { v.key_down = false;
        if !sustain { v.releasing = true; } } // 페달 안 밟혔으면 바로 댐퍼
}
Cmd::Sustain { down } => { sustain = down;
    if !down { for v in voices.iter_mut() {
        if !v.key_down { v.releasing = true; } } } // 페달 뗌 → 이미 뗀 건반 댐퍼
}
```

## 지연 실측

라이브 지연을 정직하게 보여주려고, 콜백이 주는 타임스탬프에서 "지금 넘긴 소리가 실제로 나올 시각 − 콜백 시각"을 뽑았다. 드라이버가 이 값을 안 주면 버퍼 크기로 추정한다(0에 안 머물게).

```rust
let ms = ts.playback.duration_since(&ts.callback)
    .map(|d| d.as_secs_f64() * 1000.0)
    .unwrap_or_else(|| (data.len() / channels) as f64 / dev_rate as f64 * 1000.0);
```

한 번 데인 것 — 샘플 로딩(120개 디코드)이 오래 걸려 스트림이 늦게 시작되면, 프론트에서 지연값을 읽는 창이 먼저 끝나 표시가 사라졌다. 값이 들어올 때까지 계속 폴링하게 고쳤다.

---

cpal 기본(WASAPI 공유모드)으로 22ms까지 왔지만 연주용엔 아쉬웠다. 오디오 인터페이스(UR22C)의 ASIO 드라이버를 쓰면 지연을 더 낮출 수 있는데, 붙이는 과정에서 빌드 셋업과 열거 함정 두 가지를 만났다. 특히 두 번째는 로그를 파고들어 직접 잡았다.

## 왜 ASIO인가

Windows에서 브라우저·기본 오디오는 WASAPI(윈도우 기본 소리 통로) 공유모드로만 나가서 지연 바닥이 있다(우리 기기 22ms). ASIO(오디오 장비에 거의 직결하는 저지연 규격)는 오디오 인터페이스 하드웨어에 거의 직결이라 지연이 크게 낮아진다(실측 12ms, 드라이버 제어판에서 버퍼를 더 낮추면 한 자릿수 ms도 가능). cpal은 `asio` 피처로 이걸 지원한다.

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

라이브 연주를 녹화하는데, 실시간으로 화면을 찍으니 컴퓨터가 버벅이면 그 버벅임이 그대로 영상에 박혔다. "치는 순간"과 "결과물"을 떼어놓는 게 이 문제의 핵심이었다.

## 라이브 녹화를 다시 짜기

### 실시간 캡처의 한계

기존 라이브 녹화는 `MediaRecorder`(브라우저 화면·소리를 녹화하는 API)로 캔버스를 실시간으로 담았다. 즉 그 순간 렌더된 프레임을 그대로 녹화하니, 기기가 버벅이면 버벅인 프레임이 박힌다. 포맷(webm)을 바꿔도 소용없다 — 담는 방식이 실시간이라서다.

파일 모드의 "고화질 MP4"는 이미 이 문제가 없었다. 프레임을 한 장씩 계산해 인코딩하니까. 라이브만 실시간 캡처라 노출돼 있었다.

### 연주를 이벤트로 기록

그래서 라이브 녹화를 "화면을 찍는" 게 아니라 "연주를 기록하는" 것으로 바꿨다. 녹화 중엔 노트 on/off와 큐 전환, 페달을 타임스탬프와 함께 배열에 쌓기만 한다. 미리보기는 버벅여도 상관없다 — 기록엔 영향이 없으니.

```ts
function noteOn(midi, velocity) {
  // ...소리·파티클...
  if (liveRecording) liveRecNotes.push({ midi, velocity, onT: liveRecTime(), offT: null });
}
```

### 정지 후 오프라인 렌더

정지하면 기록한 이벤트를 노트 배열로 재구성해, 파일 MP4와 똑같은 오프라인 렌더러(실시간이 아니라 미리 한 번에 그려내는 것)에 넘긴다. 완벽한 60fps 프레임 + 샘플 피아노 소리가 나온다(기존 라이브 녹화는 영상만이었다). 렌더러는 파일/라이브 공용으로, 입력만 다르다.

페달을 밟은 채 뗀 음은 페달을 뗄 때까지 울려야 하니, 페달 구간을 노트 길이로 변환해서 넘긴다(파일 MIDI의 서스테인 처리와 같은 규칙).

```ts
// 페달 구간 [down, up) 안에서 뗀 노트는 페달 뗄 때까지 연장
for (const [d, u] of pedal) {
  if (off < u) { if (off >= d) dur = u - e.onT; break; }
}
```

트레이드오프는 정지 후 렌더 시간이 필요하다는 것 — 대신 결과물 품질이 기기 성능과 무관해진다.

## 연주를 MIDI로도

기록해 둔 이벤트가 있으니, 영상뿐 아니라 `.mid` 파일로도 뽑을 수 있다. `@tonejs/midi`(이미 파싱에 쓰던 라이브러리)로 노트와 페달(CC64)을 채워 쓴다. DAW에서 그대로 열린다.

```ts
const m = new Midi();
const tr = m.addTrack();
for (const e of liveRecNotes)
  tr.addNote({ midi: e.midi, time: e.onT, duration: (e.offT ?? endT) - e.onT, velocity: e.velocity });
for (const s of liveRecSustain)
  tr.addCC({ number: 64, value: s.down ? 1 : 0, time: s.time }); // 서스테인 페달
await saveOutput(new Blob([m.toArray()]), "keybloom-live", "mid");
```

MIDI엔 페달을 노트 길이로 녹이지 않고 CC64 이벤트 그대로 넣는다 — 재생기가 페달을 해석하게. 영상은 길이로 굽고, MIDI는 이벤트로 남긴다.

## 잔손질

### 시작 로딩바 — 로더가 하나여야 진행률이 잡힌다

피아노 샘플 120개를 디코드하는 몇 초 동안 로딩바를 띄우려 했는데, 진행률 콜백(OS·브라우저가 "다음 조각 내놔" 하고 불러 주는 함수)이 안 붙었다. 샘플 로드가 두 군데서 시작되고 있었기 때문이다 — 오디오 컨텍스트(웹 오디오의 작업 공간)를 만들 때 자동으로 한 번, 프리로드에서 또 한 번. 로드 결과는 캐시(한 번만 실행)라, 먼저 부른 "자동 로드"가 이겨서 진행률 콜백 없이 끝나버렸다.

컨텍스트 생성 시의 자동 로드를 없애 프리로드가 유일한 로더가 되게 하니, 그제야 진행률이 들어왔다. 오버레이는 로딩이 끝날 때까지 화면을 덮어 준비 전 사용을 막는다(실패해도 가두지 않게 catch로 제거).

```ts
loadPromise = Promise.all(urls.map(async (u) => {
  buffers.set(u, await ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()));
  onProgress?.(++done, urls.length); // 로더가 하나여야 이 콜백이 붙는다
}));
```

같은 작업을 두 경로가 시작할 수 있으면 콜백·진행률은 먼저 부른 쪽에 매인다. 진행률을 붙이려면 로더를 하나로 모아야 한다.

### 다크 스크롤바

패널이 넘칠 때 뜨는 기본 밝은 스크롤바가 다크 테마와 안 맞았다. 안 보이는 듯하되 잡을 순 있게, 얇고 은은하게 스타일했다(Chromium/WebView2).

```css
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-thumb {
  background: var(--panel-border);
  border: 2px solid transparent;      /* padding-box로 여백 줘 가늘게 */
  background-clip: padding-box;
  border-radius: 6px;
}
```

### 광고는 웹 전용

카카오 애드핏 광고가 네이티브 앱에서 같은 자리에 멈춰 있었다. AdFit은 승인된 웹 도메인에서만 서빙해서, 네이티브 WebView(앱 속에 넣은 브라우저 화면)에선 갱신도 안 되고 외부 호출도 부적절했다. 그래서 광고를 정적 HTML에서 빼고, 웹일 때만 JS로 주입하게 했다.

```ts
export function initAd(): void {
  if (IS_NATIVE) return;              // 네이티브엔 안 실음
  // ...웹에서만 #adBox에 ins + 스크립트 주입...
}
```

그리고 네이티브에선 광고 자리를 CSS로 숨겨 그 공간을 되돌렸다 — 파일 모드는 시퀀서가 폭 전체를, 라이브는 하단을 통째로 숨겨 미리보기를 넓게.

```css
body.native #adBox { display: none; }
body.native.live-mode #bottom { display: none; }
```

레이아웃이 바뀌니 라이브 전환 시 캔버스를 다시 계산해야 했다(창 크기가 안 변해 resize 이벤트가 안 옴 — 직접 호출).

---

## 요약

- Tauri는 기존 정적 프론트를 웹뷰로 띄우는 껍데기다(`frontendDist`/`devUrl`만). 웹/네이티브 구분은 능력 플래그 하나(`IS_NATIVE`)로. 네이티브 저장은 JS가 대화상자로 경로를 받고 Rust `write_file`(std::fs)이 쓴다(스코프 우회). 소리는 통째로 옮기지 말고 라이브 진입점(`triggerNote`) 하나만 네이티브로 가른다.
- cpal `Stream`은 !Send라 전용 스레드가 소유하고 park시켜 살려둔다. 오디오 콜백은 락·할당 금지 — 이벤트는 SPSC 락프리 링버퍼로, 디코드는 미리. 경로 문제는 `include_dir`로 샘플을 바이너리에 임베드해 없앤다.
- Rust 믹서는 피치시프트(장치레이트 보정)·세기 레이어·note-off 릴리스·재타격 페이드·tanh 마스터. velocity 곡선 지수는 "다이내믹 ↔ 크기"의 밀당. 서스테인은 보이스별 key_down + 전역 pedal. 지연은 콜백 타임스탬프로 실측하되 폴백·폴링 방어.
- ASIO 빌드는 크레이트 피처 외 LLVM·Steinberg SDK·환경변수(`.cargo/config.toml [env]`). asio-sys는 드라이버를 한 번에 하나만 로드 — `collect()`로 다 쥐면 둘째가 `DriverAlreadyExists`로 탈락. 이름만 1패스로 훑고(즉시 드롭) 고른 하나만 2패스에서 연다. built-in 제외·하드웨어 우선·WASAPI 폴백.
- 실시간 캡처는 기기 버벅임을 박는다 → 라이브 녹화를 "이벤트 기록 → 정지 후 오프라인 렌더"로(+오디오·MIDI 추출). 페달은 영상엔 길이로, MIDI엔 CC64로.
- 시작 로딩바는 로더가 하나여야 진행률이 붙는다. AdFit은 웹 전용 — 네이티브는 주입 건너뛰고 CSS로 자리를 숨겨 공간을 돌려주고, 레이아웃이 바뀌면 캔버스 재계산을 직접 부른다.
