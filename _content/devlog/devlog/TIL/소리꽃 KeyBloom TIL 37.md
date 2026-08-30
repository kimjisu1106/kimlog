---
layout: post
title: 소리꽃 KeyBloom TIL 37
date: 2026-08-06
permalink: "devlog/devlog/TIL/소리꽃 KeyBloom TIL 37"
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 1080p 30분이 걸리던 영상 내보내기를, 프레임당 프로파일링으로 병목을 갈라 하드웨어 인코더로 우회하고 웹뷰-네이티브 전송을 압축·워커 병렬화·stdin 스트리밍으로 풀어내며 주변 UX까지 다듬은 이야기.
tags:
  - TypeScript
  - Rust
---
영상 하나 뽑는 데 1080p가 30분이 넘었다. "느리다"만으로는 못 고치니, 어디가 느린지부터 숫자로 갈랐다.

---

## 렌더가 느린지 인코더가 느린지부터 가른다

프레임을 한 장씩 그려서 인코더에 넣는 구조다. 그러니 느린 곳은 둘 중 하나다 — 그리는 것(렌더), 아니면 인코더가 밀려서 기다리는 것. 프레임마다 두 시간을 따로 쟀다.

`encodeQueueSize`는 인코더에 아직 안 끝난 프레임이 몇 장 쌓였는지다. 이게 계속 크면 인코더가 못 따라오는 것이라, 큐가 빌 때까지 기다린 시간을 "인코더 대기"로 쟀다.

```ts
let render = 0, wait = 0;
// …프레임 루프 안
const t0 = performance.now();
drawFrame(i);                                   // 파티클·건반 렌더
render += performance.now() - t0;

const t1 = performance.now();
while (encoder.encodeQueueSize > 4) await dequeue(); // 인코더가 밀리면 여기서 대기
wait += performance.now() - t1;
```

결과는 렌더 2ms, 인코더 대기 107ms. 렌더는 죄가 없고 인코더가 범인이었다.

---

## 브라우저 내장 인코더가 하드웨어를 못 잡는다

인코더는 브라우저 내장 H.264(가장 널리 쓰이는 영상 압축 코덱)를 WebCodecs(브라우저에서 영상·오디오를 직접 인코딩하는 API)의 `VideoEncoder`로 썼다. 원래 이걸 고른 이유가 "하드웨어 인코딩"이었는데, 107ms는 딱 소프트웨어 인코딩 속도다.

네이티브 앱을 감싸는 웹뷰(WebView2)가 GPU의 하드웨어 인코더를 안 잡고 소프트웨어로 떨어진 것이다. 하드웨어를 명시로 요청하거나 실시간 모드로 바꿔도 그대로였다.

```ts
// ❌ 다 넣어봐도 WebView2에선 소프트웨어로 떨어짐
const config = {
  codec: "avc1.4d002a",
  hardwareAcceleration: "prefer-hardware", // 하드웨어 "선호"는 강제가 아님
  latencyMode: "realtime",                 // 실시간 모드로도 안 빨라짐
  // …
};
await VideoEncoder.isConfigSupported(config); // supported: true지만 실제론 소프트웨어
```

GPU엔 하드웨어 인코더가 분명히 있는데(내장 그래픽도 대부분 있다) 웹뷰가 접근을 못 하는 것이라, 브라우저 인코더로는 이 이상 빨라질 수 없었다.

---

## 네이티브 ffmpeg의 하드웨어 인코더로 우회한다

앱엔 이미 ffmpeg가 번들돼 있다(투명 영상 묶는 데 씀). ffmpeg는 GPU 벤더별 하드웨어 인코더를 직접 부를 수 있다 — AMD는 `h264_amf`, 인텔은 `h264_qsv`, 엔비디아는 `h264_nvenc`.

머신마다 GPU가 다르니, 실제로 되는 인코더를 작은 테스트 인코딩으로 찾았다. 되면 쓰고, 셋 다 안 되면 브라우저 인코더로 폴백한다.

