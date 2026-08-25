---
layout: post
title: 소리꽃 KeyBloom TIL 31
date: 2026-08-04
categories:
  - today-i-learn
project: today-i-learn
project_name: Today I Learn
video_id:
app_url:
status:
description: 공연 출력을 파고든 날 — 파티클을 시드 난수로 결정적으로 만들고 두 번째 창에 같은 화면 띄우기, 캔버스 이미지 합성·배경 배치, 포커스·저장 잔손질, 그리고 ASIO 저지연·투명 영상·플랫폼 이야기.
tags:
  - TypeScript
  - Rust
---
08-04에 배운 것들을 다섯 갈래로 묶는다 — 파티클을 결정적으로 만들기, 두 번째 창에 같은 화면 띄우기, 캔버스에서 이미지 다루기, 손에 걸리던 것들(포커스·저장) 고치기, 그리고 저지연·투명 영상·플랫폼 파고들기.

---

두 화면에 똑같은 파티클을 띄우려면 파티클이 "결정적"이어야 한다. 즉 같은 연주 → 언제나 같은 파티클. 그런데 파티클은 곳곳에서 `Math.random()`을 쓴다.

---

## 무작위를 시드 난수로 바꾸면 재현된다

`Math.random()`은 매번 다른 값이라 두 번 그리면 결과가 다르다. 대신 시드로 초기화되는 난수(PRNG) 를 쓰면 같은 시드는 같은 수열을 뱉는다.

```ts
// mulberry32 — 같은 seed → 같은 난수 수열
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

파티클 시스템이 `rng`를 하나 들고, spawn(파티클이 새로 생겨나는 순간)마다 그 노트의 시드로 다시 심는다. spawn 안의 모든 무작위(위치·크기·색·움직임)를 이 `rng()`로 바꿨다.

```ts
spawn(..., seed?: number): void {
  this.rng = seed === undefined ? Math.random : mulberry32(seed);
  // 이하 Math.random() 자리를 전부 this.rng()로
}
```

seed를 안 넘기면 예전처럼 `Math.random` → 현행 그대로. 안전장치.

---

## 나중에 터지는 것은 파티클 자신의 시드로 재현한다

불꽃은 포탄이 날아가다 나중에 터져 불똥을 뿌린다. 이 폭발이 update 루프 중간에 일어나서, 그 시점의 공용 난수 상태에 의존하면 두 창이 어긋난다. 프레임 처리 순서가 미세하게 달라질 수 있어서다.

그래서 파티클마다 자기 시드를 들고, 터질 때 그 시드로 로컬 난수를 새로 만든다.

```ts
// 파티클이 seed 필드를 가지고
seed: (this.rng() * 0x100000000) >>> 0,
// 폭발 시 그 시드로 로컬 rng → 프레임 순서와 무관하게 결정적
private explode(s: Particle): void {
  const er = mulberry32(s.seed);
  const a = er() * Math.PI * 2;
  // 불똥의 모든 무작위를 er()로
}
```

이러면 언제 터지든, 몇 번째 프레임에서 처리되든, 그 포탄의 불똥은 항상 똑같이 퍼진다.

---

## 덤 — 저장 프로젝트가 재현된다

결정적으로 만드니 두 창이 일치하는 것뿐 아니라, 저장한 프로젝트를 다시 열어도 파티클이 똑같이 뜬다. 예전엔 열 때마다 미세하게 달랐다.

> 두 화면을 나란히 놓고 봐도 구별 안 될 정도면 충분하다. 관객은 출력 하나만 보니까. 남은 차이는 두 창의 화면 갱신 위상차(수 ms)뿐이라 눈에 안 보인다.

---

공연 때 관객 화면(두 번째 모니터)에 파티클만 띄우고 싶었다. 두 창에 같은 그림을 어떻게 맞추느냐가 관건이었다.

## 화면(프레임)을 복사하지 말고 입력을 공유한다

먼저 떠오르는 건 한 창의 화면을 다른 창으로 복사하는 것. 그런데 4K 프레임은 초당 수십 MB라 창 사이로 넘기기엔 너무 무겁다.

그래서 화면 대신 연주(노트)만 넘긴다. 노트 on/off + 시드 + 큐 설정만 보내면 초당 몇 바이트다. 받은 창이 그걸로 자기가 직접 그린다. 파티클이 결정적이라(위 시드 난수) 같은 노트 → 같은 그림.

```text
메인 창  ──(노트 on/off + 시드)──▶  출력 창(독립 렌더)
          프레임 아님, 초당 몇 바이트
