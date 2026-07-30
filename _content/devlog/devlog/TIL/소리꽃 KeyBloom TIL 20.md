---
layout: post
title: 소리꽃 KeyBloom TIL 20
date: 2026-07-25
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 브라우저 오디오 지연을 우회하려고 Rust로 저지연 피아노 엔진을 짠 이야기 — cpal 전용 스레드와 락 없는 링버퍼, 샘플 바이너리 임베드, 그리고 samplePiano의 믹서를 콜백 안으로 옮기며 만난 것들.
tags:
  - Rust
---
브라우저 웹 오디오는 출력 지연 바닥이 ~48ms라 라이브 연주에 못 쓴다. 그래서 소리만 Rust(cpal)로 직접 내기로 했다. Web Audio 그래프를 쓰던 걸 오디오 콜백 하나로 옮기니, 실시간 오디오의 규칙들을 처음부터 다시 만나게 됐다.

---

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

---

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

---

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

---

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

---

## 지연 실측

라이브 지연을 정직하게 보여주려고, 콜백이 주는 타임스탬프에서 "지금 넘긴 소리가 실제로 나올 시각 − 콜백 시각"을 뽑았다. 드라이버가 이 값을 안 주면 버퍼 크기로 추정한다(0에 안 머물게).

```rust
let ms = ts.playback.duration_since(&ts.callback)
    .map(|d| d.as_secs_f64() * 1000.0)
    .unwrap_or_else(|| (data.len() / channels) as f64 / dev_rate as f64 * 1000.0);
```

한 번 데인 것 — 샘플 로딩(120개 디코드)이 오래 걸려 스트림이 늦게 시작되면, 프론트에서 지연값을 읽는 창이 먼저 끝나 표시가 사라졌다. 값이 들어올 때까지 계속 폴링하게 고쳤다.

---

## 요약

- cpal `Stream`은 !Send라 전용 스레드가 소유하고 park시켜 살려둔다 — 커맨드는 스트림을 안 건드린다.
- 오디오 콜백은 락·할당 금지 — 이벤트는 SPSC 락프리 링버퍼로 넘기고, 디코드는 미리.
- 경로 문제는 `include_dir`로 샘플을 바이너리에 임베드해 없앴다.
- 믹서는 피치시프트(장치레이트 보정 포함)·세기 레이어·note-off 릴리스·재타격 페이드·tanh 마스터.
- velocity 곡선 지수는 "다이내믹 넓히기 ↔ 충분히 크게"의 밀당 — 슬라이더로 마무리.
- 서스테인은 보이스별 key_down + 전역 pedal 상태로 판정.
- 지연은 콜백 타임스탬프로 실측하되, 드라이버 미보고·로딩 지연을 폴백·폴링으로 방어.