```rust
// 이 PC에서 실제 동작하는 첫 하드웨어 인코더를 찾는다
for enc in ["h264_amf", "h264_qsv", "h264_nvenc"] {
    let ok = ffmpeg(["-f", "lavfi", "-i", "testsrc2=s=256x144:d=1",
                     "-frames:v", "1", "-c:v", enc, "-f", "null", "-"])
        .status().map(|s| s.success()).unwrap_or(false);
    if ok { return enc.to_string(); }
}
String::new() // 없으면 빈 문자열 → 브라우저 인코더 폴백
```

명령줄로 재보니 `h264_amf`가 프레임당 4ms. 소프트웨어 107ms의 약 25배다. 인코더 자리는 이걸로 끝났다 — 근데 진짜 싸움은 프레임을 브라우저에서 이 인코더로 넘기는 다음 단계였다.

---

인코더를 하드웨어로 바꾸니 인코딩은 4ms로 빨라졌다. 근데 렌더는 웹뷰(브라우저 엔진)에서, 인코딩은 네이티브(ffmpeg)에서 한다. 그 사이로 프레임을 넘겨야 하는데, 이 전송이 새 병목이었다.

---

## 웹뷰 밖으로 큰 데이터를 빼는 건 경로를 바꿔도 느리다

한 프레임을 raw 픽셀(RGBA)로 넘기면 1080p가 8MB다. 이걸 웹뷰에서 네이티브로 넘기는 기본 통로(Tauri `invoke`)로 보내니 프레임당 210ms가 걸렸다. 인코더(4ms)는 놀고 전송이 발목을 잡았다 — 초당 40MB 정도밖에 안 나온 셈이다.

통로가 문제인가 싶어 다른 통로도 실제로 만들어 재봤다. 로컬 웹소켓(앱 안에서 여는 WebSocket)으로 같은 raw 프레임을 보내도 프레임당 250ms로 비슷했다.

즉 특정 통로가 느린 게 아니라, 웹뷰에서 렌더러 밖으로 큰 데이터를 빼는 것 자체가 느리다. 통로를 바꾸는 건 헛수고고, 넘기는 데이터 자체를 줄여야 했다.

---

## 바이너리는 base64 말고 raw로 넘긴다

데이터를 줄이려면 프레임을 압축해야 하는데(뒤에서), 그 압축된 바이트를 넘길 때도 낭비가 없어야 한다. 예전엔 바이너리를 문자열(base64)로 바꿔 넘겼는데, 이러면 크기가 1.33배 늘고 인코딩 비용도 든다.

Tauri v2는 `ArrayBuffer`(또는 `Uint8Array`)를 그대로 넘기면 raw 바이너리로 보낸다. 받는 Rust는 JSON이 아니라 raw 본문으로 받는다.

```ts
// JS — 두 번째 인자에 바이트를 그대로. base64 변환 없음
await invoke("hw_encode_write", jpegBytes); // jpegBytes: Uint8Array
```

```rust
// Rust — 인자를 JSON이 아니라 raw 본문으로 받는다
#[tauri::command]
fn hw_encode_write(request: tauri::ipc::Request) -> Result<(), String> {
    let bytes = match request.body() {
        tauri::ipc::InvokeBody::Raw(b) => b, // 여기로 옴
        _ => return Err("raw 아님".into()),
    };
    // …ffmpeg stdin에 write
}
```

---

## 압축을 메인 스레드에서 하면 병렬이 안 된다

프레임을 JPEG로 압축하니 8MB에서 50KB로 줄어(40배) 전송은 8ms로 해결됐다. 그런데 이번엔 압축 자체가 프레임당 108ms로 새 병목이 됐다.

캔버스를 이미지로 압축하는 `toBlob`을, 브라우저(Blink)는 메인 스레드의 짬 나는 시간(idle)에 조금씩 쪼개 실행한다. 그래서 여러 장을 한꺼번에 요청해도 한 스레드에서 순서대로 처리돼 병렬이 안 된다.

반면 워커(백그라운드 스레드)의 `convertToBlob`은 그 워커 스레드에서 통으로 실행된다. 워커를 여러 개 두면 그만큼 CPU 코어로 병렬 압축이 된다. 그래서 워커 풀(코어 수 − 2, 최대 8개)을 만들어 프레임을 나눠 압축했다.

---

## 큰 버퍼는 복사 말고 소유권을 넘긴다