```

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

## 왜 이게 복잡했나 — Tauri는 WebView + Rust다

"네이티브 앱인데 왜 브라우저 얘기가 나오지?" 싶었는데, Tauri 앱은 화면(프론트)이 OS의 WebView(앱 속에 넣은 브라우저 화면) 안에서 돈다. 우리 파티클·캔버스는 전부 그 WebView에서 렌더된다. 진짜 네이티브(파일·오디오)는 Rust 쪽이다. 그래서 창 사이 통신도 브라우저가 아니라 Tauri(네이티브)의 이벤트를 쓴다.

---

사용자 이미지를 파티클 모양·배경으로 쓰면서 캔버스 합성과 배치를 정리했다.

## 실루엣에만 색을 입히려면 source-atop

커스텀 파티클 모양은 "이미지 모양은 쓰되 색은 기존 색 모드(무지개·팔레트 등) 그대로"여야 한다. 이미지를 그린 뒤 그 알파(모양)를 마스크(모양대로 오려내는 틀) 삼아 색을 덮으면 된다. 이때 합성 모드가 `source-atop`.

```ts
g.drawImage(img, ...);                    // 이미지(모양) 먼저
g.globalCompositeOperation = "source-atop"; // 이미 그려진 픽셀 위에만
g.fillStyle = color;
g.fillRect(0, 0, dim, dim);               // 그 모양대로만 색이 채워짐
```

`source-atop`은 "새로 칠하는 것을 이미 있는 픽셀이 있는 자리에만" 남긴다. 그래서 이미지가 있는 곳만 색으로 덮이고 나머지는 투명하게 유지된다.

## 불투명 이미지가 네모로 뜨는 이유

이걸로 테스트하다 이미지가 아니라 색칠된 네모가 떴다. 이유는 단순하다 — `source-atop`은 "픽셀이 있는 자리"에 색을 넣는데, 배경이 불투명한 이미지는 사각형 전체가 픽셀이라 네모 전체가 색으로 덮인다.

```text
투명 배경 PNG  → 그 모양대로 색 (원하는 실루엣)
불투명 이미지    → 사각형 전체가 실루엣 → 색칠된 네모
```

- 배운 점: 실루엣 방식은 투명 배경 PNG를 전제한다. 불투명 이미지엔 실루엣이 없어서 못 쓴다.

## 배경 배치 — 원본·맞춤·채움·타일

배경 이미지는 사람마다 원하는 배치가 다르다. 네 가지를 스케일 계산으로 나눴다. 렌더 높이(`h`)에 비례해 계산하면 미리보기·내보내기 어느 해상도든 프레임 대비 같은 결과가 된다.

```ts
// 원본 = 기준 해상도(1080p) 대비 원본 크기 / 맞춤 = 전체 보이게(contain) / 채움 = 프레임 채움(cover)
const scale =
  fit === "fit"   ? Math.min(w / iw, h / ih)  // contain
  : fit === "cover" ? Math.max(w / iw, h / ih)  // cover
  : h / 1080;                                    // original
