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
소리꽃 첫날에 배운 것들을 다섯 갈래로 정리한다 — 캔버스 애니메이션을 영상 파일로 저장하기, 파티클을 스프라이트로 대량 렌더하기, 여러 움직임을 하나의 물리로 환원하기, 좌표를 해상도와 무관한 비율로 두기, 오실레이터로 오프라인 합성음 내기.

---

## 캔버스에 그려지는 걸 그대로 영상 파일로 저장하기

소리꽃은 화면(캔버스)에서 돌아가는 파티클 애니메이션을 영상 파일로 뽑아야 했다. 원래는 OBS 같은 화면 녹화로 우회할 생각이었는데, 브라우저에 이미 캔버스를 영상으로 녹화하는 표준 API가 있었다. 서버도, 외부 라이브러리도 없이 두 개의 WebAPI만으로 끝났다 — `canvas.captureStream()`과 `MediaRecorder`.

### captureStream — 캔버스를 실시간 스트림으로

`canvas.captureStream(fps)`를 부르면 그 캔버스가 그려질 때마다 프레임이 담기는 `MediaStream`이 나온다. 캔버스가 곧 카메라가 되는 셈이다.

```js
const stream = canvas.captureStream(60); // 초당 60프레임으로 캔버스를 캡처
```

이 스트림 안에는 영상 트랙(video track)이 들어 있다. 우리가 매 프레임 `requestAnimationFrame`으로 파티클을 그리고 있으니, 그 그림이 그대로 스트림으로 흘러 들어간다.

### MediaRecorder — 스트림을 파일로 굳히기

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

### 소리까지 같이 — 두 스트림을 한 트랙 세트로 합치기

영상만이 아니라 소리도 들어가야 했다. 소리꽃은 사용자가 넣은 오디오 파일을 `<audio>` 요소로 재생하는데, 미디어 요소에도 `captureStream()`이 있다. 여기서 오디오 트랙을 꺼내 캔버스의 영상 트랙과 한 `MediaStream`에 같이 담으면 된다.

```js
const out = new MediaStream();
canvas.captureStream(60).getVideoTracks().forEach((t) => out.addTrack(t));

const audioStream = audioEl.captureStream(); // <audio>의 소리
audioStream.getAudioTracks().forEach((t) => out.addTrack(t));

const rec = new MediaRecorder(out, { mimeType: "video/webm" });
```

`MediaStream`은 트랙(영상·오디오)들의 묶음일 뿐이라, 서로 다른 곳에서 온 트랙을 새 스트림에 모아 넣는 게 가능하다. 합성음(오실레이터)은 굳이 파일에 넣지 않고 오디오 파일이 있을 때만 실었다.

### 녹화할 땐 해상도를 고정한다

화면 캔버스는 창 크기에 맞춰 반응형으로 크기가 바뀐다. 그대로 녹화하면 결과 해상도가 창 크기에 휘둘린다. 그래서 녹화 동안만 캔버스의 백킹 스토어(`canvas.width`/`height`)를 원하는 값(예: 1920×1080)으로 고정하고, 그리는 영역도 레터박스 없이 꽉 채우게 바꿨다. 끝나면 원래 반응형으로 되돌린다.

즉 화면에 보이는 크기(`style.width`)와 실제 픽셀 수(`canvas.width`)는 별개라, 표시는 컨테이너에 맞춰 축소해 두고 내부 픽셀만 1920×1080으로 잡으면 표시가 흐트러지지 않으면서 영상은 정확히 1080p로 나온다.

### 배경을 투명하게 — clearRect와 알파 WebM

배경을 검정으로 채울 땐 매 프레임 `fillRect`로 까맣게 덮었다. 투명 배경(다른 영상 위에 얹을 오버레이용)이 필요하면, 그 자리를 `clearRect`로 지우기만 하면 캔버스 픽셀에 알파(투명도)가 남는다. VP8/VP9 WebM은 알파 채널을 담을 수 있어서, 이렇게 그린 걸 녹화하면 배경이 투명한 영상이 나온다. 다만 알파 WebM 재생·인코딩 지원은 브라우저마다 편차가 있어 결과 확인이 필요하다.

```js
if (transparent) ctx.clearRect(0, 0, w, h); // 투명
else { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h); } // 검정
```

### 실시간 녹화라는 한계

`MediaRecorder`는 재생을 실시간으로 지켜보며 녹화한다. 그래서 재생 중 프레임이 버벅이면 그 버벅임이 그대로 영상에 담긴다. "한 프레임 한 프레임 완벽하게" 뽑으려면 재생 속도와 무관하게 프레임을 하나씩 렌더해 인코딩하는 방식(`ffmpeg.wasm` 등)이 필요하다. MVP에선 실시간 녹화로 충분해서 그 최적화는 다음으로 미뤘다.