메인에서 워커로 8MB 픽셀을 보낼 때 매번 복사하면 그것도 비용이다. `postMessage`의 두 번째 인자(transfer list)에 버퍼를 넣으면, 복사 대신 소유권만 넘어간다(transferable). 넘긴 쪽에선 그 버퍼를 더는 못 쓰지만, 어차피 다음 프레임은 새로 그리니 상관없다.

```ts
const img = ctx.getImageData(0, 0, w, h);
worker.postMessage(
  { seq: submitted, width: w, height: h, buf: img.data.buffer },
  [img.data.buffer], // 이 목록에 넣으면 복사 대신 소유권 이전 — 무복사
);
```

---

## 순서를 지키면서 밀어넣는다

워커 여러 개가 병렬로 압축하니 완료 순서가 뒤섞인다. 근데 ffmpeg stdin(표준 입력)은 프레임을 순서대로 받아야 한다. 그래서 완료된 프레임을 번호(`seq`)로 모아두고, 앞 번호부터 순서대로 하나의 직렬 체인에 실어 보냈다.

또 워커에 나가 있는 프레임이 너무 많으면 메모리가 부푸니, 나간 것과 기록한 것의 차가 상한을 넘으면 렌더를 잠시 멈춘다(backpressure).

```ts
const done = new Map();          // 완료됐지만 앞 순서를 기다리는 프레임
let written = 0;
let chain = Promise.resolve();   // ffmpeg stdin은 순차라 하나의 직렬 체인

worker.onmessage = (e) => {
  done.set(e.data.seq, e.data.bytes);
  while (done.has(written)) {     // 앞 번호부터 순서대로
    const bytes = done.get(written);
    done.delete(written);
    written++;
    chain = chain.then(() => invoke("hw_encode_write", bytes));
  }
};
// 보낸 수 − 기록한 수가 상한(워커×2)을 넘으면 렌더를 잠시 멈춤(메모리 상한)
```

이렇게 하니 1080p가 37분에서 12분, 4K도 뽑혔다. 남은 병목은 메인 스레드가 프레임을 그리고 픽셀을 읽는 직렬 구간(~31ms)이라, 워커를 더 늘려도 소용없어 8개로 고정했다.

---

투명 영상을 묶을 땐 "이미 써둔 PNG 파일을 ffmpeg가 읽게" 했다. 프레임을 stdin(표준 입력)으로 흘려보내는 스트리밍은 raw가 프레임당 수십 MB라 무거워서 접었다. 그런데 프레임을 JPEG로 압축해 작아지니, 이번엔 스트리밍이 오히려 맞았다 — 디스크에 수천 장을 쓰지 않아도 된다.

---

## Rust가 ffmpeg를 열고 stdin을 쥔다

전에 ffmpeg를 부를 땐 JS(Tauri shell 플러그인)로 파일을 읽게 했다. 근데 stdin 스트리밍은 "입력이 끝났다"는 신호(EOF)를 정확히 줘야 하는데, JS 쪽에선 stdin을 깔끔하게 닫기가 어려웠다. 그래서 Rust가 직접 ffmpeg를 프로세스로 열고 그 stdin 손잡이를 쥐었다.

프레임마다 그 손잡이에 JPEG 바이트를 쓰고, 다 끝나면 손잡이를 버린다(drop). 손잡이가 닫히면 ffmpeg가 EOF를 받아 마무리(mux)한다.

```rust
let mut child = Command::new(ffmpeg_path()?)  // 실행파일 옆에서 ffmpeg를 찾음
    .args(["-f", "mjpeg", "-framerate", "60", "-i", "-", // stdin에서 MJPEG
           "-i", audio_wav,                              // 두 번째 입력 = 오디오
           "-c:v", "h264_amf", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-shortest", out_path])
    .stdin(Stdio::piped())
    .spawn()?;
let stdin = child.stdin.take(); // 이 손잡이에 프레임을 쓴다
// …프레임마다 stdin.write_all(&jpeg)
// 끝나면 stdin을 drop → ffmpeg가 EOF를 받아 파일을 마무리
```

