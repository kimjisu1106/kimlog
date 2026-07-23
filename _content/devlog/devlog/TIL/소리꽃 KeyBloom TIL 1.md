---
layout: post
title: 소리꽃 KeyBloom TIL 1
date: 2026-07-03
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
tags:
  - JavaScript
  - TypeScript
  - WebAPI
---
## 캔버스에 그려지는 걸 그대로 영상 파일로 저장하기

소리꽃은 화면(캔버스)에서 돌아가는 파티클 애니메이션을 영상 파일로 뽑아야 했다. 원래는 OBS 같은 화면 녹화로 우회할 생각이었는데, 브라우저에 이미 캔버스를 영상으로 녹화하는 표준 API가 있었다. 서버도, 외부 라이브러리도 없이 두 개의 WebAPI만으로 끝났다 — `canvas.captureStream()`과 `MediaRecorder`.

---

## captureStream — 캔버스를 실시간 스트림으로

`canvas.captureStream(fps)`를 부르면 그 캔버스가 그려질 때마다 프레임이 담기는 `MediaStream`이 나온다. 캔버스가 곧 카메라가 되는 셈이다.

```js
const stream = canvas.captureStream(60); // 초당 60프레임으로 캔버스를 캡처
```

이 스트림 안에는 영상 트랙(video track)이 들어 있다. 우리가 매 프레임 `requestAnimationFrame`으로 파티클을 그리고 있으니, 그 그림이 그대로 스트림으로 흘러 들어간다.

---

## MediaRecorder — 스트림을 파일로 굳히기

스트림은 흐르기만 할 뿐 파일이 아니다. 그걸 받아 녹화하는 게 `MediaRecorder`다. 녹화 중에는 데이터가 조각(Blob)으로 넘어오고, 멈추면 조각들을 합쳐 하나의 파일로 만든다.

```js
const rec = new MediaRecorder(stream, {
  mimeType: "video/webm;codecs=vp9",
  videoBitsPerSecond: 14_000_000,
});

const chunks = [];
rec.ondataavailable = (e) => {
  if (e.data.size > 0) chunks.push(e.data);
};
rec.onstop = () => {
  const blob = new Blob(chunks, { type: rec.mimeType });
  // blob을 objectURL로 만들어 <a download>로 내려받으면 저장 끝
};

rec.start();
// ...재생이 끝나면
rec.stop();
```

포맷은 WebM(VP9/VP8)이다. MP4로 바로 뽑고 싶었지만 브라우저 `MediaRecorder`의 MP4 지원이 제각각이라, MVP는 WebM으로 두고 필요하면 편집기에서 변환하기로 했다. 어떤 코덱이 되는지는 `MediaRecorder.isTypeSupported()`로 확인해서 되는 걸 고르면 된다.

---

## 소리까지 같이 — 두 스트림을 한 트랙 세트로 합치기

영상만이 아니라 소리도 들어가야 했다. 소리꽃은 사용자가 넣은 오디오 파일을 `<audio>` 요소로 재생하는데, 미디어 요소에도 `captureStream()`이 있다. 여기서 오디오 트랙을 꺼내 캔버스의 영상 트랙과 한 `MediaStream`에 같이 담으면 된다.

```js
const out = new MediaStream();
canvas.captureStream(60).getVideoTracks().forEach((t) => out.addTrack(t));

const audioStream = audioEl.captureStream(); // <audio>의 소리
audioStream.getAudioTracks().forEach((t) => out.addTrack(t));

const rec = new MediaRecorder(out, { mimeType: "video/webm" });
```

`MediaStream`은 트랙(영상·오디오)들의 묶음일 뿐이라, 서로 다른 곳에서 온 트랙을 새 스트림에 모아 넣는 게 가능하다. 합성음(오실레이터)은 굳이 파일에 넣지 않고 오디오 파일이 있을 때만 실었다.

---

## 녹화할 땐 해상도를 고정한다

화면 캔버스는 창 크기에 맞춰 반응형으로 크기가 바뀐다. 그대로 녹화하면 결과 해상도가 창 크기에 휘둘린다. 그래서 녹화 동안만 캔버스의 백킹 스토어(`canvas.width`/`height`)를 원하는 값(예: 1920×1080)으로 고정하고, 그리는 영역도 레터박스 없이 꽉 채우게 바꿨다. 끝나면 원래 반응형으로 되돌린다.

즉 화면에 보이는 크기(`style.width`)와 실제 픽셀 수(`canvas.width`)는 별개라, 표시는 컨테이너에 맞춰 축소해 두고 내부 픽셀만 1920×1080으로 잡으면 표시가 흐트러지지 않으면서 영상은 정확히 1080p로 나온다.

---

## 배경을 투명하게 — clearRect와 알파 WebM

배경을 검정으로 채울 땐 매 프레임 `fillRect`로 까맣게 덮었다. 투명 배경(다른 영상 위에 얹을 오버레이용)이 필요하면, 그 자리를 `clearRect`로 지우기만 하면 캔버스 픽셀에 알파(투명도)가 남는다. VP8/VP9 WebM은 알파 채널을 담을 수 있어서, 이렇게 그린 걸 녹화하면 배경이 투명한 영상이 나온다. 다만 알파 WebM 재생·인코딩 지원은 브라우저마다 편차가 있어 결과 확인이 필요하다.

```js
if (transparent) ctx.clearRect(0, 0, w, h); // 투명
else { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); } // 검정
```

---

## 실시간 녹화라는 한계

`MediaRecorder`는 재생을 실시간으로 지켜보며 녹화한다. 그래서 재생 중 프레임이 버벅이면 그 버벅임이 그대로 영상에 담긴다. "한 프레임 한 프레임 완벽하게" 뽑으려면 재생 속도와 무관하게 프레임을 하나씩 렌더해 인코딩하는 방식(`ffmpeg.wasm` 등)이 필요하다. MVP에선 실시간 녹화로 충분해서 그 최적화는 다음으로 미뤘다.

---

## 요약

- `canvas.captureStream(fps)`로 캔버스를 실시간 `MediaStream`으로 만들고, `MediaRecorder`로 녹화해 WebM Blob으로 저장
- 미디어 요소(`<audio>`)에도 `captureStream()`이 있어, 오디오 트랙을 캔버스 영상 트랙과 새 `MediaStream`에 함께 담으면 소리까지 녹음
- 녹화 땐 `canvas.width/height`(내부 픽셀)를 고정 해상도로, 표시 크기(`style`)는 별개로 둬서 결과 해상도를 창 크기와 분리
- 배경은 `fillRect`(검정) vs `clearRect`(투명) — 투명이면 VP8/VP9 WebM 알파로 저장(브라우저별 편차)
- `MediaRecorder`는 실시간 녹화라 버벅임도 그대로 담긴다 — 프레임 단위 완벽함은 별도 인코딩(ffmpeg.wasm)의 몫