---

## 파티클마다 fillText 하지 말고, 미리 그려둔 그림을 복사해 찍기

소리꽃은 노트마다 파티클을 뿌리는데, 개수를 최대로 올리니 밀집 구간에서 버벅였다. 파티클이 수천 개가 되는데 각각을 유니코드 글리프(●■♥★)로 화면에 `fillText`(글자 그리기)로 그리고 있었다. 원인은 그리는 방식에 있었다.

### fillText가 비싼 이유

`fillText`로 글자를 하나 그릴 때 브라우저가 하는 일이 생각보다 많다.

- `ctx.font = "32px ..."`를 매번 설정하면 그 폰트 문자열을 파싱한다.
- 글자를 그릴 때 폰트의 외곽선(벡터)을 그 크기에 맞춰 래스터화(픽셀로 계산)한다.

한두 번이면 티가 안 나지만, 파티클마다 크기·색이 달라 매 프레임 수천 번을 반복하면 이게 프레임을 갉아먹는다. 즉 "매번 글자를 새로 조판해서 찍는" 셈이었다.

### 스프라이트 아틀라스 — 한 번 굽고 계속 복사

해법은 단순하다. 글리프를 오프스크린 캔버스(화면에 안 붙인 임시 캔버스)에 미리 한 번 그려두고(스프라이트), 파티클은 그 그림을 `drawImage`로 복사만 한다. `drawImage`는 이미 픽셀이 된 비트맵을 그대로 옮겨 붙이는 거라 `fillText`보다 훨씬 싸다.