챙길 것 세 가지가 있었다. 실행파일 경로는 개발 땐 빌드 폴더, 배포 땐 앱 옆이라 후보를 순서대로 찾았고, 윈도우에선 프로세스를 띄울 때 콘솔 창이 깜빡이지 않게 플래그(`CREATE_NO_WINDOW`)를 줬다. 그리고 프로세스 종료를 기다리는 커맨드는 `async`로 둬서 그 대기가 메인 스레드(UI)를 안 막게 했다.

---

## stdin이 꽉 차면 알아서 기다린다

`write_all`은 파이프가 꽉 차면 ffmpeg가 읽어갈 때까지 그 자리에서 멈춘다. 이게 공짜 backpressure다 — 프레임을 ffmpeg가 소비하는 속도보다 빨리 밀어넣어도, 파이프가 차면 쓰기가 자연히 대기해 메모리에 안 쌓인다.

---

## MJPEG로 받아 오디오까지 한 번에 묶는다

입력을 `-f mjpeg`로 열면 ffmpeg는 stdin으로 들어오는 JPEG들을 프레임 시퀀스로 읽는다(Motion JPEG). 여기에 오디오 WAV를 두 번째 입력으로 물리면, 영상 인코딩과 오디오 먹싱을 ffmpeg가 한 번에 한다.

오디오는 영상보다 길이가 조금 길게 미리 만들어 뒀다(꼬리 여운이 몇 초 붙는다). `-shortest`를 주면 둘 중 짧은 쪽(=영상)에 맞춰 잘라준다.

```text
-f mjpeg -framerate 60 -i -   # 영상: stdin의 JPEG들
-i keybloom.kbaudio.wav       # 오디오: 미리 만든 WAV
-c:v h264_amf -pix_fmt yuv420p
-c:a aac -shortest            # 오디오를 영상 길이에 맞춰 자름
out.mp4
```

---

## 오류면 기다리지 말고 죽인다

정상 종료는 stdin을 닫아 ffmpeg가 남은 걸 마무리하게 기다린다. 근데 중간에 오류가 나면 마무리를 기다릴 이유가 없다. 그래서 종료 커맨드에 `abort` 플래그를 둬서, 오류 경로면 프로세스를 바로 죽이고(kill) 임시 파일만 정리했다.

```rust
async fn hw_encode_close(abort: bool) -> Result<(), String> {
    // …stdin 닫기(EOF)
    if abort { let _ = child.kill(); } // 오류면 마무리 안 기다리고 죽임
    let status = child.wait()?;
    // 임시 오디오 WAV 삭제
    if !abort && !status.success() { return Err("인코딩 실패".into()); }
    Ok(())
}
```

---

큰 작업(하드웨어 인코딩)을 붙이면서, 그 주변 UX에서 걸린 자잘한 것들을 모았다.

---

## 무거운 작업 전에 화면을 강제로 한 번 그린다

저장·불러오기를 누르면 "저장 중…" 표시가 떠야 하는데, 표시가 작업이 끝나갈 때쯤에야 떴다. 표시를 켜는 코드 바로 뒤에 무거운 동기 작업이 이어져서, 브라우저가 화면을 다시 그릴 틈 없이 작업부터 시작한 것이다.

`requestAnimationFrame`을 두 번 기다리면 브라우저가 실제로 한 프레임을 그리는 걸 보장할 수 있다. 표시를 켠 뒤 이걸 한 번 끼우면, 무거운 작업 전에 화면이 갱신된다.

```ts
// rAF 두 번 = 브라우저가 실제로 한 프레임 그리는 걸 기다린다
const paintYield = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

overlay.busy("저장 중…");
await paintYield();   // 이게 없으면 표시가 늦게 뜬다
await saveProject();  // 무거운 동기 작업
```

---

## 남은시간 추정은 극초반 값을 버린다

렌더 남은시간을 "경과 시간 ÷ 진행률"로 총 시간을 역산해 보여줬다. 그런데 진행이 1%일 때 계산하면, 시작 오버헤드가 진행률에 그대로 증폭돼 30분+ 같은 엉뚱한 값이 나온다.

그래서 진행이 5%를 넘어 초기 오버헤드가 희석된 뒤에만 남은시간을 보여주고, 그전엔 "계산 중"으로 뒀다.