ctx.drawImage(img, (w - iw*scale)/2, (h - ih*scale)/2, iw*scale, ih*scale);
```

타일(반복)은 `createPattern`으로.

```ts
const scale = h / 1080;
const pat = ctx.createPattern(img, "repeat");
ctx.save();
ctx.scale(scale, scale);      // 패턴을 원본(1080p 기준) 크기로
ctx.fillStyle = pat;
ctx.fillRect(0, 0, w / scale, h / scale);
ctx.restore();
```

---

기능 사이사이 거슬리던 것들을 정리하며 알게 된 것들.

## 편집 후 단축키가 막히는 건 포커스가 남아서다

슬라이더·체크박스를 만진 뒤 숫자키(큐 전환)·스페이스(재생)가 바로 안 먹혔다. 원인은 단축키 핸들러가 입력칸에 포커스가 있으면 무시하도록 돼 있어서(타이핑 중 단축키 가로채기 방지). 컨트롤을 만지면 포커스가 거기 남아 계속 막힌다.

그래서 파라미터 편집이 끝나는 지점(change 커밋)에서 그 컨트롤의 포커스를 뗀다.

```ts
bodyWrap.addEventListener("change", (e) => {
  const el = e.target as HTMLElement;
  if (el.matches('input[type="range"], input[type="checkbox"], select')) {
    commit();
    el.blur(); // 포커스 해제 → 이후 keydown의 e.target이 body → 단축키 즉시 동작
  }
});
```

재생(seek) 바는 별도 위치라 거기에도 따로 `change → blur`를 걸었다.

## 네이티브에서 저장 대화상자가 자꾸 뜨는 이유

저장 위치를 정해뒀는데도 영상 저장을 누르면 매번 대화상자가 떴다. 오프라인 렌더가 브라우저의 저장 픽커(`showSaveFilePicker`)를 직접 호출하는데, 이건 브라우저가 파일을 직접 읽고 쓰게 해주는 FSA(File System Access) 기능이다. 네이티브 WebView(WebView2, Windows 내장 브라우저 엔진)도 이걸 지원해서 대화상자를 띄운 것.

네이티브에선 이 픽커를 끄고, 결과를 버퍼로 받아 지정 폴더(없으면 다운로드 폴더)에 바로 쓰게 했다.

```ts
// 네이티브면 FSA 픽커 대신 버퍼 → 지정 폴더로 직접 저장(대화상자 없음)
if (!IS_NATIVE && typeof win.showSaveFilePicker === "function") { /* 웹: 픽커 */ }
else { /* 버퍼로 받아 saveOutput이 폴더에 씀 */ }
```

기본 폴더는 Tauri의 `downloadDir()`로 다운로드 폴더를 잡아 대화상자 없이.

> 주의로 남긴 것 — 버퍼는 메모리에 통째라 4K 장척은 나중에 Rust 스트리밍 쓰기로 개선해야 한다.

## 오버레이는 스타일을 재사용한다

느린 내보내기(앞으로 붙일 알파 인코딩 등)에서 진행을 크게 보여주려고 화면 중앙 진행바를 만들었다. 이미 있던 시작 로딩 오버레이의 `.loading-*` 스타일을 그대로 재사용하고, 반투명 배경만 얹었다.

- 배운 점: 같은 모양의 오버레이는 CSS를 새로 짜지 말고 기존 클래스를 재사용 — 진행바·박스·퍼센트가 이미 다 있음.

---

저지연 오디오와 투명 영상(알파)을 파다가, 이게 왜 이렇게 플랫폼에 얽히는지 알게 됐다.

## ASIO 저지연 — 버퍼가 레버다

네이티브 오디오는 하드웨어 ASIO 드라이버가 있으면 자동으로 그걸 우선 쓴다. 없으면 Windows 기본 소리 통로인 WASAPI로 폴백(안 되면 대신 쓰는 대안)한다. ASIO는 윈도우 오디오 믹서를 건너뛰고 사운드카드에 직결이라 지연이 확 낮다.

실측 — 기본 버퍼에서 12ms, 드라이버 제어판에서 버퍼를 256샘플로 낮추니 6ms. 웹(58ms)의 1/10 수준.

여기서 버퍼는 "미리 준비해둔 소리 조각의 대기열"이다. 짧을수록 빨리 나오지만, CPU가 제때 못 채우면 소리가 끊긴다. 그래서 버퍼는 앱이 아니라 드라이버 제어판이 관장한다. 우리가 쓰는 cpal(Rust에서 스피커로 소리를 내보내는 크레이트·부품 꾸러미)로는 인앱 강제가 안 된다.

- 배운 점: 6ms면 충분하다. 사람은 10ms 안쪽이면 지연을 거의 못 느끼고, 더 낮추면 끊김(드롭아웃) 위험만 커진다. 여기서 더 안 내려도 된다.

## 투명 영상(알파)이 까다로운 진짜 이유

투명 배경 영상을 편집툴(Vegas 등)에 얹어 합성하려면 알파를 담는 영상이 필요한데, 두 벽이 있다.

첫째, 브라우저엔 그런 인코더가 없다. 우리 앱은 화면을 WebView(브라우저 엔진)에서 그리는데, WebCodecs(브라우저에서 영상·소리를 인코딩하는 API)는 H.264(MP4)는 만들어도 편집툴이 읽는 알파 코덱(ProRes 등)은 못 만든다. 그래서 외부 도구(ffmpeg) 를 데려와야 한다.

둘째, 코덱마다 라이선스가 다르다.

- ProRes 4444 — 편집툴이 바로 읽는 사실상 표준. 근데 Apple 코덱이라 상용 인코딩엔 라이선스가 걸림. ffmpeg의 ProRes는 비인가라, 유료 제품엔 리스크
- Ut Video — 무료 오픈소스, 알파 지원, Vegas 확인. 대신 관객이 코덱을 한 번 설치해야
- 편집툴이 네이티브로 읽는 알파는 사실상 ProRes뿐이라, 깨끗한 대안은 다 사용자 마찰이 있다

그래서 방향을 "Windows는 Ut Video·이미지 시퀀스(무료), Mac은 ProRes(정식)"로 갈랐다.

## Mac에선 사정이 다르다

ProRes 라이선스 회색지대는 윈도우 한정이다. Mac은 ProRes가 OS에 정식 내장(AVFoundation, macOS·iOS의 미디어 처리 프레임워크)이라 유료 제품이어도 떳떳하게 쓴다. 그래서 Mac 네이티브 앱을 내면 그쪽 알파는 걱정이 없다.

Mac 앱을 만들려면 개발은 Windows에서 그대로 하되 빌드·서명·노터라이즈(애플이 앱을 검사·인증하는 절차)는 macOS에서 해야 한다. Mac이나 CI(코드 올릴 때 자동 빌드·테스트 돌리는 서버)가 필요하다. 소스는 크로스플랫폼이라 코드 자체는 공유된다.

---

## 요약

- `Math.random()` 대신 시드 난수(mulberry32)를 spawn마다 심으면 같은 입력이 같은 그림이 된다. 나중에 터지는 불꽃은 파티클 자신의 seed로 로컬 난수를 만들어 프레임 순서와 무관하게 재현. 결정적 렌더는 두 창 일치 + 프로젝트 재현이라는 덤.
- 두 화면은 프레임(무거움) 말고 입력(가벼움)을 공유하고 각자 렌더한다. Tauri 두 번째 창은 Vite 멀티페이지 + `WebviewWindow` + capabilities 권한 세트, 창 사이는 `emit`/`listen`, 풀스크린은 `setFullscreen`. Tauri = WebView(프론트) + Rust(네이티브).
- 이미지 모양에만 색을 입히려면 `drawImage` 후 `source-atop` + `fillRect`(투명 배경 PNG 전제, 불투명은 네모가 됨). 배경 배치는 `min`(contain)·`max`(cover)·`createPattern`(tile), 렌더 높이 비례로 해상도 무관.
- 편집 후 단축키가 막히면 커밋 지점에서 `blur()`(포커스가 input에 남는 게 원인). 네이티브 저장 대화상자는 `showSaveFilePicker`를 끄고 버퍼→지정 폴더(`downloadDir`)로 우회. 같은 꼴 오버레이는 기존 스타일 재사용.
- ASIO는 믹서를 건너뛰어 저지연(6ms), 버퍼는 드라이버 제어판이 레버(6ms면 충분). 알파 영상은 브라우저에 인코더가 없어 외부 ffmpeg 필요 + 코덱마다 라이선스(ProRes=Apple 회색지대, Ut Video=무료·설치). ProRes 문제는 윈도우 한정 — Mac은 OS 정식이라 빌드만 macOS에서.