```js
function makeSprite(shape, color, font) {
  const c = document.createElement("canvas");
  c.width = c.height = 144;
  const g = c.getContext("2d");
  g.fillStyle = color;
  g.font = `96px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(shape, 72, 72); // 여기서 딱 한 번만 fillText
  return c;
}
```

그린 다음엔 파티클마다 이렇게만 한다.

```js
ctx.drawImage(sprite, px - box / 2, py - box / 2, box, box);
```

### 색은 미리 24단계로 틴트해서 굽는다

문제가 하나 있다. 파티클 색이 min~max 그라데이션 위에서 제각각이다(세게 친 노트일수록 max 색 쪽으로 치우쳐 랜덤으로 뽑힘). 색이 다 다르면 스프라이트를 미리 구울 수가 없다.

그래서 색을 24단계로 양자화했다. 그라데이션을 24개 색으로 미리 나눠 각각 스프라이트를 굽고, 파티클은 자기 색 위치(`colorT`, 0~1)로 가장 가까운 스프라이트를 고른다. 눈으로는 24단계면 충분히 부드럽다.

```js
// 파티클은 색 값 대신 colorT(0~1)만 들고, 렌더 때 인덱스로 스프라이트 선택
const idx = Math.round(p.colorT * 23);
ctx.drawImage(sprites[idx], ...);
```

모양을 여러 개 켜면 모양 × 색 2차원 아틀라스가 된다(모든 모양 × 24색). 파티클은 어떤 모양인지 `shapeIndex`만 들면 되고, 이 인덱스를 전체 모양 목록 기준으로 잡아서 선택을 바꿔도 이미 떠 있는 파티클이 안 깨진다.

### 광택도 스프라이트에서 처리 — source-atop과 lighter

광택(유리·보석 느낌)도 렌더 합성으로 흉내 냈다. 두 가지 캔버스 합성 모드를 썼다.

- 스프라이트를 구울 때, 글리프 위에 좌상단 밝은 점(스페큘러 하이라이트)을 얹는다. 이때 `globalCompositeOperation = "source-atop"`을 쓰면 새로 그리는 게 기존 픽셀이 있는 자리에만 남아서, 하이라이트가 글리프 모양 밖으로 안 삐져나온다.
- 광택을 많이 올리면 렌더 때 한 번 더 그린다. `globalCompositeOperation = "lighter"`(가산 합성)로 색 헤일로를 겹치면, 파티클이 겹칠수록 밝아지는 발광 효과가 난다.

즉 "무광"일 땐 그냥 스프라이트만, "유광"일 땐 그 위에 가산 글로우를 한 겹 더 얹는 2패스다. 낮은 광택은 1패스라 비용이 안 든다.

### 배열도 아낀다 — 제자리 압축과 총량 상한

렌더 말고도 자잘한 게 있었다. 매 프레임 죽은 파티클을 `filter`로 걸러 새 배열을 만들면, 그 새 배열이 계속 쌓여 가비지 컬렉션 부담이 된다. 그래서 살아있는 파티클을 배열 앞쪽으로 당기고 길이만 잘라내는 제자리 압축으로 바꿨다. 또 폭발적인 밀집에서 무한정 늘지 않게 총 파티클 수 상한을 뒀다.

```js
let w = 0;
for (let i = 0; i < arr.length; i++) {
  const p = arr[i];
  // ...물리 갱신...
  if (p.life > 0) arr[w++] = p; // 살아있으면 앞으로 당김
}
arr.length = w; // 새 배열 안 만들고 길이만 자름
```

---

## 여러 움직임을 각각 짜지 말고, 물리값으로 환원해 하나의 로직으로

소리꽃 파티클엔 움직임 종류가 여럿이다 — 피어오름, 방사형 개화, 상승 후 흐트러짐, 나선형(토네이도), 분수, 불꽃. 처음엔 모션마다 update 로직을 따로 짤 뻔했는데, 그러면 모션이 늘 때마다 코드가 갈라지고 엉킨다. 대신 모든 모션을 같은 물리로 돌리고, 모션은 그 물리에 넣을 값만 다르게 주는 구조로 갔다.

### 모션 = spawn 시점의 물리값 묶음

파티클 하나가 가진 건 위치·속도(vx, vy)·중력·감쇠(drag)·좌우 흔들림(진폭/주파수/위상)·수명, 이게 전부다. 모션이란 건 파티클을 만들 때 이 값들을 어떻게 세팅하느냐의 차이일 뿐이다.

update는 모션이 뭔지 전혀 모른다. 그냥 이 값들로 물리를 한 스텝 적분한다.

```js
update(dt) {
  for (const p of particles) {
    p.age += dt;
    p.vy += p.gravity * dt;              // 중력(음수면 부력)
    const damp = 1 - p.drag * dt;         // 감쇠
    p.vx *= damp; p.vy *= damp;
    const sway = p.swayAmp * Math.sin(p.swayFreq * p.age + p.swayPhase);
    p.x += (p.vx + sway) * dt;
    p.y += p.vy * dt;
    p.life -= dt / p.lifeSec;
  }
}
```

그리고 모션별 값은 한곳에서 분기해 돌려준다.

```js
function motionPhysics(mode, speed) {
  switch (mode) {
    case "fountain": return { vy: -speed, gravity: 0.9, drag: 0, /* ... */ };   // 위로 쏘고 낙하
    case "float":    return { vy: -speed*0.1, gravity: -0.015, drag: 0.5, /* ... */ }; // 부력+감쇠로 부유
    // ...
  }
}
```

새 모션을 추가하는 건 이 switch에 케이스 하나 더 넣는 일이 됐다. update는 손 안 댄다.

### 토네이도 = 흔들림 진폭이 자라게

나선형(토네이도)은 좌우 흔들림 자체는 다른 모션에도 있는 sin 흔들림인데, 위로 갈수록 폭이 넓어져야 소용돌이처럼 보인다. 그래서 흔들림 진폭이 시간에 따라 커지는 값(swayGrow) 하나만 추가했다.

```js
const amp = p.swayAmp * (1 + p.swayGrow * p.age); // 나이가 들수록 진폭 증가
const sway = amp * Math.sin(p.swayFreq * p.age + p.swayPhase);
```

다른 모션은 swayGrow가 0이라 영향이 없다. 흔들림을 속도로 두고 위치에 적분하면 실제 좌우 폭은 대략 진폭/주파수라, 회전 속도(주파수)와 퍼지는 정도(진폭)를 따로 조절할 수 있다. 처음에 회전이 너무 빨라서 주파수를 낮췄더니 위로 가는 양까지 줄어 보였는데, 상승 속도(vy)는 별개라 그것만 올려 분리했다.

### 불꽃 = 파티클이 파티클을 낳는 2단계

대부분 모션은 노트 하나에 파티클을 한 번에 뿌린다. 불꽃만 예외다. 진짜 폭죽처럼 포탄이 솟았다가 정점에서 터져야 한다.

- 노트마다 포탄(shell) 파티클 하나를 위로 쏜다. 포탄은 "이 나이가 되면 터진다"는 시각(explodeIn)을 가진다.
- update에서 포탄이 그 나이에 도달하면 제거하면서, 그 자리에서 방사형으로 불똥(spark) 여러 개를 새로 만든다.

여기서 주의할 게, update 루프를 도는 중에 배열에 파티클을 추가하면 반복이 꼬인다. 그래서 터질 포탄을 루프 안에서 모아뒀다가, 루프가 끝난 뒤에 불똥을 방출했다.

```js
const explosions = [];
for (...) {
  // ...물리...
  if (p.explodeIn > 0 && p.age >= p.explodeIn) { explosions.push(p); continue; }
}
for (const shell of explosions) spawnSparks(shell); // 루프 밖에서 추가
```

정점에서 터지게 하려면 폭발 시각을 물리로 잡으면 된다. 위로 쏜 속도가 중력에 의해 0이 되는 때가 정점이니, 폭발 시각 = 발사속도 / 중력.

---

## 위치를 픽셀로 저장하지 말고 화면 비례(비율)로 두기

소리꽃은 지금 16:9 고정이지만, 나중에 1:1 같은 다른 비율이나 다른 해상도로 확장해도 이펙트가 찌그러지거나 잘리지 않아야 했다. 그러려면 건반 위치, 파티클 위치, 솟는 높이를 절대 픽셀로 저장하면 안 됐다. 해상도가 바뀌는 순간 다 어긋나기 때문이다.

### 좌표를 0~1 비율로

모든 위치·크기를 화면(뷰)의 몇 % 인지, 즉 0~1 사이 비율(fraction)로 정의했다. 실제 픽셀은 그릴 때만 뷰 크기를 곱해서 낸다.

- 건반: "가로를 52등분한 몇 번째" 같은 비율로 배치
- 파티클: 시작 위치는 건반 중심의 x 비율, 솟는 높이는 "화면 세로의 몇 %"
- 픽셀 = 비율 × 뷰 크기 (렌더 단계에서만 곱함)

```js
const px = view.x + p.x * view.w; // p.x, p.y는 0~1 비율
const py = view.y + p.y * view.h;
```

이렇게 하면 데이터(비율)는 그대로 두고 뷰 크기만 바꿔 다시 곱하면 어떤 해상도·비율에서도 같은 그림이 나온다. 예전에 여둘까에서 가구를 mm로 저장하고 픽셀은 그릴 때만 환산했던 것과 같은 결이다 — 저장은 해상도와 무관한 단위로, 픽셀은 마지막에.

### 16:9 레터박스 뷰

컨테이너(캔버스가 놓인 영역)가 16:9가 아닐 수 있으니, 그 안에 16:9 박스를 가운데 맞춰 넣고 그 박스를 뷰로 삼았다. 남는 위아래(또는 좌우)는 레터박스로 비운다.

```js
let w = cw, h = cw / (16 / 9);
if (h > ch) { h = ch; w = ch * (16 / 9); } // 컨테이너에 16:9를 맞춰 넣기
view = { x: (cw - w) / 2, y: (ch - h) / 2, w, h }; // 가운데 정렬
```

파티클도 건반도 전부 이 뷰 기준이라, 창을 아무리 늘려도 이펙트 비율이 유지된다.

### 캔버스 DPR — 안 하면 흐릿하다

캔버스에는 두 가지 크기가 있다. 화면에 보이는 크기(CSS 픽셀)와 실제로 그려지는 픽셀 수(백킹 스토어). 고해상도 화면(레티나 등)은 `devicePixelRatio`가 1보다 커서, CSS 1픽셀이 실제 여러 물리 픽셀이다. 이걸 무시하면 그림이 뿌옇게 나온다.

그래서 백킹 스토어는 dpr배로 키우고, 표시 크기는 그대로 두고, 그리기 좌표계는 CSS 픽셀로 쓰도록 변환(transform)을 건다.

```js
const dpr = window.devicePixelRatio || 1;
canvas.width  = cw * dpr;          // 실제 픽셀 수 (더 촘촘)
canvas.height = ch * dpr;
canvas.style.width  = cw + "px";   // 화면 표시 크기
canvas.style.height = ch + "px";
ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 그리기 좌표는 CSS px로 쓰되 실제론 dpr배로 찍힘
```

이렇게 하면 코드에선 편하게 CSS 픽셀 좌표로 그리는데, 결과는 화면 밀도만큼 선명하다.

### 녹화할 땐 DPR 대신 고정 해상도로

한 가지 예외가 영상 저장이다. 녹화 땐 창 크기·화면 밀도에 결과가 휘둘리면 안 되니, 백킹 스토어를 원하는 해상도(예: 1920×1080)로 고정하고 변환도 1:1로 되돌린다. 표시 크기만 컨테이너에 맞춰 축소해 두면, 화면은 그대로 보이면서 영상은 정확히 그 해상도로 나온다. 끝나면 다시 반응형(위의 dpr 방식)으로 복구한다.

---

## 오디오 파일 없이 오실레이터로 음 내기

소리꽃은 사용자가 오디오 파일을 안 넣어도 타이밍 확인용으로 소리가 나면 좋겠다 싶었다. 그런데 진짜 피아노 음색(샘플러)은 음원 파일을 어딘가에서 불러와야 하고, 소리꽃은 서버 없이 오프라인으로 완결하는 게 원칙이라 외부 호출을 안 하고 싶었다. 그래서 브라우저 내장 Web Audio의 오실레이터로 간단한 합성음을 냈다. 샘플 파일 없이도 소리가 난다.

### AudioContext — 소리의 시작점

Web Audio는 `AudioContext`라는 오디오 그래프 위에서 돈다. 노드들을 연결해 소리를 만든다. 브라우저 정책상 사용자 제스처(클릭 등) 뒤에 `resume()`을 불러야 소리가 난다.

```js
const ctx = new AudioContext();
// 재생 버튼 눌렀을 때
ctx.resume();
```

### MIDI 노트를 주파수로

건반의 음 높이는 MIDI 노트 번호로 온다. 이걸 소리의 주파수(Hz)로 바꿔야 한다. 기준은 A4(라, MIDI 69번)가 440Hz이고, 반음 올라갈 때마다 2의 12제곱근 배가 된다.

```js
const freq = 440 * Math.pow(2, (midi - 69) / 12);
```

### note-on마다 오실레이터 + 게인 엔벨로프

노트가 켜질 때마다 오실레이터(파형 발생기) 하나를 만들어 그 주파수로 잠깐 울리고 끈다. 그냥 켰다 끄면 "딱" 하는 클릭 잡음이 나서, 게인(볼륨)으로 빠르게 커졌다 사라지는 엔벨로프를 씌운다.

```js
function triggerNote(midi, velocity, duration) {
  const now = ctx.currentTime;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;

  const peak = 0.02 + velocity * 0.18; // 세게 칠수록 큰 소리
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.01);       // 빠른 어택
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration); // 서서히 감쇠

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}
```

한 가지 함정 — `exponentialRampToValueAtTime`은 목표값이 0이면 안 된다(지수는 0에 못 닿음). 그래서 0 대신 아주 작은 값(0.0001)으로 오르내린다. 이 미세한 값 덕분에 클릭 잡음 없이 부드럽게 시작하고 끝난다.

velocity(세기)로 최대 볼륨을, duration(음 길이)으로 울리는 시간을 정한다. `osc.stop`으로 자동으로 꺼지니 정리도 필요 없다.

### 오디오 파일이 있으면 합성음은 끈다

합성음은 어디까지나 타이밍 확인용이다. 사용자가 자기 연주 오디오 파일을 넣으면 그걸 재생하고 합성음은 발동하지 않게 했다. 그래서 최종 영상엔 사용자 오디오만 실린다.

- 오디오 파일 있음 → 파일 재생, 합성음 off
- 없음 → note-on마다 오실레이터 합성음

진짜 피아노 음색이 필요하면 나중에 로컬 샘플을 번들에 넣는 식으로 확장하면 되고, 그래도 외부 호출은 안 생긴다.

---

## 요약

- 캔버스 애니메이션은 `canvas.captureStream(fps)` → `MediaRecorder`로 WebM 저장. `<audio>`의 오디오 트랙을 같은 `MediaStream`에 담아 소리까지. 녹화 땐 백킹 스토어를 고정 해상도로.
- `fillText`는 대량 반복에 비싸다 → 글리프를 오프스크린에 굽고 `drawImage`로 복사. 연속 색은 24단계 양자화 아틀라스, 광택은 `source-atop`+`lighter` 합성.
- 여러 모션을 각각 짜지 말고 같은 물리(속도·중력·감쇠·흔들림·수명)로 돌리고 spawn 값만 다르게. 새 모션 = switch 케이스 하나. 토네이도는 진폭 성장, 불꽃은 정점(발사속도/중력)에서 2단계.
- 위치·크기는 픽셀이 아니라 0~1 비율로 저장하고 렌더 때만 뷰 크기를 곱한다. 선명함은 `devicePixelRatio`, 녹화는 예외로 고정 해상도.
- 오디오 파일이 없으면 Web Audio 오실레이터로 오프라인 합성음(`440 * 2^((midi-69)/12)`, 게인 엔벨로프 목표값은 0이 아닌 0.0001). 파일이 있으면 합성음은 끈다.