```ts
const elapsed = (now - start) / 1000;
const left = (elapsed * (1 - frac)) / frac; // 진행률로 남은 시간 역산
// frac이 0.01일 때 계산하면 값이 폭발 → 5% 넘어서야 보여준다
timeEl.textContent = frac >= 0.05 ? `남음 ~${fmt(left)}` : "계산 중…";
```

---

## 중간 압축 화질은 최종 코덱을 보고 정한다

프레임을 워커로 넘기려고 중간에 JPEG로 압축한다. JPEG는 손실 압축이라 화질이 걱정될 수 있는데, 최종 결과물이 어차피 H.264(이것도 손실 압축)다. 즉 중간에 JPEG로 한 번 손실이 나도, 최종 H.264가 어차피 깎을 것보다 작으면 눈에 안 띈다.

파티클이 검은 배경 위에 뜨는 영상이라 JPEG 품질 0.95면 충분했다. "중간 단계니까 무손실이어야 한다"가 아니라, 최종 코덱 기준으로 적당히 낮춰도 되는 것이다.

---

## 자주 읽을 캔버스는 CPU 버퍼로 둔다

프레임 픽셀을 매번 `getImageData`로 읽어 워커에 보낸다. 캔버스는 기본적으로 GPU에 있어서, 픽셀을 읽을 때마다 GPU에서 CPU로 가져오는 비용이 든다. 캔버스를 만들 때 `willReadFrequently`를 켜면 CPU 버퍼로 두어 이 읽기가 빨라진다.

```ts
const ctx = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
```

---

## 요약

- "느리다"는 못 고친다. 렌더 시간과 인코더 대기 시간을 프레임마다 따로 재니 인코더가 범인인 게 드러났다
- 브라우저 내장 인코더(WebCodecs)는 WebView2에서 하드웨어를 못 잡고 소프트웨어로 떨어진다 — `prefer-hardware`·`realtime`으로도 안 됨
- 번들한 ffmpeg의 벤더별 하드웨어 인코더(`h264_amf` 등)로 우회하되, 머신마다 다르니 작은 테스트 인코딩으로 실제 되는 걸 찾는다
- 웹뷰에서 렌더러 밖으로 큰 데이터를 빼는 건 통로(invoke·웹소켓)를 바꿔도 ~30–40MB/s로 느리다 → 넘기는 데이터를 줄여야 한다
- Tauri v2는 `ArrayBuffer`를 넘기면 base64 없이 raw 바이너리로 전달, Rust는 `Request`의 raw 본문으로 받는다
- 캔버스 압축(`toBlob`)은 메인 스레드에선 병렬화가 안 되지만(idle 분할), 워커의 `convertToBlob`은 워커 수만큼 코어 병렬이다
- 큰 버퍼는 `postMessage` transfer list로 소유권을 넘겨 무복사, 완료 순서가 뒤섞이니 번호로 모아 순서대로 직렬 전송 + backpressure
- stdin 스트리밍은 raw면 무겁지만, 프레임을 압축해 작아지면 오히려 맞다(디스크에 수천 장을 안 써도 됨)
- stdin을 깔끔히 닫으려면(EOF) JS보다 Rust가 프로세스를 직접 쥐는 게 낫다 — 손잡이를 drop하면 EOF
- `write_all`은 파이프가 차면 대기하니 그 자체가 backpressure, 경로 탐지·콘솔창 억제·`async`로 메인 스레드 보호는 챙겨야 한다
- `-f mjpeg` stdin + 오디오 입력 + `-shortest`로 인코딩과 먹싱을 ffmpeg가 한 번에, 오류 경로는 기다리지 말고 kill
- 표시를 켠 뒤 무거운 동기 작업을 이으면 표시가 늦게 뜬다 → `requestAnimationFrame` 두 번으로 화면을 강제로 그린 뒤 작업
- 진행률로 남은시간을 역산하면 극초반(진행 1%)에 값이 폭발한다 → 5% 넘어서야 보여주고 그전엔 "계산 중"
- 중간 압축 화질은 무손실을 고집할 게 아니라 최종 코덱(H.264 손실)을 기준으로 정한다
- 자주 읽는 캔버스는 `willReadFrequently`로 CPU 버퍼에 둬 리드백을 아낀다
